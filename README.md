# TRAQQ — Premium Airport Shuttle

Private door-to-door shuttle to DFW Airport. Flat rate $99. Up to 6 passengers.

Built with Vanilla JS SPA, Node.js + Express, Prisma ORM, Stripe, JWT auth, and QR code generation.

---

## Project Structure

```
traqq/
├── backend/              ← Node.js + Express API (port 4000)
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/  ← auth, booking, payment logic
│   │   ├── middleware/   ← JWT auth guard
│   │   ├── routes/       ← /api/auth, /api/bookings, /api/payments
│   │   └── utils/        ← JWT token helpers
│   ├── server.js
│   └── package.json
├── frontend/             ← Vanilla JS SPA (port 3000)
│   ├── index.html        ← favicon configured here
│   ├── assets/
│   │   ├── css/          ← main.css (full premium design)
│   │   ├── js/           ← main.js (entry point)
│   │   └── images/       ← logo.png, icon.png (favicon), and other assets
│   ├── pages/            ← all 20 pages
│   ├── components/       ← navbar.js, footer.js
│   ├── utils/            ← auth.js, adminLayout.js
│   ├── router/           ← SPA router (history.pushState)
│   └── services/         ← api.js, stripe.js
└── frontend-server.js    ← Minimal Node.js static file server
```

---

## Required Tools

| Tool      | Minimum Version | Check Command      |
|-----------|-----------------|--------------------|
| Node.js   | 18.x or higher  | `node --version`   |
| npm       | 9.x or higher   | `npm --version`    |

> **Database:** This project uses **SQLite** for local development (no installation required). For production, switch to PostgreSQL — see Production Notes below.

---

## Quick Start — Run the Full Project Locally

### Step 1 — Navigate to the project

```bash
cd C:\Users\sohila\traqq
```

### Step 2 — Install backend dependencies

```bash
cd backend
npm install
```

### Step 3 — Create the environment file

```bash
copy .env.example .env
```

Open `backend/.env` and set at minimum:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="any-random-string-at-least-32-chars"
JWT_REFRESH_SECRET="another-random-string-at-least-32-chars"
STRIPE_RESTRICTED_KEY="sk_test_your_stripe_secret_key_here"
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
PORT=4000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

> **Security:** `STRIPE_RESTRICTED_KEY` never leaves the backend. The frontend receives only `STRIPE_PUBLISHABLE_KEY`, served via `GET /api/config` — it is never hardcoded in frontend source files.
>
> If you don't have Stripe keys yet, leave the placeholders. The checkout page shows a **"Simulate Payment (Dev Mode)"** button so you can test the full booking flow without real keys.

### Step 4 — Generate Prisma client

```bash
cd backend
npx prisma generate
```

### Step 5 — Create the local SQLite database

```bash
npx prisma db push
```

This creates `backend/prisma/prisma/dev.db` automatically. No database server needed.

### Step 6 — Start the backend

```bash
node server.js
```

Expected output: `TRAQQ API running on port 4000`

### Step 7 — Start the frontend

From the project root (`traqq/`):

```bash
node frontend-server.js
```

Expected output: `TRAQQ Frontend running at http://localhost:3000`

---

## Localhost URLs

| Service         | URL                          |
|-----------------|------------------------------|
| Frontend (SPA)  | http://localhost:3000        |
| Backend API     | http://localhost:4000        |
| Health check    | http://localhost:4000/health |
| Admin Dashboard | http://localhost:3000/admin  |
| Prisma Studio   | Run `npx prisma studio` in `backend/` |

---

## Booking Flow (9 Steps)

The booking wizard at `/booking` walks through 9 steps:

| Step | Field | Notes |
|------|-------|-------|
| 1 | **Trip Direction** | To DFW Airport (`TO_DFW`) or From DFW Airport (`FROM_DFW`) |
| 2 | **Pickup Date** | Must be today or future; 4-digit year; valid calendar date |
| 3 | **Pickup Time** | 30-minute intervals only; shows real-time booked slots |
| 4 | **Pickup Address** | Free-text; minimum 5 characters |
| 5 | **Passengers** | Counter 1–6; max 6 enforced frontend and backend |
| 6 | **Luggage** | Carry-on count + checked bag count |
| 7 | **Terminal** | DFW Terminals A, B, C, D, or E |
| 8 | **Flight Details** | Airline + departure time (both optional) |
| 9 | **Contact** | Phone (required) + email (optional) |

After submission, the user is sent to `/checkout` for Stripe payment. On success, navigates to `/success` showing QR code and full trip details.

