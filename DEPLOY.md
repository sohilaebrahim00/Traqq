# TRAQQ — VPS Deployment Guide

## Architecture

```
Internet (port 80 / 443)
         │
       Nginx
       /   \
      /     \
 Static     Proxy /api/* → Node.js :3000  (PM2)
 files                          │
 frontend/                 PostgreSQL :5432
```

Nginx serves `frontend/` as static files and reverse-proxies every `/api/*` request
to the Express backend running under PM2 on port 3000.

---

## Prerequisites — install once on the VPS

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 1 — PostgreSQL setup

```bash
sudo -u postgres psql -f /var/www/traqq/scripts/setup-postgresql.sql
```

`scripts/setup-postgresql.sql` creates database `traqq_db` and user `traqq_user`.

Verify:

```bash
sudo -u postgres psql -c "\l traqq_db"
sudo -u postgres psql -c "\du traqq_user"
```

---

## Step 2 — Upload the project

```bash
# Option A — git clone
cd /var/www
git clone https://github.com/YOUR_ORG/traqq.git traqq

# Option B — rsync from local machine
rsync -avz \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='*.db' \
  ./ root@YOUR_VPS_IP:/var/www/traqq/
```

> **Never upload `.env` files.** Secrets are bootstrapped in Step 3.

---

## Step 3 — Create the production `.env`

```bash
bash /var/www/traqq/scripts/setup-vps-env.sh
```

This writes `/var/www/traqq/backend/.env` with all secrets filled in.

**Delete the bootstrap script immediately after running — it contains secrets:**

```bash
rm /var/www/traqq/scripts/setup-vps-env.sh
```

Verify the file exists and has restricted permissions:

```bash
ls -la /var/www/traqq/backend/.env
# Expected: -rw------- 1 root root ...
```

---

## Step 4 — Install, migrate, seed

```bash
cd /var/www/traqq/backend

# Create log directory used by ecosystem.config.js
sudo mkdir -p /var/log/traqq
sudo chown $USER:$USER /var/log/traqq

# Install production dependencies only
npm install --omit=dev

# Generate Prisma client from schema.prisma
npm run build

# Apply all PostgreSQL migrations
npx prisma migrate deploy

# Create the admin user and seed promo codes (reads from .env)
npm run seed:admin
```

Expected migration output:
```
Applying migration `20260608000000_init`
Applying migration `20260610000000_add_promo_address`
All migrations have been successfully applied.
```

Expected seed output:
```
TRAQQ Admin Seed
Admin user created:
  Email:    admin@traqq.com
  Role:     ADMIN
Promo code created: INFLUENCER15 (15% off first ride)
Seed complete.
```

---

## Step 5 — Start with PM2

```bash
cd /var/www/traqq/backend

pm2 start ecosystem.config.js --env production
pm2 save

# Enable PM2 auto-start on reboot — run the command PM2 prints
pm2 startup
```

Verify the backend is running:

```bash
pm2 status
curl http://localhost:3000/health
# Expected: {"status":"ok","service":"TRAQQ API"}
```

---

## Step 6 — Configure Nginx

```bash
sudo cp /var/www/traqq/nginx/traqq.conf /etc/nginx/sites-available/traqq
sudo ln -s /etc/nginx/sites-available/traqq /etc/nginx/sites-enabled/traqq
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 7 — SSL certificate

DNS A records for `traqq.com` and `www.traqq.com` must point to the VPS IP before running Certbot.

```bash
sudo certbot --nginx -d traqq.com -d www.traqq.com

# Verify auto-renewal works
sudo certbot renew --dry-run
```

---

## Step 8 — Register the Stripe webhook

The webhook endpoint URL is `/api/payments/webhook`. It must be registered in the Stripe Dashboard so Stripe knows where to send payment events.

**Events that must be enabled:**
- `payment_intent.succeeded` — confirms booking, marks PAID, generates QR code
- `payment_intent.payment_failed` — marks booking payment as FAILED
- `checkout.session.completed` — fulfills package purchases

**Steps:**

1. Go to **dashboard.stripe.com/webhooks**
2. Click **"Add endpoint"**
3. Set **Endpoint URL** to: `https://traqq.com/api/payments/webhook`
4. Under **"Select events to listen to"**, add:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
5. Click **"Add endpoint"**
6. On the endpoint detail page, click **"Reveal"** next to **Signing secret**
7. Copy the `whsec_...` value
8. Add it to `/var/www/traqq/backend/.env`:
   ```
   STRIPE_WEBHOOK_SECRET="whsec_YOUR_SECRET_HERE"
   ```
9. Restart the backend to pick up the change:
   ```bash
   pm2 restart traqq-backend
   ```

**Verify the webhook secret is active:**

