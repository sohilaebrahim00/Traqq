# TRAQQ — Hostinger VPS Deployment Guide

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

Nginx serves the `frontend/` directory as static files and reverse-proxies every
`/api/*` request to the Express backend running under PM2.

---

## Stripe Key Configuration

TRAQQ uses a **Restricted Key** (`rk_live_`) instead of a full Secret Key.
This is correct practice — the restricted key limits blast radius if it is ever exposed.

### Minimum required permissions for the Restricted Key

| Stripe Resource     | Permission | Required for |
|---------------------|-----------|-------------|
| Payment Intents     | Read + Write | Booking checkout — create & retrieve PaymentIntent |
| Checkout Sessions   | Write        | Package purchases via Stripe Checkout |

Webhook signature verification (`constructEvent`) is performed **locally** using the
`STRIPE_WEBHOOK_SECRET`. It does not make any Stripe API call and requires no key
permissions.

### Verify / set permissions in Stripe Dashboard

1. Go to **[dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)**
2. Find the restricted key starting with `rk_live_`
3. Click **"Edit key"** (three-dot menu or key name)
4. Confirm the following permissions are **ON**:
   - Payment Intents → **Read** ✓ + **Write** ✓
   - Checkout Sessions → **Write** ✓
5. Save changes

If any permission is missing, Stripe returns HTTP 403 with:
```json
{"error":{"type":"invalid_request_error","code":"permission_denied"}}
```
This will appear in `pm2 logs traqq-backend` when a payment or package purchase is attempted.

### Environment variable name

The codebase uses `STRIPE_RESTRICTED_KEY` (not `STRIPE_SECRET_KEY`).
Both controllers that initialise the Stripe SDK check for this variable:

```js
// backend/src/controllers/payment.controller.js
// backend/src/controllers/package.controller.js
function getStripe() {
  if (!process.env.STRIPE_RESTRICTED_KEY) return null;
  return require('stripe')(process.env.STRIPE_RESTRICTED_KEY);
}
```

---

## Prerequisites — install once on the VPS

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# Certbot
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 1 — PostgreSQL setup

```bash
sudo -u postgres psql -f /var/www/traqq/scripts/setup-postgresql.sql
```

The SQL script in `scripts/setup-postgresql.sql` creates:
- Database: `traqq_db`
- User: `traqq_user` with the generated password
- Full privileges on the public schema

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

Run the bootstrap script on the VPS. It writes `/var/www/traqq/backend/.env` with
all secrets already filled in (JWT secrets, DB password, Stripe keys):

```bash
bash /var/www/traqq/scripts/setup-vps-env.sh
```

Verify it was created:

```bash
ls -la /var/www/traqq/backend/.env
# Expected: -rw------- 1 root root ... .env

head -1 /var/www/traqq/backend/.env
# Expected: # TRAQQ Production Environment
```

**Delete the bootstrap script immediately after running** — it contains secrets:

```bash
rm /var/www/traqq/scripts/setup-vps-env.sh
```

---

## Step 4 — Install, migrate, seed

```bash
cd /var/www/traqq/backend

# Install production dependencies only
npm install --omit=dev

# Generate Prisma client
npm run build

# Apply all migrations to traqq_db
npx prisma migrate deploy

# Create the admin user (reads credentials from .env)
npm run seed:admin
```

Expected seed output:
```
TRAQQ Admin Seed
Admin user created:
  Email: admin@traqq.com
  Role:  ADMIN
```

---

## Step 5 — Start with PM2

```bash
cd /var/www/traqq

pm2 start ecosystem.config.js --env production
pm2 save

# Enable PM2 auto-start on reboot
pm2 startup
# Copy and run the command PM2 prints
```

Verify:

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

DNS A record for `traqq.com` and `www.traqq.com` must point to the VPS IP first.

```bash
sudo certbot --nginx -d traqq.com -d www.traqq.com
sudo certbot renew --dry-run   # verify auto-renewal works
```

---

## Step 8 — Verify the Stripe webhook secret

After Nginx and SSL are up, test that `STRIPE_WEBHOOK_SECRET` is active:

```bash
curl -so /dev/null -w "%{http_code}" \
  -X POST https://traqq.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=1,v1=fakesig" \
  --data-raw '{"type":"test"}'
```

- **`400`** — secret is configured, signature verification ran ✓
- **`503`** — secret is missing → check `.env` and `pm2 restart traqq-backend`

---

## Step 9 — Run verification

```bash
bash /var/www/traqq/scripts/verify-deployment.sh https://traqq.com
```

All 13 checks must show `[PASS]`.

---

## GO / NO-GO Checklist

### Infrastructure