---

## Page Routes

### Booking Flow
| Route | Page | Description |
|---|---|---|
| `/` | Home | Hero, features, CTA |
| `/booking` | Booking Wizard | 9-step booking form |
| `/checkout` | Checkout | Stripe payment |
| `/success` | Confirmation | QR code + booking details |
| `/booking-details` | Booking Details | Look up any booking by ID (`?id=`) |
| `/history` | My Bookings | Guest-saved + API bookings |

### Auth
| Route | Page |
|---|---|
| `/login` | Sign in with email + password |
| `/register` | Create account |

### Admin (requires admin role JWT)
| Route | Page |
|---|---|
| `/admin` | Dashboard — 7 stat cards + recent bookings |
| `/admin/bookings` | All bookings — confirm, cancel, complete, view |
| `/admin/booking-details?id=` | Single booking — full details + QR + actions |
| `/admin/customers` | Customer list derived from bookings |
| `/admin/payments` | Payment tracking and Stripe intents |
| `/admin/analytics` | Daily rides, revenue, terminal, direction charts |
| `/admin/settings` | Business config + integration status indicators |

### Verification
| Route | Page |
|---|---|
| `/verify-booking?id=` | QR scan landing page — shows CONFIRMED/PAID status |

### Static / Content Pages
| Route | Page |
|---|---|
| `/about` | About TRAQQ |
| `/how-it-works` | 5-step process explanation |
| `/contact` | Contact form + info |
| `/faq` | Searchable FAQ with accordion |
| `/terms` | Terms of Service |
| `/privacy` | Privacy Policy |
| `/cancellation-policy` | Cancellation tiers and rules |

---

## Environment Variables

| Variable               | Required | Description |
|------------------------|----------|-------------|
| `DATABASE_URL`         | Yes      | `file:./prisma/dev.db` for local SQLite |
| `JWT_SECRET`           | Yes      | Signs access tokens (15 min TTL) — min 32 chars |
| `JWT_REFRESH_SECRET`   | Yes      | Signs refresh tokens (7 day TTL) — min 32 chars |
| `STRIPE_RESTRICTED_KEY`    | Yes      | Backend-only (`sk_test_...` for dev) |
| `STRIPE_PUBLISHABLE_KEY` | Yes    | Served to frontend via `/api/config` (`pk_test_...` for dev) |
| `STRIPE_WEBHOOK_SECRET` | Yes     | Verifies Stripe webhook signatures (`whsec_...`) |
| `GOOGLE_MAPS_API_KEY`  | Optional | Enables address autocomplete |
| `PORT`                 | No       | Backend port, default `4000` |
| `NODE_ENV`             | No       | Set to `development` locally |
| `FRONTEND_URL`         | No       | CORS origin — `http://localhost:3000` locally |

**Frontend API URL** (in `frontend/config.js` — change for production):

```js
export const API_BASE_URL = 'http://localhost:4000/api';
```

---

## API Endpoints

### Auth
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register` | None |
| POST | `/api/auth/login` | None |
| POST | `/api/auth/refresh` | None |

### Bookings
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/bookings/create` | Optional | Requires `tripDirection` |
| GET | `/api/bookings/availability?date=YYYY-MM-DD` | None | Returns available/unavailable slots |
| GET | `/api/bookings/:id` | None | |
| PUT | `/api/bookings/:id` | JWT | |
| DELETE | `/api/bookings/:id` | Admin | |
| GET | `/api/bookings` | Admin | |

### Payments
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/payments/create-intent` | None |
| POST | `/api/payments/webhook` | Stripe signature |

### Admin (requires admin JWT)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/admin/overview` | 7 stat counters for dashboard cards |
| PATCH | `/api/admin/bookings/:id/status` | Update booking status (CONFIRMED/CANCELLED/COMPLETED/PENDING) |

### Verification
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/bookings/verify/:id` | Returns `{ valid, booking? }` — safe public endpoint for QR scan |

### Config
| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/config` | `{ stripePublishableKey }` |
| GET | `/health` | `{ status: "ok", service: "TRAQQ API" }` |

---

## Prisma Commands

Run all from the `backend/` folder:

```bash
# Regenerate Prisma client after schema changes
npx prisma generate

# Push schema changes to SQLite (local dev — no migration files)
npx prisma db push

# Open Prisma Studio (visual database browser)
npx prisma studio

# Create a named migration (production PostgreSQL)
npx prisma migrate dev --name your_migration_name
```

---

## Database Schema Summary

