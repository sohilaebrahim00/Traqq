# TRAQQ — Local Development Setup

## Prerequisites

- Node.js 20+
- A local PostgreSQL instance (see options below)

---

## 1. Start a local PostgreSQL instance

`schema.prisma` always uses `postgresql`. Choose one option:

**Option A — Docker (easiest, no local install needed):**

```bash
docker run -d \
  --name traqq-db \
  -e POSTGRES_PASSWORD=dev \
  -p 5432:5432 \
  postgres:15

# Stop: docker stop traqq-db
# Start again: docker start traqq-db
```

**Option B — existing local PostgreSQL:**

```bash
createdb traqq_dev
# note your postgres user password for the DATABASE_URL below
```

---

## 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set:

```
DATABASE_URL="postgresql://postgres:dev@localhost:5432/traqq_dev?schema=public"
NODE_ENV=development
PORT=4000
JWT_SECRET="any-long-random-string-for-dev"
JWT_REFRESH_SECRET="a-different-long-random-string-for-dev"
```

Stripe and Google Maps keys are optional for local development:
- Leave `STRIPE_RESTRICTED_KEY` empty to get a `503` on payment routes (safe for UI testing without payments)
- Leave `GOOGLE_MAPS_API_KEY` empty to use free-text address entry (no autocomplete)

---

## 3. Install, migrate, seed

```bash
cd backend
npm install

# Generate Prisma client
npm run db:generate

# Apply migrations to your local DB
npm run db:migrate        # runs prisma migrate dev (creates dev.db migration history)
# OR for a fresh DB matching production migrations exactly:
npx prisma migrate deploy

# Seed admin user + INFLUENCER15 promo code
npm run seed:admin
```

Admin credentials (from `.env.example` defaults):
- Email: `admin@traqq.com`
- Password: `Admin@123456`

---

## 4. Start the backend

```bash
cd backend
npm run dev
# Listening on http://localhost:4000
```

---

## 5. Serve the frontend

```bash
# Option A — npx serve (serves on port 3000 by default)
npx serve frontend -p 3000

# Option B — VS Code Live Server
# Right-click frontend/index.html → "Open with Live Server"
```

The frontend auto-detects `localhost` and talks to `http://localhost:4000/api`.
No configuration needed.

---

## 6. Verify it works

```bash
# Health check
curl http://localhost:4000/health
# → {"status":"ok","service":"TRAQQ API"}

# Slot availability
curl "http://localhost:4000/api/bookings/availability?date=2026-07-01"
# → {"success":true,"availableSlots":[...]}

# Config (Stripe + Maps keys)
curl http://localhost:4000/api/config
# → {"stripePublishableKey":"...","googleMapsApiKey":"..."}
```

---

## Stripe setup (optional for local dev)

To test payments locally against the Stripe test environment:

1. Add test keys to `.env` (use `pk_test_` and `rk_test_` keys from Stripe Dashboard → Test mode):
   ```
   STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_RESTRICTED_KEY="rk_test_..."
   ```
2. For webhook testing, install the Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:4000/api/payments/webhook
   ```
   Copy the webhook signing secret it prints and add it to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```
3. Use test card `4242 4242 4242 4242` — never use real cards.

---

## Google Maps setup (optional for local dev)

If you want address autocomplete locally:

1. Follow the Google Maps setup steps in `DEPLOY.md → Step 9`
2. Add the key to `backend/.env`:
   ```
   GOOGLE_MAPS_API_KEY="YOUR_KEY_HERE"
   ```
3. The booking form loads the Maps script from `/api/config` on demand — no changes to `index.html` needed.

---

## Production deployment

See [DEPLOY.md](DEPLOY.md) for the full VPS deployment guide.