```bash
curl -so /dev/null -w "%{http_code}" \
  -X POST https://traqq.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=1,v1=fakesig" \
  --data-raw '{"type":"test"}'
```

- **`400`** — secret is configured, signature verification ran ✓
- **`503`** — `STRIPE_WEBHOOK_SECRET` is missing from `.env` — add it and restart PM2

---

## Step 9 — Google Maps setup

Address autocomplete on the booking form uses the Maps JavaScript API + Places API.

**Steps:**

1. Go to **console.cloud.google.com → APIs & Services → Credentials**
2. Click **"Create credentials" → "API key"**
3. Go to **APIs & Services → Library** and enable both:
   - **Maps JavaScript API**
   - **Places API**
4. Go back to Credentials, click your new API key, and under **"Application restrictions"**:
   - Select **"HTTP referrers (websites)"**
   - Add: `https://traqq.com/*` and `https://www.traqq.com/*`
5. Under **"API restrictions"**, restrict to: Maps JavaScript API + Places API
6. Copy the API key and add it to `/var/www/traqq/backend/.env`:
   ```
   GOOGLE_MAPS_API_KEY="YOUR_KEY_HERE"
   ```
7. Restart the backend:
   ```bash
   pm2 restart traqq-backend
   ```

The key is served to the browser via `GET /api/config` — it is never baked into the frontend bundle.

If `GOOGLE_MAPS_API_KEY` is empty or missing, the booking form falls back to free-text address entry (no autocomplete, no lat/lng stored).

---

## Step 10 — Run deployment verification

```bash
bash /var/www/traqq/scripts/verify-deployment.sh https://traqq.com
```

All checks must show `[PASS]` before accepting real payments.

---

## Step 11 — Final payment test

Run this test before going live. Use Stripe's test card — no real money is charged.

> **Use test card number `4242 4242 4242 4242`** with any future expiry and any 3-digit CVC.
> This card always succeeds and triggers `payment_intent.succeeded`.

**Test procedure:**

| # | Step | Expected result |
|---|------|----------------|
| 1 | Open `https://traqq.com/booking` | Booking form loads |
| 2 | Complete all booking steps (date, time, address, terminal, contact) | Advances to checkout |
| 3 | On checkout page, enter promo code `INFLUENCER15` and click Apply | Discount row appears, price drops to $84.15 |
| 4 | In the Stripe payment element, enter card `4242 4242 4242 4242`, any future date, any CVC | Form is valid |
| 5 | Click "Pay Now" | Loading spinner |
| 6 | Page navigates to `/success` | "You're All Set!" page |
| 7 | QR code appears within ~5 seconds | Base64 QR image |
| 8 | Open Stripe Dashboard → Payments | New payment at $84.15 with status "Succeeded" |
| 9 | Open Stripe Dashboard → Webhooks → your endpoint → Recent deliveries | `payment_intent.succeeded` shows status 200 |
| 10 | Open TRAQQ admin (`/admin-login`), go to Bookings | New booking visible with status CONFIRMED, payment PAID |
| 11 | Click the booking to open detail | Shows correct bookingRef, price $84.15, QR code visible |
| 12 | Run `pm2 logs traqq-backend --lines 50` | No errors in log |

If any step fails:
- Steps 4–6 fail → Check `STRIPE_PUBLISHABLE_KEY` and `STRIPE_RESTRICTED_KEY` in `.env`; verify restricted key permissions in Dashboard
- Step 7 (no QR) → Check `STRIPE_WEBHOOK_SECRET` in `.env`; check webhook endpoint is registered in Dashboard; check `pm2 logs` for webhook errors
- Step 8 shows wrong amount → Promo was not applied; verify `INFLUENCER15` is in the `promo_codes` table (`npm run seed:admin`)

---

## Stripe Key Configuration Reference

TRAQQ uses a **Restricted Key** (`rk_live_`) — never a full Secret Key.

### Required permissions

| Stripe resource      | Permission   | Used for |
|----------------------|-------------|---------|
| Payment Intents      | Read + Write | Booking checkout — create & retrieve PaymentIntent |
| Checkout Sessions    | Write        | Package purchases |

Webhook signature verification uses `STRIPE_WEBHOOK_SECRET` locally and makes no Stripe API call.

### How to verify permissions

1. **dashboard.stripe.com/apikeys**
2. Find the key starting with `rk_live_`
3. Click **"Edit key"**
4. Confirm: Payment Intents → Read ✓ + Write ✓ | Checkout Sessions → Write ✓

If a permission is missing, `pm2 logs` will show `StripePermissionError` when a payment or package purchase is attempted.

---

## GO / NO-GO Checklist

### Infrastructure