### Booking fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `tripDirection` | String | `TO_DFW` or `FROM_DFW` |
| `pickupDate` | DateTime | Stored as UTC midnight |
| `pickupTime` | String | e.g. `9:00`, `14:30` |
| `pickupAddress` | String | Minimum 5 chars |
| `passengerCount` | Int | 1–6 |
| `carryOnCount` | Int | Default 0 |
| `checkedLuggageCount` | Int | Default 0 |
| `dropoffTerminal` | String | A, B, C, D, or E |
| `airline` | String? | Optional |
| `departureTime` | String? | Optional |
| `phoneNumber` | String | Required |
| `email` | String? | Optional |
| `bookingStatus` | String | PENDING / CONFIRMED / CANCELLED / COMPLETED |
| `paymentStatus` | String | UNPAID / PAID / FAILED / REFUNDED |
| `price` | Float | Always 99.00 |
| `qrCode` | String? | Base64 data URL, set after payment confirmed |
| `userId` | String? | Null for guest bookings |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

---

## Security Notes

- **Stripe secret key** (`STRIPE_RESTRICTED_KEY`) is backend-only. Never put it in frontend code.
- **JWT secrets** are loaded from environment variables. Never hardcode them.
- **Passwords** are hashed with bcryptjs before storage.
- **Rate limiting** is applied to all `/api/` routes (100 req / 15 min per IP).
- **Helmet** sets security headers on all responses.
- **CORS** is restricted to `FRONTEND_URL`.
- **Price** is always enforced as 9900 cents on the backend. Frontend price display is never trusted.
- **Passenger count** max of 6 is enforced by Zod on the backend.
- **Webhook** uses raw body + Stripe signature verification. Never bypassed.
- **Input validation** uses Zod for all booking fields including `tripDirection` enum.
- **Production** must use HTTPS (handled by hosting platform — Render, Vercel, Railway, etc.).

---

## Troubleshooting

### "Cannot find module '@prisma/client'"
Run `npm install` inside `backend/`, then `npx prisma generate`.