| # | Check | Command | |
|---|-------|---------|---|
| I-1 | Node.js 20 installed | `node --version` | [ ] |
| I-2 | PM2 running | `pm2 status` | [ ] |
| I-3 | PM2 startup configured | `pm2 startup` ran, command executed | [ ] |
| I-4 | PostgreSQL running | `systemctl status postgresql` | [ ] |
| I-5 | Nginx running | `systemctl status nginx` | [ ] |
| I-6 | SSL active | `https://traqq.com` loads without warning | [ ] |
| I-7 | HTTP → HTTPS redirect | `curl -I http://traqq.com` → 301 | [ ] |

### Backend

| # | Check | Command | |
|---|-------|---------|---|
| B-1 | Health endpoint | `curl https://traqq.com/health` → `{"status":"ok"}` | [ ] |
| B-2 | API proxy works | `curl https://traqq.com/api/config` → JSON | [ ] |
| B-3 | Database connected | `curl "https://traqq.com/api/bookings/availability?date=2026-07-01"` → slots | [ ] |
| B-4 | Migrations applied | `npx prisma migrate status` → all applied | [ ] |

### Security

| # | Check | Evidence | |
|---|-------|---------|---|
| S-1 | JWT_SECRET is real hex | Not the placeholder from template | [ ] |
| S-2 | JWT_REFRESH_SECRET is different | Different value from JWT_SECRET | [ ] |
| S-3 | Webhook secret active | Fake POST → `400` (not `503`) | [ ] |
| S-4 | `.env` not in git | `git status` shows no `.env` | [ ] |
| S-5 | `.env` permissions | `ls -la backend/.env` → `-rw-------` | [ ] |
| S-6 | Bootstrap script deleted | `ls scripts/setup-vps-env.sh` → No such file | [ ] |

### Stripe

| # | Check | Evidence | |
|---|-------|---------|---|
| P-1 | Restricted key permissions set | Dashboard: Payment Intents R+W, Checkout Sessions W | [ ] |
| P-2 | Live publishable key | `/api/config` → `pk_live_...` | [ ] |
| P-3 | Webhook endpoint registered | dashboard.stripe.com/webhooks → endpoint listed | [ ] |
| P-4 | Test payment succeeds | Card `4242 4242 4242 4242` → QR code appears | [ ] |
| P-5 | Webhook fires | After test payment: `pm2 logs` shows no errors | [ ] |

### Application Flows

| # | Check | URL | |
|---|-------|-----|---|
| A-1 | Admin login works | `https://traqq.com/admin-login` | [ ] |
| A-2 | Driver login works | `https://traqq.com/driver-login` | [ ] |
| A-3 | Booking form works | `https://traqq.com/booking` | [ ] |
| A-4 | Customer tracking works | tracking URL from completed booking | [ ] |

---

## Final Deployment Command Sequence

Run these commands on the VPS in exact order:

```bash
# 1. Enter project root
cd /var/www/traqq

# 2. Pull latest code
git pull origin main

# 3. Run PostgreSQL setup (first deploy only)
sudo -u postgres psql -f scripts/setup-postgresql.sql

# 4. Bootstrap the .env (first deploy only — deletes itself)
bash scripts/setup-vps-env.sh
rm scripts/setup-vps-env.sh   # delete immediately after

# 5. Install & build backend
cd /var/www/traqq/backend
npm install --omit=dev
npm run build

# 6. Apply migrations
npx prisma migrate deploy

# 7. Seed admin user (first deploy only)
npm run seed:admin

# 8. Start with PM2
cd /var/www/traqq
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup   # run the printed command

# 9. Configure Nginx + SSL
sudo cp nginx/traqq.conf /etc/nginx/sites-available/traqq
sudo ln -s /etc/nginx/sites-available/traqq /etc/nginx/sites-enabled/traqq
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d traqq.com -d www.traqq.com

# 10. Verify everything
bash scripts/verify-deployment.sh https://traqq.com

# 11. Watch live logs for 5 minutes
pm2 logs traqq-backend --lines 100
```

---

## Useful operations

```bash
# Restart backend after .env change
pm2 restart traqq-backend

# View live logs
pm2 logs traqq-backend

# Test webhook secret (400 = OK, 503 = secret missing)
curl -so /dev/null -w "%{http_code}" \
  -X POST https://traqq.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=1,v1=fake" \
  --data-raw '{"type":"test"}'

# Check migration status
cd /var/www/traqq/backend && npx prisma migrate status

# Nginx reload after config change
sudo nginx -t && sudo systemctl reload nginx

# SSL renewal test
sudo certbot renew --dry-run

# Re-run all deployment checks
bash /var/www/traqq/scripts/verify-deployment.sh https://traqq.com
```