| # | Check | Command |
|---|-------|---------|
| I-1 | Node.js 20+ installed | `node --version` |
| I-2 | PM2 running, traqq-backend online | `pm2 status` |
| I-3 | PM2 startup configured | `pm2 startup` ran, command executed |
| I-4 | PostgreSQL running | `systemctl status postgresql` |
| I-5 | Nginx running | `systemctl status nginx` |
| I-6 | SSL active | `https://traqq.com` loads without browser warning |
| I-7 | HTTP → HTTPS redirect | `curl -I http://traqq.com` → `301` |

### Backend

| # | Check | Command |
|---|-------|---------|
| B-1 | Health endpoint | `curl https://traqq.com/health` → `{"status":"ok"}` |
| B-2 | API proxy works | `curl https://traqq.com/api/config` → JSON with Stripe publishable key |
| B-3 | Database connected | `curl "https://traqq.com/api/bookings/availability?date=2026-07-01"` → slot list |
| B-4 | Migrations applied | `cd /var/www/traqq/backend && npx prisma migrate status` → all applied |

### Security

| # | Check | How to verify |
|---|-------|--------------|
| S-1 | JWT_SECRET is real | Not the placeholder from `.env.example` |
| S-2 | JWT_REFRESH_SECRET differs | Different value from JWT_SECRET |
| S-3 | Webhook secret active | Fake POST → `400` (not `503`) |
| S-4 | `.env` not committed | `git status` shows no `.env` |
| S-5 | `.env` permissions locked | `ls -la backend/.env` → `-rw-------` |
| S-6 | Bootstrap script deleted | `ls scripts/setup-vps-env.sh` → "No such file" |

### Stripe

| # | Check | How to verify |
|---|-------|--------------|
| P-1 | Restricted key permissions set | Dashboard: Payment Intents R+W, Checkout Sessions W |
| P-2 | Live publishable key configured | `/api/config` returns `pk_live_...` |
| P-3 | Webhook endpoint registered | Dashboard → Webhooks → endpoint listed with 3 events |
| P-4 | Test payment succeeds | Card `4242 4242 4242 4242` → QR code appears on success page |
| P-5 | Webhook fires | After test payment: Dashboard delivery shows 200; no errors in `pm2 logs` |

### Application flows

| # | Check | URL |
|---|-------|-----|
| A-1 | Admin login | `https://traqq.com/admin-login` |
| A-2 | Driver login | `https://traqq.com/driver-login` |
| A-3 | Booking form + address autocomplete | `https://traqq.com/booking` |
| A-4 | Promo code applies on checkout | Enter `INFLUENCER15` → price drops to $84.15 |

---

## Deployment Command Sequence (copy-paste order)

```bash
# ── On the VPS ──────────────────────────────────────────────────────

cd /var/www/traqq

# 1. Pull latest code
git pull origin main

# 2. PostgreSQL setup (first deploy only)
sudo -u postgres psql -f scripts/setup-postgresql.sql

# 3. Bootstrap .env (first deploy only) — DELETES ITSELF
bash scripts/setup-vps-env.sh
rm scripts/setup-vps-env.sh

# 4. Log directory
sudo mkdir -p /var/log/traqq
sudo chown $USER:$USER /var/log/traqq

# 5. Install & build backend
cd /var/www/traqq/backend
npm install --omit=dev
npm run build

# 6. Apply migrations
npx prisma migrate deploy

# 7. Seed admin user + promo codes (first deploy only)
npm run seed:admin

# 8. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup   # run the command PM2 prints

# 9. Configure Nginx + SSL
sudo cp /var/www/traqq/nginx/traqq.conf /etc/nginx/sites-available/traqq
sudo ln -s /etc/nginx/sites-available/traqq /etc/nginx/sites-enabled/traqq
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d traqq.com -d www.traqq.com

# 10. Register Stripe webhook (see Step 8 above), then verify:
curl -so /dev/null -w "%{http_code}" \
  -X POST https://traqq.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=1,v1=fake" \
  --data-raw '{"type":"test"}'
# Must return 400

# 11. Run automated verification
bash /var/www/traqq/scripts/verify-deployment.sh https://traqq.com

# 12. Run the payment test (Step 11 above)

# 13. Watch logs for 5 minutes
pm2 logs traqq-backend --lines 100
```

---

## Useful operations (after go-live)

```bash
# Restart backend (e.g. after .env change)
pm2 restart traqq-backend

# View live logs
pm2 logs traqq-backend

# Check migration status
cd /var/www/traqq/backend && npx prisma migrate status

# Nginx reload after config change
sudo nginx -t && sudo systemctl reload nginx

# SSL renewal test
sudo certbot renew --dry-run

# Re-run deployment checks
bash /var/www/traqq/scripts/verify-deployment.sh https://traqq.com

# Test webhook secret (400 = OK, 503 = secret missing)
curl -so /dev/null -w "%{http_code}" \
  -X POST https://traqq.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=1,v1=fake" \
  --data-raw '{"type":"test"}'
```