### "Port 4000 already in use"
```powershell
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### Stripe shows "Payment system not configured"
Set `STRIPE_RESTRICTED_KEY=sk_test_...` and `STRIPE_PUBLISHABLE_KEY=pk_test_...` in `backend/.env`.

### ES module errors in browser console
The frontend must be served over HTTP. Make sure `node frontend-server.js` is running.

### "Prisma Client is not generated"
Run `npx prisma generate` inside `backend/`.

### Booking fails with "Required" or enum error
Ensure `tripDirection` is sent as `TO_DFW` or `FROM_DFW` in the booking payload.

---

## Admin Dashboard

### Step 1 — Seed the admin user

> ⚠ **These credentials are for LOCAL DEVELOPMENT only. Change them before deploying to production.**

Run once from the `backend/` directory:

```bash
cd backend
npm run seed:admin
```

Or directly:

```bash
node prisma/seed.js
```

The script is **idempotent** — safe to run multiple times. If the admin user already exists it always resets the password hash and role, so re-running it is the correct fix if login stops working.

### Step 2 — Log in as admin

1. Open **http://localhost:3000/login**
2. Enter:
   - **Email:** `admin@traqq.local`
   - **Password:** `Admin@123456`
3. After login you are automatically redirected to **http://localhost:3000/admin**

### Admin routes

| Route | Description |
|---|---|
| http://localhost:3000/admin | Dashboard — stat cards + recent bookings |
| http://localhost:3000/admin/bookings | All bookings — confirm, cancel, view details |
| http://localhost:3000/admin/booking-details?id= | Single booking full view + QR |
| http://localhost:3000/admin/customers | Customer list |
| http://localhost:3000/admin/payments | Payment tracking + revenue |
| http://localhost:3000/admin/analytics | Charts: daily rides, revenue, terminals |
| http://localhost:3000/admin/settings | Business config + integration status |

### Admin security

- Non-admin users see an **Access Denied** screen with a **"Sign Out & Switch Account"** button.
- Not-logged-in users see a **Sign In Required** screen.
- All backend `/api/admin/*` endpoints require a valid admin JWT — 401 without token, 403 for non-admin.
- Passwords are stored as **bcrypt hashes** (cost factor 10). Plain text is never stored.
- The JWT access token (15 min) includes `{ id, role }` — role is verified on every admin API call.

### To add another admin user

1. Register normally via `/register` or `POST /api/auth/register`
2. Then update the role in Prisma Studio:
   ```bash
   cd backend
   npx prisma studio
   ```
   Find the user → change `role` from `CUSTOMER` to `ADMIN`.

> **Production:** Create a strong unique password, remove test accounts, and rotate JWT secrets.

---

## Local Development Cleanup

### Remove test users

A cleanup script is included to delete test/development user accounts while safely preserving the admin.

```bash
cd backend

# Delete test users only (preserve all bookings)
npm run cleanup:test-users

# Delete test users AND PENDING/UNPAID test bookings
npm run cleanup:test-users:bookings
```

**Safe guards:**
- `admin@traqq.local` is never deleted
- CONFIRMED/PAID bookings are always preserved
- Only PENDING, UNPAID, and FAILED bookings are deleted with `--bookings`
- Guest bookings (no user account) are handled separately from user-linked bookings

After cleanup, always re-run the admin seed:

```bash
npm run seed:admin
```

---

## Stripe Setup

> **Never commit real keys.** All keys go into `backend/.env`, which is in `.gitignore`.

### Step-by-step

1. Create a free account at stripe.com
2. Go to **Developers → API keys**
3. Copy **test secret key** (`sk_test_...`) → `backend/.env` as `STRIPE_RESTRICTED_KEY`
4. Copy **test publishable key** (`pk_test_...`) → `backend/.env` as `STRIPE_PUBLISHABLE_KEY`

The frontend fetches the publishable key from `GET /api/config` at runtime — no keys exist in frontend source files.

### Test cards

| Card number | Result |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 9995` | Payment declined (insufficient funds) |
| `4000 0027 6000 3184` | Requires 3D Secure authentication |

Use any future expiry date, any 3-digit CVC, any 5-digit ZIP.

### Webhook testing locally

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli), then:

```bash
stripe listen --forward-to localhost:4000/api/payments/webhook
```

The CLI prints a webhook signing secret (`whsec_...`) — copy it to `backend/.env` as `STRIPE_WEBHOOK_SECRET`.

### Dev mode (no Stripe keys)

When `STRIPE_RESTRICTED_KEY` / `STRIPE_PUBLISHABLE_KEY` are not set:
- `GET /api/config` returns `{ stripePublishableKey: '' }`
- The checkout page shows a **"Simulate Payment (Dev Mode)"** button
- Clicking it navigates directly to `/success` — no QR code is generated
- `POST /api/payments/create-intent` returns HTTP 503 with a clear error message

### Stripe integration checklist

| Item | Status |
|---|---|
| Secret key backend-only | ✓ Never in frontend code |
| Publishable key via `/api/config` | ✓ Fetched at runtime |
| Amount hardcoded 9900 cents (backend) | ✓ Frontend never sends price |
| Currency hardcoded USD (backend) | ✓ |
| Duplicate payment prevention | ✓ Reuses existing PaymentIntent |
| Webhook raw body parsing | ✓ Before `express.json()` |
| Webhook signature verification | ✓ Uses `STRIPE_WEBHOOK_SECRET` |
| QR generated on `payment_intent.succeeded` | ✓ |
| QR NOT generated on `payment_intent.payment_failed` | ✓ |
| Dev mode fallback | ✓ "Simulate Payment" button |

---

## Production Checklist

- [ ] Switch `prisma/schema.prisma` provider from `sqlite` to `postgresql`
- [ ] Restore `@db.Decimal(10, 2)` on `Booking.price`
- [ ] Re-add enum types to schema (Role, BookingStatus, PaymentStatus, Terminal)
- [ ] Run `npx prisma migrate dev --name init`
- [ ] Set `DATABASE_URL` to PostgreSQL connection string
- [ ] Set all production secrets in deployment environment variables
- [ ] Change `API_BASE_URL` in `frontend/config.js` to production API URL
- [ ] Configure Stripe webhook endpoint in Stripe Dashboard → production URL
- [ ] Verify HTTPS is enabled (handled by hosting platform)
- [ ] Set `NODE_ENV=production`
- [ ] Set `FRONTEND_URL` to production frontend URL

Recommended hosting: Backend on **Render** or **Railway**, Database on **Supabase** or **Railway PostgreSQL**, Frontend on **Vercel** or **Netlify**.

---

## Full Command Reference

```bash
# Terminal 1 — Backend
cd C:\Users\sohila\traqq\backend
npm install
copy .env.example .env        # then edit .env
npx prisma generate
npx prisma db push
node server.js

# Terminal 2 — Frontend
cd C:\Users\sohila\traqq
node frontend-server.js
```

Open http://localhost:3000 in your browser.
