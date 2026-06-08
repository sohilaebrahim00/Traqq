# TRAQQ Project Memory

> **Purpose:** This file is the single source of truth for the TRAQQ project.
> Every future Claude Code session must read this file before making any changes.
> Update this file immediately after every meaningful action.
> **NEVER store real secrets, passwords, or API keys in this file.**

---

## 1. Project Overview

| Field | Value |
|---|---|
| **Project Name** | TRAQQ |
| **Project Type** | VIP Private Airport Shuttle Booking Platform |
| **Main Goal** | Premium door-to-door shuttle booking system — web app only |
| **Flat Rate** | $99 per ride, up to 6 passengers, DFW Airport only |
| **Scope** | Website only (no native mobile app) |

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5 + CSS3 + JavaScript ES6+ (NO React, Vue, or Angular) |
| SPA Router | Manual router using `window.history.pushState()` |
| Backend | Node.js + Express.js |
| ORM | Prisma v5.22.0 |
| Database (local dev) | SQLite (via Prisma) |
| Database (production) | PostgreSQL |
| Authentication | JWT (access token 15 min, refresh token 7 days) + bcryptjs |
| Payment | Stripe (Node SDK on backend, Stripe.js on frontend) |
| QR Codes | `qrcode` npm package |
| Input Validation | Zod |
| Security | Helmet, express-rate-limit, CORS |

### Core Business Rules

- Flat rate: **$99 per ride** (not per person)
- Maximum **6 passengers** per booking
- Pickup from any DFW-area address → drop at **DFW Terminals A, B, C, D, or E**
- Booking steps enforce **half-hour time intervals only** (e.g. 9:00, 9:30)
- QR code generated **only after successful Stripe payment**
- No surge pricing, no hidden fees

---

## 2. Current Architecture

### Frontend Structure

```
C:\Users\sohila\traqq\frontend\
├── index.html                  ← SPA shell (navbar-root, page-root, footer-root, toast-container) + favicon tags
├── config.js                   ← Exports API_BASE_URL (change this one line for production)
├── assets/
│   ├── css/main.css            ← Full premium design (black/gold/white)
│   ├── js/main.js              ← Entry point: initRouter + renderFooter
│   └── images/
│       ├── logo.png            ← Website logo (navbar + footer) — served at /assets/images/logo.png
│       ├── icon.png            ← Browser tab favicon — served at /assets/images/icon.png
│       ├── Home.png            ← Home page hero background image
│       ├── book.png            ← Home page hero side visual (right column)
│       ├── contact-us-1.png    ← Contact page slider image 1 (renamed from "contact us1.png")
│       ├── contact-us-2.png    ← Contact page slider image 2 (renamed from "contact us2.png")
│       ├── contact-us-3.png    ← Contact page slider image 3 (renamed from "contact us3.png")
│       └── contact-us-4.png    ← Contact page slider image 4 (renamed from "contact us4.png")
├── router/
│   └── router.js               ← SPA router (20 routes, pushState, search params)
├── components/
│   ├── navbar.js               ← Auth-aware navbar with logo.png; links: Home, How It Works, About, FAQ, Contact, Sign In, Book Now
│   └── footer.js               ← Upgraded footer: logo, Quick Links (incl. Contact), Booking, Legal, contact placeholder
├── utils/
│   ├── auth.js                 ← getUser, getToken, isAdmin, logout, saveBookingToHistory, showToast
│   └── adminLayout.js          ← Shared admin sidebar layout helper
├── services/
│   ├── api.js                  ← fetch wrapper with JWT injection (BASE_URL from config.js)
│   └── stripe.js               ← Stripe Elements wrapper — fetches publishable key from /api/config
└── pages/
    ├── home.js
    ├── booking.js              ← 8-step wizard
    ├── checkout.js             ← Stripe Elements + dev-mode simulate button
    ├── success.js              ← QR display + saves booking to localStorage
    ├── history.js              ← Tabs: localStorage bookings | API bookings
    ├── bookingDetails.js       ← Lookup by ID (?id=) or shows lookup form
    ├── login.js
    ├── register.js
    ├── adminDashboard.js
    ├── adminBookings.js        ← Confirm/Cancel actions
    ├── adminCustomers.js       ← Derived from bookings data
    ├── adminPayments.js        ← Revenue stats + Stripe intent tracking
    ├── adminAnalytics.js       ← CSS bar charts (daily rides, revenue, terminals)
    ├── about.js
    ├── howItWorks.js
    ├── contact.js              ← Simulated form send (no email backend)
    ├── faq.js                  ← Searchable accordion
    ├── terms.js
    ├── privacy.js
    └── cancellationPolicy.js
```

### Backend Structure

```
C:\Users\sohila\traqq\backend\
├── server.js                   ← Express app, rate limiter, Helmet, CORS, routes
├── package.json
├── .env                        ← Local secrets (NOT committed, NOT stored here)
├── .env.example                ← Placeholder template
├── .gitignore
├── prisma/
│   ├── schema.prisma           ← SQLite local dev schema (enums → String, no @db.Decimal)
│   └── prisma/dev.db           ← SQLite database (auto-created by prisma db push)
└── src/
    ├── config/
    │   └── prisma.js           ← PrismaClient singleton
    ├── controllers/
    │   ├── auth.controller.js  ← register, login, refresh
    │   ├── booking.controller.js ← CRUD + generateQR
    │   └── payment.controller.js ← createPaymentIntent, handleWebhook
    ├── middleware/
    │   └── auth.middleware.js  ← authenticate (JWT), requireAdmin
    ├── routes/
    │   ├── auth.routes.js
    │   ├── booking.routes.js
    │   └── payment.routes.js
    └── utils/
        └── tokens.js           ← signAccess, signRefresh, verifyRefresh
```

### Database Structure (SQLite local dev)

> **Important:** For production, switch Prisma provider back to `"postgresql"`, restore enum types, and add `@db.Decimal(10, 2)` to Booking.price.

**Tables and key fields:**

| Table | Key Fields |
|---|---|
| `users` | id (cuid), fullName, phoneNumber (unique), email (unique, optional), password (bcrypt), role (String: "CUSTOMER"/"ADMIN") |
| `bookings` | id (cuid), pickupDate, pickupTime, pickupAddress, passengerCount (max 6), carryOnCount, checkedLuggageCount, dropoffTerminal (String: A/B/C/D/E), airline?, departureTime?, phoneNumber, email?, bookingStatus (String: PENDING/CONFIRMED/CANCELLED/COMPLETED), paymentStatus (String: UNPAID/PAID/REFUNDED/FAILED), price (Float default 99.00), qrCode?, userId? |
| `transactions` | id, bookingId (unique FK → bookings), stripePaymentIntent (unique), amount (Int, cents), currency, paymentStatus |

**SQLite database path:**
`C:\Users\sohila\traqq\backend\prisma\prisma\dev.db`
> Note: Prisma resolves SQLite paths relative to the schema file location (`backend/prisma/`), not the project root. So `file:./prisma/dev.db` creates the file at `backend/prisma/prisma/dev.db`.

### Routing Structure (Frontend SPA)

All 20 routes registered in `frontend/router/router.js`:

| Route | Page File |
|---|---|
| `/` | `pages/home.js` |
| `/booking` | `pages/booking.js` |
| `/checkout` | `pages/checkout.js` |
| `/success` | `pages/success.js` |
| `/history` | `pages/history.js` |
| `/booking-details` | `pages/bookingDetails.js` |
| `/login` | `pages/login.js` |
| `/register` | `pages/register.js` |
| `/admin` | `pages/adminDashboard.js` |
| `/admin/bookings` | `pages/adminBookings.js` |
| `/admin/customers` | `pages/adminCustomers.js` |
| `/admin/payments` | `pages/adminPayments.js` |
| `/admin/analytics` | `pages/adminAnalytics.js` |
| `/about` | `pages/about.js` |
| `/how-it-works` | `pages/howItWorks.js` |
| `/contact` | `pages/contact.js` |
| `/faq` | `pages/faq.js` |
| `/terms` | `pages/terms.js` |
| `/privacy` | `pages/privacy.js` |
| `/cancellation-policy` | `pages/cancellationPolicy.js` |

Router features:
- `window.history.pushState()` — no page reloads
- URL search params passed to pages as `{ params }` argument
- `popstate` listener for browser back/forward
- `data-link` attribute on any anchor triggers SPA navigation
- Footer hidden on `/admin` routes (admin has its own layout)
- `window.scrollTo(top)` on each navigation

### API Structure (Backend)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | None | Create account |
| POST | `/api/auth/login` | None | Sign in, returns tokens |
| POST | `/api/auth/refresh` | None | Refresh access token |
| POST | `/api/bookings/create` | Optional | Create booking |
| GET | `/api/bookings/:id` | None | Get single booking |
| PUT | `/api/bookings/:id` | JWT | Update booking |
| DELETE | `/api/bookings/:id` | Admin | Delete booking |
| GET | `/api/bookings` | Admin | List all bookings |
| POST | `/api/payments/create-intent` | None | Create Stripe PaymentIntent |
| POST | `/api/payments/webhook` | Stripe sig | Confirm payment, generate QR |
| GET | `/health` | None | Health check |

### Payment Structure (Stripe)

Flow:
1. User completes booking form → `POST /api/bookings/create` → booking ID stored in `sessionStorage`
2. Checkout page → `POST /api/payments/create-intent` → receives `clientSecret`
3. Frontend mounts Stripe Elements with `clientSecret`
4. User enters card → `stripe.confirmPayment()`
5. Stripe calls `POST /api/payments/webhook` (signed)
6. Webhook handler: updates `bookingStatus=CONFIRMED`, `paymentStatus=PAID`, generates QR, stores in `booking.qrCode`
7. Navigate to `/success`

**Current local dev status:** Stripe keys are placeholders. The checkout page shows a "Simulate Payment (Dev Mode)" button that skips Stripe and navigates directly to `/success`. This button only appears when Stripe.js is unavailable or the PaymentIntent API call fails.

### Authentication Structure

- **Access token:** JWT, 15 min TTL, signed with `JWT_SECRET`
- **Refresh token:** JWT, 7 day TTL, signed with `JWT_REFRESH_SECRET`
- **Storage:** `localStorage` keys: `traqq_access_token`, `traqq_refresh_token`, `traqq_user` (JSON)
- **API injection:** `services/api.js` reads `traqq_access_token` and adds `Authorization: Bearer <token>` header automatically
- **Admin detection:** `utils/auth.js` → `isAdmin()` checks `traqq_user.role === 'ADMIN'`
- **Logout:** Clears all three localStorage keys, redirects to `/`

### Admin Dashboard Structure

5 admin pages, all using shared `utils/adminLayout.js` for sidebar:
- **Dashboard** (`/admin`): stat cards (total bookings, revenue, confirmed count, today's rides), recent bookings table, quick action links
- **Bookings** (`/admin/bookings`): full table with search + status filter, Confirm/Cancel action buttons (calls `PUT /api/bookings/:id`)
- **Customers** (`/admin/customers`): derived from bookings data — phone, email, booking count, total spend
- **Payments** (`/admin/payments`): revenue stats, payment status filter, Stripe intent display
- **Analytics** (`/admin/analytics`): CSS-only bar charts — daily rides (last 7 days), daily revenue (last 7 days), bookings by terminal

All admin pages call `GET /api/bookings` which requires a valid admin JWT. Without an admin token, pages show a 401 error message.

---

## 3. Completed Work Log

### Session 16 — QR Final Audit + Fixes (2026-05-31)

**Action:** Final 9-point QR audit. Fixed QR URL encoding, sessionStorage persistence, and a pre-existing broken import in adminDashboard.js.

**Issues found and fixed:**

| # | Issue | Fix |
|---|---|---|
| 1 | QR encoded raw JSON, not a URL — scanner showed JSON text | Changed `generateQR()` to encode `${FRONTEND_URL}/verify-booking?id=${bookingId}` |
| 2 | QR URL was hardcoded to localhost | Now uses `process.env.FRONTEND_URL` — set to prod domain in `.env` for deployment |
| 3 | `sessionStorage.removeItem('traqq_booking_id')` removed ID after first success page load | Removed that line — ID now persists for the session; new bookings overwrite it naturally |
| 4 | `adminDashboard.js` imported `isAdmin` from `router.js` which doesn't export it | Removed the unused `isAdmin` import — was silently breaking the admin dashboard load |

**Files modified:**

| File | Change |
|---|---|
| `backend/src/controllers/booking.controller.js` | `generateQR()` now encodes `${FRONTEND_URL}/verify-booking?id=<bookingId>` |
| `frontend/pages/success.js` | Removed `sessionStorage.removeItem('traqq_booking_id')` so page works on refresh |
| `frontend/pages/adminDashboard.js` | Removed `isAdmin` from import (not exported by router.js, not used anywhere in file) |

**9-point audit results:**

| # | Check | Result |
|---|---|---|
| 1 | QR URL format | `http://localhost:3000/verify-booking?id=<bookingId>` (URL, not JSON) ✅ |
| 2 | Production domain | Uses `FRONTEND_URL` env var — change to `https://yourdomain.com` in `.env` for prod ✅ |
| 3 | Valid only when CONFIRMED+PAID | `valid: true` only when both conditions met ✅ |
| 4 | No sensitive data in response | Keys: `ref, tripDirection, pickupDate, pickupTime, terminal, passengerCount, paymentStatus, bookingStatus` — no phone, email, address, Stripe data ✅ |
| 5 | Works after refreshing success page | `traqq_booking_id` persists in sessionStorage; page re-fetches and re-displays QR ✅ |
| 6 | Admin QR status column | Shows "✓ Ready" (green) for PAID+CONFIRMED bookings with qrCode; "—" for others ✅ |
| 7 | Unpaid/failed returns valid:false | PENDING+UNPAID: `valid:false`; FAILED payment: `valid:false` ✅ |
| 8 | QR generated only once | Webhook guard: `qrCode = booking.qrCode \|\| await generateQR(bookingId)` — reuses existing ✅ |
| 9 | Documented in memory.md | This entry ✅ |

**Production deployment checklist for QR:**
```
# In backend/.env — change this line for production:
FRONTEND_URL=https://yourdomain.com
# QR will then encode: https://yourdomain.com/verify-booking?id=<bookingId>
```

**Bonus fix:** `adminDashboard.js` was importing `isAdmin` from `router.js` but `router.js` only exports `initRouter` and `navigate`. This caused a silent ES module import error that prevented the admin dashboard from rendering. Fixed by removing the unused import.

---

### Session 15 — QR Code System Verification + Completion (2026-05-31)

**Action:** Audited and completed the QR code system end-to-end. Fixed QR payload, added duplicate prevention, added verify endpoint and frontend page.

**Files modified:**

| File | Change |
|---|---|
| `backend/src/controllers/booking.controller.js` | Fixed `generateQR()` — removed `phoneNumber` param, payload now `{ ref, id, ts }` (no sensitive data). Added QR options: `errorCorrectionLevel:M, margin:2, width:300`. Added `verifyBooking()` controller function. Exported `verifyBooking`. |
| `backend/src/controllers/payment.controller.js` | Fixed webhook: removed `booking.phoneNumber` from `generateQR()` call. Added explicit early-return guard if booking is already CONFIRMED+PAID+hasQR. Added `qrCode = booking.qrCode || await generateQR(bookingId)` to reuse existing QR if present. |
| `backend/src/routes/booking.routes.js` | Added `GET /verify/:id` route (placed before `/:id` to avoid route shadowing). Imported `verifyBooking`. |
| `frontend/router/router.js` | Added `/verify-booking` route → `pages/verifyBooking.js`. |
| `frontend/pages/verifyBooking.js` | New file. Reads `?id=` param, calls `api.get('/bookings/verify/:id')`. Shows green "Booking Verified" card with ref/direction/date/time/terminal/passengers for valid bookings; red "Verification Failed" card for invalid/not found. |
| `frontend/pages/success.js` | Added `bookingRef = 'TRQ-' + id.slice(-8).toUpperCase()` display. Added `departureTime` row to details grid (was missing). Changed "Booking ID" label to "Booking Ref". |
| `frontend/pages/adminBookings.js` | Added "QR" column: shows "✓ Ready" (green) if `b.qrCode` exists, "—" (muted) otherwise. |
| `frontend/assets/css/main.css` | Added `.verify-page`, `.verify-container`, `.verify-icon`, `.verify-title`, `.verify-valid`, `.verify-invalid`, `.verify-subtitle`, `.verify-badge`, `.verify-details`, `.verify-detail-row`, `.verify-detail-label` styles. |

**QR generation flow (complete):**
1. User completes 9-step booking wizard → `POST /api/bookings/create` → `bookingStatus=PENDING, paymentStatus=UNPAID, qrCode=null`
2. Checkout → `POST /api/payments/create-intent` → Stripe PaymentIntent created
3. User enters card → `stripe.confirmPayment()` → Stripe fires webhook
4. `POST /api/payments/webhook` receives `payment_intent.succeeded`
5. Backend checks: if already CONFIRMED+PAID+qrCode → early return (idempotent)
6. Otherwise: `generateQR(bookingId)` → payload `{ ref: "TRQ-XXXXXXXX", id: "<cuid>", ts: <epoch> }` → base64 data URL (300px, M correction)
7. Booking updated: `bookingStatus=CONFIRMED, paymentStatus=PAID, qrCode=<dataURL>`
8. Success page polls up to 6×2s → fetches booking → displays QR image

**QR payload format (new — no sensitive data):**
```json
{ "ref": "TRQ-DMWX77U0", "id": "cmpsvnn3e0001sj3ndmwx77u0", "ts": 1748652000000 }
```
Old (removed): `{ "bookingId": "...", "phone": "2145550099", "ts": ... }` — phone exposed.

**Verify endpoint:**
- `GET /api/bookings/verify/:id` — public, no auth required
- Returns `{ success, valid, booking: { ref, tripDirection, pickupDate, pickupTime, terminal, passengerCount, paymentStatus, bookingStatus } }` for valid bookings
- Returns `{ success, valid: false, message }` for not found / unconfirmed
- Does NOT expose phoneNumber, email, pickupAddress, or payment details

**Verify frontend route:**
- SPA: `/verify-booking?id=<bookingId>`
- Intended usage: drivers scan QR code → opens URL → page verifies booking

**Test results (Playwright + PowerShell):**
- Fake ID (`fakeid123`) → 404 `valid:false` ✓
- Unpaid/PENDING booking → `valid:false, msg: "not confirmed or payment pending"` ✓
- CONFIRMED+PAID booking → `valid:true`, shows ref TRQ-DMWX77U0, date/time/terminal/passengers ✓
- Verify page: green "Booking Verified" with details grid ✓
- Invalid ID page: red "Verification Failed" with back button ✓
- No ID: "No Booking ID" error state ✓
- Success page: `departureTime` row renders when present ✓
- Admin bookings: QR column shows "✓ Ready" for confirmed bookings ✓
- All 6 SPA routes smoke-tested, no console errors ✓

**QR code note for local dev:**
The "Simulate Payment" button in dev mode skips the Stripe webhook, so QR is not auto-generated in simulate flow. To generate QR in dev: use `stripe listen --forward-to localhost:4000/api/payments/webhook` with real Stripe test keys, or manually PUT `bookingStatus=CONFIRMED, paymentStatus=PAID` via authenticated API call + separately call `generateQR()`.

---

### Session 14 — Animation System Upgrade + Cursor Fix (2026-05-31)

**Action:** Fixed airplane cursor shape, upgraded scroll reveal system to multi-variant, made reveals global (router-driven), applied animations across 7 page files.

**Files modified:**

| File | Change |
|---|---|
| `frontend/assets/css/main.css` | Replaced `.reveal` block with full multi-variant system (`.reveal-up`, `.reveal-left`, `.reveal-right`, `.reveal-scale`, `.reveal-image`, `.reveal-delay-4`). Updated `.cursor-plane` CSS (24px, no static rotation). Added micro-interactions: button gold glow hover, nav link animated underline. |
| `frontend/assets/js/main.js` | Replaced Lucide stroke SVG with filled commercial airplane (`fill="currentColor"`). Added direction-based dynamic rotation: `atan2(dy, dx)+90°` converted to `lerpAngle()` with shortest-path normalization. |
| `frontend/router/router.js` | Added `initReveal(root)` global function + `currentRevealObs` module var. Called after every navigation in `navigate()`. Disconnects previous observer before creating new one. |
| `frontend/pages/home.js` | Removed own `initScrollReveal` function (router handles globally now). Removed `revealObs` from cleanup. |
| `frontend/pages/about.js` | Added `reveal-left` to `.about-mission`, `reveal-up reveal-delay-N` to all 12 `.value-card`s, `reveal-scale` to `.about-cta`. |
| `frontend/pages/howItWorks.js` | Added `reveal-left reveal-delay-N` to each `.step-item` (idx 0-4), `reveal-up reveal-delay-N` to `.why-item`s, `reveal-scale` to `.about-cta`. |
| `frontend/pages/faq.js` | Added `reveal-up` to every `.faq-flat-item` (12 items), `reveal-scale` to `.about-cta`. |
| `frontend/pages/success.js` | Added `reveal-scale` to `.success-container`. |
| `frontend/pages/login.js` | Added `reveal-scale` to `.auth-card`. |
| `frontend/pages/register.js` | Added `reveal-scale` to `.auth-card`. |

**Cursor plane fix:**
- Old: Lucide stroke-based "plane" path — thin lines, unclear at 22px, static `-30deg` CSS rotation
- New: Filled top-down commercial airplane SVG (`fill="currentColor"`) — solid shape, clear at 24px
- Rotation: `atan2(dy, dx) * 180/π + 90` converts mouse velocity to heading angle; `lerpAngle()` normalizes diff to `[-180, 180]` for shortest-path interpolation; `lerp factor 0.3` for snappy rotation; only updates when mouse moves >1.5px/frame

**Reveal animation system:**
- `.reveal` / `.reveal-up` — `translateY(36px)` → `none` (850ms cubic-bezier(0.22,1,0.36,1))
- `.reveal-left` — `translateX(-42px)` → `none`
- `.reveal-right` — `translateX(42px)` → `none`
- `.reveal-scale` — `scale(0.93)` → `none`
- `.reveal-image` — `scale(0.97)` → `none` (950ms)
- `.reveal-visible` uses `!important` to override all variant transforms in one rule
- `.reveal-delay-4` — 440ms (new, covers 5-item lists)
- All variants respect `prefers-reduced-motion`

**Global reveal architecture:**
- `initReveal(root)` lives in `router.js`, called on every `navigate()`
- Disconnects previous `IntersectionObserver` before creating new one
- `threshold: 0.08, rootMargin: 0px 0px -20px 0px`
- Above-fold elements reveal immediately on page load; below-fold trigger on scroll
- Works across all pages without per-page JS changes — just add CSS classes to HTML

**Micro-interactions added:**
- `.btn-primary:hover` — gold glow `box-shadow: 0 4px 22px rgba(201,168,76,0.28)`
- `.nav-link::after` — animated underline (`scaleX(0) → scaleX(1)` on hover/active)

**Playwright QA results:**
- Cursor SVG `fill="currentColor"` confirmed ✓
- Home: 16 reveal elements, 0 visible at load ✓
- About: 14 reveal-up/left/scale elements; 1 above-fold visible at load; all 14 after full scroll ✓
- HowItWorks: 5 `.reveal-left` step items ✓
- FAQ: 12 `.reveal-up` faq items ✓
- Login/Register: `.auth-card.reveal-scale.reveal-visible` (above fold, revealed immediately) ✓
- Contact page loads correctly ✓
- Zero console errors ✓

---

### Session 13 — Hero Cleanup, Typewriter, Scroll Reveal, Airplane Cursor (2026-05-31)

**Action:** Improved home hero visual quality and added three new animations: typewriter headline, scroll reveal for sections, and global airplane cursor follower.

**Files modified:**

| File | Change |
|---|---|
| `frontend/assets/css/main.css` | Hero cleanup (background filter, overlay, padding, headline size, sub font). Added `.reveal`/`.reveal-visible`/`.reveal-delay-1/2/3` scroll reveal classes. Added `.hero-typewriter-cursor` + `@keyframes cursor-blink`. Added `.cursor-plane` + `.cursor-plane.visible` + responsive overrides. |
| `frontend/pages/home.js` | Full rewrite: added `data-typewriter` to headline, `.reveal` + delay classes on trust marquee / service cards / why-items / terminals section / FAQ items / final CTA. Added `initTypewriter(root)` and `initScrollReveal(root)` functions. Returns cleanup function that disconnects all observers. |
| `frontend/assets/js/main.js` | Added `initCursorPlane()` global function called once on DOMContentLoaded. |

**Hero changes:**
- `.hero-v2-bg` — added `filter: brightness(0.45) saturate(0.65)` — dims and desaturates background image graphics/text
- `.hero-v2-overlay` — changed from diagonal `135deg` to vertical `180deg` gradient, reduced opacity bands so background image is still faintly visible
- `.hero-v2-inner` — padding increased from `9rem 1.5rem 7rem` → `11rem 1.5rem 9rem` (more breathing room)
- `.hero-v2-text .hero-headline` — font-size reduced from `clamp(2.8rem, 7vw, 5.5rem)` → `clamp(2.4rem, 5.5vw, 4.75rem)`. Line-height 1.0 → 1.1. Letter-spacing -0.02em → -0.03em. Added `min-height: 2.4em` to prevent layout jump during typewriter.
- `.hero-v2-text .hero-sub` — font-size 1.15rem → 1.05rem. max-width 580px → 500px. Margin bottom 2rem → 2.5rem.
- Hero sub copy shortened: removed "punctual, and professional" — now just "Smooth service to or from DFW Airport."

**Typewriter implementation:**
- Attribute: `data-typewriter` on `.hero-headline` (no value, just a flag)
- JS: `initTypewriter(root)` in `home.js`
- Flow: parses existing `innerHTML` to extract chars and `<br>` positions → immediately clears headline → appends `.hero-typewriter-cursor` span → types one character every ~52-82ms (random variation) → on `<br>` inserts actual `<br>` element with 110ms pause → after last char: `.done` class added to cursor (blinks 3×) → cursor removed after 3000ms
- Starts at 90ms delay (syncs with page fade-in so user watches text type as page appears)
- Respects `prefers-reduced-motion`: if set, skips clearing and typing (keeps full text visible)
- Returns cancel function → called in cleanup when user navigates away

**Scroll reveal implementation:**
- CSS: `.reveal` → `opacity: 0; transform: translateY(30px); transition: 750ms cubic-bezier(0.22,1,0.36,1)`. `.reveal-visible` → `opacity: 1; transform: none`. Delay classes: `-delay-1` (110ms), `-delay-2` (220ms), `-delay-3` (330ms)
- `@media (prefers-reduced-motion: reduce)`: `.reveal { opacity: 1; transform: none; transition: none; }`
- JS: `initScrollReveal(root)` — IntersectionObserver at threshold 0.08 + rootMargin 0 0 -20px 0. Observes all `.reveal` elements. Adds `reveal-visible` when intersecting, then unobserves. Returns the observer for cleanup.
- Elements with `.reveal`: `.trust-marquee`, `.service-card` (×4 with delays), `.why-item` (×6 with delays), `.terminals-section`, `.faq-preview-item` (×3 with delays), `.final-cta`
- BRIM section intentionally excluded (has its own step stagger animation)

**Airplane cursor implementation:**
- CSS: `.cursor-plane` fixed-position, 22×22px, `pointer-events: none`, `z-index: 9999`, gold color. `.visible` → `opacity: 0.72`. SVG rotated `-30deg`, gold drop-shadow.
- Hidden via `@media (hover: none)` and `@media (pointer: coarse)` (touch screens) + `prefers-reduced-motion`
- JS: `initCursorPlane()` in `main.js` — called once at `DOMContentLoaded`. Creates `.cursor-plane` div with Lucide plane SVG (inline). rAF loop lerps cursor position at 0.13 factor for smooth lag. `mousemove` adds `.visible`; `mouseleave` removes it. Skips init if `hover: none`, `pointer: coarse`, or `prefers-reduced-motion`.

**Playwright QA results:**
- `.hero-v2-bg` computed filter: `brightness(0.45) saturate(0.65)` ✓
- Headline text at 200ms (mid-typing): "Door-to-Do" — typewriter working ✓
- Headline text at 2500ms: "Door-to-DoorDFW Shuttle" — full text typed ✓
- `.cursor-plane` found in DOM ✓
- 16 `.reveal` elements, all hidden at load ✓
- After scroll to 800px: 5 visible ✓
- After scroll to bottom: all 16 visible ✓
- Zero console errors ✓
- Computed font-size: 70.4px (~4.4rem at 1280px viewport) ✓ (within clamp range)

---

### Session 12 — Full Feature Audit + tripDirection Implementation (2026-05-30)

**Action:** Performed complete feature audit across frontend, backend, database, Stripe, QR code, admin, and security. Implemented all gaps found.

**Audit results:**

| # | Feature | Before | After |
|---|---|---|---|
| 1 | Private shuttle booking flow | PASS | PASS |
| 2 | Flat $99 price | PASS | PASS |
| 3 | Maximum 6 passengers | PASS | PASS |
| 4 | Pickup date (4-digit year, valid calendar) | PASS | PASS |
| 5 | Pickup time in 30-min intervals | PASS | PASS |
| 6 | Pickup address | PASS | PASS |
| 7 | Passenger count | PASS | PASS |
| 8 | Carry-on luggage count | PASS | PASS |
| 9 | Checked luggage count | PASS | PASS |
| 10 | DFW terminal selection | PASS | PASS |
| 11 | Airline (optional) | PASS | PASS |
| 12 | Flight departure time (optional) | PASS | PASS |
| 13 | Contact information (phone required, email optional) | PASS | PASS |
| 14 | **Trip direction (TO_DFW / FROM_DFW)** | **FAIL** | **PASS** |
| 15 | QR code generation after payment | PASS | PASS |
| 16 | Booking confirmation page | PASS | PASS |
| 17 | Stripe payment integration | PASS | PASS |
| 18 | Payment success handling (webhook) | PASS | PASS |
| 19 | **Payment failure handling (webhook)** | **FAIL** | **PASS** |
| 20 | **Duplicate PaymentIntent prevention** | **PARTIAL** | **PASS** |
| 21 | Duplicate booking slot prevention | PASS | PASS |
| 22 | Backend booking storage | PASS | PASS |
| 23 | Database persistence | PASS | PASS |
| 24 | **Admin shows trip direction** | **FAIL** | **PASS** |
| 25 | Address storage | PASS | PASS |
| 26 | Security validation (Zod, Helmet, CORS, rate limiting) | PASS | PASS |
| 27 | Rate limiting | PASS | PASS |
| 28 | Error handling | PASS | PASS |
| 29 | No exposed sensitive keys | PASS | PASS |
| 30 | **Success page shows luggage counts** | **PARTIAL** | **PASS** |
| 31 | **Success page shows trip direction** | **FAIL** | **PASS** |
| 32 | **Checkout summary shows trip direction** | **FAIL** | **PASS** |
| 33 | Responsive layout | PASS | PASS |
| 34 | No console errors | PASS | PASS |
| 35 | No broken routes (all 20 routes → 200) | PASS | PASS |

**Files modified:**

| File | Change |
|---|---|
| `backend/prisma/schema.prisma` | Added `tripDirection  String  @default("TO_DFW")` to Booking model |
| `backend/src/controllers/booking.controller.js` | Added `tripDirection: z.enum(['TO_DFW', 'FROM_DFW'])` as first field in Zod schema |
| `backend/src/controllers/payment.controller.js` | Full rewrite: added idempotency check (reuse existing PaymentIntent if UNPAID, create fresh if canceled, 400 if already PAID); added `payment_intent.payment_failed` webhook handler |
| `frontend/pages/booking.js` | Full rewrite: 9-step wizard (was 8); Trip Direction added as step 0 with `TO_DFW`/`FROM_DFW` direction buttons; all step numbers shifted +1; direction shown in summary panel |
| `frontend/pages/success.js` | Added Direction row and Luggage row to booking detail grid |
| `frontend/pages/checkout.js` | Added Direction row to order summary panel |
| `frontend/pages/adminBookings.js` | Added Direction column (To DFW / From DFW) to bookings table |
| `frontend/assets/css/main.css` | Added `.direction-grid`, `.direction-btn`, `.direction-label`, `.direction-sub` CSS; added `.direction-grid` mobile collapse in 480px breakpoint |
| `README.md` | Full rewrite: updated booking flow to 9 steps, added tripDirection docs, added Stripe idempotency docs, added payment failure webhook docs, updated schema table, added production security checklist |

**Database changes:**
- `npx prisma generate` → regenerated Prisma Client with `tripDirection` field
- `npx prisma db push` → added `tripDirection` column to SQLite `dev.db` with `"TO_DFW"` default for all existing rows

**Booking wizard step structure (new):**
- Step 1: Trip Direction (TO_DFW / FROM_DFW) ← NEW
- Step 2: Pickup Date
- Step 3: Pickup Time
- Step 4: Pickup Address
- Step 5: Passengers
- Step 6: Luggage
- Step 7: Terminal
- Step 8: Flight Details
- Step 9: Contact

**Backend validation:**
- `tripDirection: z.enum(['TO_DFW', 'FROM_DFW'])` — required; rejects `"INVALID"` with 400; rejects missing with 400 "Required"
- Backend test: `TO_DFW` booking → `tripDirection: "TO_DFW"` stored ✓
- Backend test: `FROM_DFW` booking → `tripDirection: "FROM_DFW"` stored ✓

**Payment idempotency (new logic in payment.controller.js):**
- If Transaction exists + `PAID` → return 400 "This booking has already been paid."
- If Transaction exists + `UNPAID` → retrieve existing Stripe PaymentIntent and return its clientSecret
- If existing PaymentIntent is `canceled` → create fresh intent, update Transaction record
- If no Transaction exists → create PaymentIntent + Transaction as before

**Payment failure webhook (new):**
- `payment_intent.payment_failed` → `Transaction.paymentStatus = 'FAILED'`, `Booking.paymentStatus = 'FAILED'`

**Playwright QA verified:**
- Step 1 of 9: "Trip Direction" label, two buttons ("To DFW Airport" / "From DFW Airport") ✓
- Step 2 of 9: "Pickup Date" with date input ✓
- Summary panel shows "Direction" after selecting ✓
- Checkout summary shows "Direction" ✓
- All 6 routes return HTTP 200 ✓
- Zero page errors ✓

---

### Session 19 — Admin Access Denied Fix + Seed Script (2026-05-31)

**Issue:** Admin dashboard showed "Access Denied" when a non-admin user was already logged in. The page had no way to switch accounts.

**Root cause:**
The user had a non-admin account (role: `CUSTOMER`) stored in `localStorage`. The `adminLayout.js` auth guard showed "Access Denied" but the page had only a "Back to Website" link — no logout button, no way to switch to the admin account without manually clearing localStorage.

The database and auth code were all correct:
- `admin@traqq.local` / `Admin@123456` existed with role `ADMIN` ✓
- Login endpoint returns `{ user: { id, fullName, email, role }, accessToken, refreshToken }` ✓
- `isAdmin()` correctly checks `role === 'ADMIN'` ✓
- JWT includes `{ id, role }` in payload ✓

**Files modified:**

| File | Change |
|---|---|
| `frontend/utils/adminLayout.js` | Access Denied screen now shows: current account email, "Sign Out & Switch Account" button (clears all localStorage keys, redirects to `/login`), and "Back to Website" link. Sign In Required screen updated with cleaner icon (lock instead of shield-x). |
| `backend/prisma/seed.js` | NEW — copy of seed-admin.js at the conventional Prisma seed location. Creates `admin@traqq.local` / `Admin@123456` with bcrypt hash. Idempotent (skips if exists, upgrades role if not ADMIN). |
| `backend/package.json` | Added `"seed:admin": "node prisma/seed.js"` script. |
| `README.md` | Replaced outdated "Default Test Credentials" section with full "Admin Dashboard" section: seed command, login instructions, admin routes table, security description. Updated admin routes table in page routes section to include all 7 routes. |

**Seed script:** `backend/prisma/seed.js` (also at `backend/seed-admin.js` for backwards compat)

**How to use after this fix:**
1. `cd backend && npm run seed:admin` (or `node prisma/seed.js`) — creates admin@traqq.local
2. Open http://localhost:3000/login → enter admin@traqq.local / Admin@123456
3. Automatically redirected to http://localhost:3000/admin
4. If already logged in as wrong user → click "Sign Out & Switch Account" on the Access Denied page

**Test results:**
- `npm run seed:admin` → "Admin already exists: Role: ADMIN" ✓
- Login API → user.role = ADMIN, JWT payload includes role:ADMIN ✓
- `/api/admin/overview` with admin JWT → 200, stats returned ✓
- All 12 verification checks pass ✓

---

### Session 18 — Register Form Validation + Raw JSON Error Fix (2026-05-31)

**Issue:** Register page displayed raw Zod error JSON like `[{"code":"too_small","minimum":10,...}]` when phone number was invalid.

**Root cause (exact chain):**
1. `registerSchema.parse(req.body)` throws `ZodError`
2. The `catch` block in `auth.controller.js` only handled `P2002` (duplicate), then called `next(err)` for everything else
3. Global error handler did `res.json({ error: err.message })` — `ZodError.message` is the raw stringified Zod issues array
4. `api.js` did `throw new Error(err.error)` — that raw JSON string becomes the Error message
5. `register.js` set `errEl.textContent = err.message` — raw JSON rendered to the user

**Files modified:**

| File | Change |
|---|---|
| `backend/src/controllers/auth.controller.js` | Added `friendlyZodError(issues)` helper that maps Zod issue codes + field paths to user-friendly messages. `register()` now catches `err.name === 'ZodError'` and returns `{ success, message, errors: { fieldName: "friendly msg" } }`. `P2002` Prisma duplicate error now returns structured `errors` with field-specific message (email vs phone). `login()` also fixed to catch ZodError. |
| `backend/server.js` | Added ZodError check to global error handler as safety net: any `ZodError` that reaches the handler returns clean `{ error: "Invalid request data. Please check your input." }` instead of raw Zod JSON. |
| `frontend/services/api.js` | `request()` now attaches full parsed response body to `err.response` and HTTP status to `err.status`. Error message prefers `data.message` over `data.error`. Backwards compatible — existing code using `err.message` is unchanged. |
| `frontend/pages/register.js` | Full rewrite. Added field wrappers `<div class="form-field">` and `<p class="auth-field-error" id="err-FIELD">` error slots under each input. Phone input: `inputmode="tel"`, `maxlength="15"`, real-time digit-only sanitization via `input` event (`replace(/\D/g,'').slice(0,15)`). Client-side `validateFields()` runs before API call with specific messages per field. On API error: reads `err.response.errors` (structured backend errors), calls `setError(field, msg)` for each field, focuses first invalid. Keeps all field values on failed submit. |
| `frontend/assets/css/main.css` | Added `.auth-form .form-field`, `.auth-field-error`, `.auth-field-error.visible`, `.auth-field-hint` classes after existing auth styles. `.form-input.input-error` for red border already existed. |

**Friendly message mapping (backend):**

| Field | Zod code | Message |
|---|---|---|
| `fullName` | `too_small` | "Full name must be at least 2 characters." |
| `fullName` | `invalid_type` | "Please enter your full name." |
| `phoneNumber` | `too_small` | "Phone number must be at least 10 digits." |
| `phoneNumber` | `invalid_type` | "Please enter your phone number." |
| `email` | `invalid_string` | "Please enter a valid email address." |
| `password` | `too_small` | "Password must be at least 8 characters." |
| Duplicate phone | P2002 | "An account with this phone number already exists." |
| Duplicate email | P2002 | "An account with this email already exists." |

**Phone number validation:**
- Real-time: `phoneInput.addEventListener('input', ...)` strips non-digits instantly with `replace(/\D/g, '')`
- Client-side: rejects non-numeric, requires min 10 digits
- Backend: Zod `z.string().min(10)` still enforces minimum
- Placeholder changed from "+1 (214) 555-0000" → "2145550000" (makes digits-only expectation clear)

**Test results (verified via PowerShell API calls):**
- Short phone (7 digits) → `{ "phoneNumber": "Phone number must be at least 10 digits." }` ✓
- Bad email format → `{ "email": "Please enter a valid email address." }` ✓
- Short password → `{ "password": "Password must be at least 8 characters." }` ✓
- Missing fullName → `{ "fullName": "Please enter your full name." }` ✓
- Empty body → All 3 required field errors ✓
- Duplicate phone → `{ "phoneNumber": "An account with this phone number already exists." }` ✓
- Valid data → Account created, JWT returned ✓
- No raw Zod JSON in any error response ✓ (verified with regex match)
- All 8 frontend checks pass ✓ (phone sanitization, error slots, inputmode, err.response)

---

### Session 17 — Admin Dashboard Blank Page Debug + Fix (2026-05-31)

**Issue:** `/admin` displayed a completely blank black page.

**Root cause (exact chain):**
1. `router.js` adds `page-enter` class to `pageRoot` → sets `opacity: 0` via CSS
2. `adminDashboard()` calls `adminLayout()`, which renders "Sign In Required" into the DOM
3. `adminDashboard` continues running and makes API calls (`/api/admin/overview`, `/api/bookings`)
4. Both API calls fail with **401 Unauthorized** (no admin token stored) → enter `catch` block
5. Catch block executes `root.querySelector('#stats-grid').innerHTML = ...` → `#stats-grid` does NOT exist in the "Sign In Required" page → `null.innerHTML = ...` → **TypeError**
6. TypeError propagates up through the async function chain uncaught
7. Back in `router.js`, the `await mod.default(...)` throws → the `requestAnimationFrame(() => pageRoot.classList.remove('page-enter'))` line **never executes**
8. `pageRoot` keeps `opacity: 0` from the `page-enter` class permanently → page is **visually blank** even though content IS in the DOM

**Secondary issue:**
`adminLayout.js` had `import { navigate } from '../router/router.js'` — an **unused static import** creating a circular dependency (`router → adminDashboard → adminLayout → router`). This was dead code and could cause module initialization warnings.

**Files modified:**

| File | Fix |
|---|---|
| `frontend/utils/adminLayout.js` | Removed unused `import { navigate }` circular import. Changed return type: returns `false` if auth guard fired, `true` if full layout rendered. Added explicit `color: var(--white)` to `h2` elements in access denied page. |
| `frontend/pages/adminDashboard.js` | Added `const rendered = adminLayout(...)`. Added `if (!rendered) return` guard immediately after. Rewrote catch block to use `showError(msg)` helper that null-checks both `#stats-grid` and `#recent-bookings` before touching them. |
| `frontend/pages/adminBookings.js` | Added `const rendered = adminLayout(...)` + `if (!rendered) return` guard. |
| `frontend/pages/adminCustomers.js` | Added `const rendered = adminLayout(...)` + `if (!rendered) return` guard. |
| `frontend/pages/adminPayments.js` | Added `const rendered = adminLayout(...)` + `if (!rendered) return` guard. |
| `frontend/pages/adminAnalytics.js` | Added `const rendered = adminLayout(...)` + `if (!rendered) return` guard. |
| `frontend/pages/adminBookingDetails.js` | Removed `import { navigate }` (used `window.location.href` for page refresh instead). Added `const rendered = adminLayout(...)` + `if (!rendered) return` guard. |
| `frontend/pages/adminSettings.js` | Added `const rendered = adminLayout(...)` + `if (!rendered) return` guard. |
| `frontend/router/router.js` | Wrapped `mod.default(pageRoot, ...)` in `try/catch/finally`. The `finally` block **always** calls `requestAnimationFrame(() => pageRoot.classList.remove('page-enter'))`, so the page is never stuck at `opacity: 0` regardless of any error. Added fallback HTML if a page throws without rendering anything. |
| `frontend/assets/css/main.css` | Added `color: var(--white)` to `.admin-access-card h2` (was missing explicit color). |

**Testing verification:**
- `GET /api/admin/overview` → 401 without token ✓ | 200 with admin JWT, returns 12 stats ✓
- `GET /api/bookings` (admin) → 17 bookings returned ✓
- `PATCH /api/admin/bookings/:id/status` → updates status successfully ✓
- All 11 file checks pass: circular import removed, `return false/true`, all guards present, router `finally` block ✓
- Admin test user created: `admin@traqq.test` / `AdminPass123!` — role set to `ADMIN` via Prisma

**How to set up admin access for a new user:**
1. Register via `/register` or `POST /api/auth/register`
2. Run in `backend/` dir: `node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.update({where:{email:'your@email.com'},data:{role:'ADMIN'}}).then(u=>console.log(u.role)).finally(()=>p.\$disconnect())"`
3. OR use `npx prisma studio` to edit the role field manually

---

### Session 16 — Premium Admin Dashboard Overhaul (2026-05-31)

**Action:** Complete rewrite of the admin dashboard into a premium, secure, professional operations panel. Added 2 new pages, new backend endpoints, mobile sidebar, auth guard, stat cards with icons, full booking tables, and more.

**Files created:**

| File | Purpose |
|---|---|
| `backend/src/controllers/admin.controller.js` | `getOverview()` — returns 12 aggregated stats (total, confirmed, pending, cancelled, completed, paid, unpaid, failed, revenue, withQR, todayRides, weeklyRides, monthlyRides). `updateBookingStatus()` — PATCH endpoint for status changes (CONFIRMED/CANCELLED/COMPLETED/PENDING). |
| `backend/src/routes/admin.routes.js` | Admin route file: all routes protected by `authenticate + requireAdmin`. Registers `GET /overview` and `PATCH /bookings/:id/status`. |
| `frontend/pages/adminBookingDetails.js` | Full booking detail view at `/admin/booking-details?id=`. Shows: booking summary card, customer info, passengers/luggage, payment card with Stripe intent (safe partial display), QR code or placeholder, admin action buttons (confirm/cancel/complete). |
| `frontend/pages/adminSettings.js` | Settings display at `/admin/settings`. Shows: business info card, platform config card (pricing rules), integrations card (backend health, Stripe key status, webhook reminder), admin account card. Fetches `/api/config` and `/health` to show live status indicators. |

**Files modified:**

| File | Change |
|---|---|
| `backend/server.js` | Added `require('./src/routes/admin.routes')` and `app.use('/api/admin', adminRoutes)`. |
| `frontend/services/api.js` | Added `patch: (path, body) => request('PATCH', path, body)` method. |
| `frontend/utils/adminLayout.js` | Full rewrite: auth guard (redirects non-admin, shows access denied), logo.png in sidebar, Settings/Back to Website/Logout nav links, mobile hamburger with overlay, topbar with date chip, "View Site" button, user avatar + name chip. |
| `frontend/pages/adminDashboard.js` | Full rewrite: uses `GET /api/admin/overview` for 7 stat cards with icons (Total Bookings, Confirmed, Pending, Revenue, Today's Rides, Failed Payments, QR Generated). Recent bookings table shows ref, customer, direction, date, terminal, payment badge, status badge, view button. |
| `frontend/pages/adminBookings.js` | Full rewrite: 16-column table (ref, direction, date, time, address, terminal, pax, carry-on, checked, phone, email, payment badge, status badge, QR, created, actions). 5 filters (search, booking status, payment status, direction, terminal). Confirmation modal before status changes. Actions: confirm, cancel, complete, view details. |
| `frontend/pages/adminCustomers.js` | Full rewrite: 3 stat cards (total customers, revenue, repeat customers). Table with sort (most bookings / highest spend / most recent). Search by name/phone/email. Shows: name, phone, email, total bookings, paid rides, total spent, last booking date, last payment status. |
| `frontend/pages/adminPayments.js` | Full rewrite: 4 stat cards (revenue, successful, pending, failed). Scrollable table with booking ref, phone, amount, currency, payment badge, booking status badge, Stripe intent (safe partial), created date, view link. Payment status filter. |
| `frontend/pages/adminAnalytics.js` | Full rewrite: 4 stat cards (total, revenue, conversion rate, confirmed). 6 charts: daily rides (last 7 days), daily revenue (last 7 days), bookings by terminal (A-E), trip direction split, booking status breakdown, payment status breakdown. Mini-pie legend for status breakdowns. |
| `frontend/router/router.js` | Added routes `/admin/booking-details` → `adminBookingDetails.js` and `/admin/settings` → `adminSettings.js`. Updated `ADMIN_ROUTES` array to include new routes. Fixed `navigate()` to strip query string before route lookup (pathname/queryString split). Fixed `popstate` and initial load to include `location.search`. |
| `frontend/assets/css/main.css` | Full admin CSS section rewrite (~400 lines). New: mobile sidebar with `transform: translateX(-100%)` + `.open` toggle, `.admin-sidebar-overlay`, `.admin-hamburger`, premium sidebar logo styles. New topbar elements: `.admin-topbar-left/right`, `.admin-date-chip`, `.admin-view-site-btn`, `.admin-user-chip/avatar/name`. Stat cards with icon: `.stat-card-icon` (gold, green, red, blue, muted variants). Action buttons: `.btn-view-link` (gold pill link), `.btn-complete` (blue). Status badges: `.status-paid`, `.status-unpaid`, `.status-failed`, `.status-refunded`. Modal: `.admin-modal-overlay`, `.admin-modal`. Auth guard page: `.admin-access-denied/card`. Detail page: `.admin-detail-grid/card/row`. Settings page: `.admin-settings-grid/card/row`. Status indicators with colored dots. Responsive breakpoints: 1100px (7-grid → 3col), 960px (mobile sidebar + hamburger), 600px (compact), 400px (single col). |

**Admin routes (complete):**

| Route | File | Description |
|---|---|---|
| `/admin` | `adminDashboard.js` | Overview with 7 stat cards + recent bookings |
| `/admin/bookings` | `adminBookings.js` | Full booking table with 5 filters + actions |
| `/admin/booking-details?id=` | `adminBookingDetails.js` | Single booking detail view + status actions |
| `/admin/customers` | `adminCustomers.js` | Customer list derived from bookings |
| `/admin/payments` | `adminPayments.js` | Payment tracking + revenue stats |
| `/admin/analytics` | `adminAnalytics.js` | Charts: daily rides/revenue, terminals, direction, status breakdowns |
| `/admin/settings` | `adminSettings.js` | Business info, platform config, integration status |

**New backend endpoints:**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/admin/overview` | Admin JWT | Returns 12 aggregated stats for dashboard |
| `PATCH` | `/api/admin/bookings/:id/status` | Admin JWT | Update booking status (CONFIRMED/CANCELLED/COMPLETED/PENDING) |

**Auth protection status:**
- Frontend: `adminLayout.js` checks `getUser()` + `isAdmin()` before rendering any page. Shows "Sign In Required" or "Access Denied" card with redirect.
- Backend: All `/api/admin/*` endpoints require `authenticate` + `requireAdmin` middleware. Returns 401/403 without valid admin JWT.
- Both layers enforced — frontend guard is UX only, backend guard is security.

**Security notes:**
- Stripe secret key never exposed — only publishable key via `/api/config`
- Stripe intent IDs truncated to 22+ chars in display (safe identifier, not secret)
- QR images show only confirmed + paid bookings
- No sensitive payment data (card numbers, CVVs, full intents) exposed anywhere

**Router fixes (Session 16):**
- `navigate(path)` now splits path on `?` before route lookup: `routes[pathname]` instead of `routes[path]`
- `popstate` listener now uses `location.pathname + location.search` (was `location.pathname` only)
- Initial load now uses `location.pathname + location.search` too
- All pages with `?id=` params (booking-details, verify-booking, admin/booking-details) now work correctly on direct URL load and browser back/forward

**Testing verification:**
- `GET /api/admin/overview` → 401 (no token) ✓
- `PATCH /api/admin/bookings/fake/status` → 401 (no token) ✓
- Backend health: `{ status: 'ok', service: 'TRAQQ API' }` ✓
- All 7 admin routes registered in router ✓
- All 7 admin routes in ADMIN_ROUTES (footer hidden) ✓

---

### Session 1 — Initial Scaffold (2026-05-30)

**Action:** Built full TRAQQ project scaffold from SRS document.

**What was done:**
- Created complete directory structure for frontend and backend
- Wrote `backend/package.json` with all dependencies
- Wrote `backend/prisma/schema.prisma` (PostgreSQL target)
- Wrote `backend/server.js` — Express with Helmet, CORS, rate limiting
- Wrote all backend controllers: `auth.controller.js`, `booking.controller.js`, `payment.controller.js`
- Wrote all backend routes and middleware
- Wrote `frontend/index.html` (SPA shell)
- Wrote `frontend/router/router.js` (initial 5 routes)
- Wrote `frontend/components/navbar.js`
- Wrote `frontend/pages/home.js`, `booking.js`, `checkout.js`, `success.js`, `history.js`
- Wrote `frontend/services/api.js`, `stripe.js`
- Wrote `frontend/assets/css/main.css` (initial premium design, 13 KB)
- Created `backend/.env.example` with all required variable placeholders
- Created `SETUP.md`

**Files created:** All initial files listed in Section 2.

**Result:** Full project scaffold in place. Not yet running locally.

---

### Session 2 — Local Dev Setup (2026-05-30)

**Action:** Got the project running on localhost.

**Issues found and fixed:**

| Issue | Fix |
|---|---|
| PostgreSQL not installed (no `psql`, no Docker) | Switched Prisma schema provider to `"sqlite"` |
| Prisma SQLite does not support `@db.Decimal(10, 2)` native type | Removed annotation, changed field type to `Float` |
| Prisma SQLite does not support enum types | Changed all enum fields to `String` with string defaults; removed enum declarations from schema |
| `npx serve` prompts for install confirmation (interactive — can't be automated) | Wrote `frontend/frontend-server.js` — 40-line Node.js static server with correct MIME types and SPA fallback routing |
| `Start-Process` can't directly run `.cmd` files on Windows PowerShell 5.1 | Used `Start-Process node` directly for both servers |

**Commands run:**
```bash
cd backend
npm install                  # installed 155 packages, 0 vulnerabilities
npx prisma generate          # generated Prisma Client v5.22.0
npx prisma db push           # created SQLite dev.db
node server.js               # started backend on port 4000
cd ..
node frontend-server.js      # started frontend on port 3000
```

**Files created/modified:**
- `backend/prisma/schema.prisma` → switched to SQLite
- `backend/.env` → created with placeholder values (not committed)
- `frontend-server.js` → created in project root
- `backend/prisma/prisma/dev.db` → SQLite database created by Prisma

**Verification results:**
- Backend health: `GET /health` → `{"status":"ok","service":"TRAQQ API"}` ✓
- Booking API: `POST /api/bookings/create` → returned booking with correct fields and `price: 99` ✓
- Auth guard: `GET /api/bookings` (no token) → 401 ✓
- Frontend: `GET /` → 200, correct HTML title ✓
- CSS served as `text/css; charset=utf-8` ✓
- JS modules served as `application/javascript; charset=utf-8` ✓
- SPA fallback: `/booking` → 200 with `index.html` ✓

**README.md:** Created with full local setup guide.

---

### Session 3 — All Pages Added (2026-05-30)

**Action:** Extended from 5 pages to 20 pages covering the full booking platform.

**New files created:**

| File | Purpose |
|---|---|
| `frontend/components/footer.js` | Full site footer with all navigation links |
| `frontend/utils/auth.js` | Auth utilities: getUser, getToken, isAdmin, logout, saveBookingToHistory, showToast |
| `frontend/utils/adminLayout.js` | Shared admin sidebar layout (used by all 5 admin pages) |
| `frontend/pages/login.js` | Sign-in form with JWT storage |
| `frontend/pages/register.js` | Registration form with JWT storage |
| `frontend/pages/bookingDetails.js` | Lookup booking by ID or use `?id=` query param |
| `frontend/pages/adminDashboard.js` | Stats + recent bookings + quick actions |
| `frontend/pages/adminBookings.js` | Full booking table with confirm/cancel |
| `frontend/pages/adminCustomers.js` | Customer list derived from bookings |
| `frontend/pages/adminPayments.js` | Revenue stats + payment tracking |
| `frontend/pages/adminAnalytics.js` | CSS bar charts (7-day rides, revenue, terminal breakdown) |
| `frontend/pages/about.js` | About TRAQQ |
| `frontend/pages/howItWorks.js` | 5-step process |
| `frontend/pages/contact.js` | Contact form (simulated send) + contact info |
| `frontend/pages/faq.js` | Searchable accordion FAQ |
| `frontend/pages/terms.js` | Terms of Service |
| `frontend/pages/privacy.js` | Privacy Policy |
| `frontend/pages/cancellationPolicy.js` | Cancellation tiers + rules |

**Files modified:**

| File | What changed |
|---|---|
| `frontend/index.html` | Added `#footer-root` div, `#toast-container` div |
| `frontend/assets/js/main.js` | Added `renderFooter()` call on load |
| `frontend/router/router.js` | Added 15 new routes (total 20), search params support, footer hide on admin |
| `frontend/components/navbar.js` | Full navigation: auth state (My Rides / Sign In), admin link, hamburger mobile |
| `frontend/pages/checkout.js` | Added booking summary panel, dev-mode simulate button, better loading states |
| `frontend/pages/success.js` | Added full trip details grid, phone display, `saveBookingToHistory()` call |
| `frontend/pages/history.js` | Added tab switching (localStorage / API), View Details links, improved card layout |
| `frontend/assets/css/main.css` | Added ~26 KB of styles for all new pages (footer, auth, admin, static, charts, toast) |

**Verification results:**
- All 20 SPA routes return HTTP 200 ✓
- All 18 new JS modules served as `application/javascript` ✓
- CSS: 42,137 bytes (up from 13,737 bytes) ✓
- Booking API still working ✓
- Auth guard still working ✓

**README.md:** Updated with full page route table.

---

### Session 4 — Stripe Security + Logo/Favicon (2026-05-30)

**Action:** Hardened Stripe integration and added logo/favicon image assets.

**Stripe security fixes:**
| Change | Detail |
|---|---|
| Added `GET /api/config` to backend | Serves `stripePublishableKey` from env — no key hardcoded in frontend |
| Removed hardcoded `pk_test_YOUR_PUBLISHABLE_KEY_HERE` | Was in `checkout.js` line 131 and `stripe.js` line 3 |
| Added `STRIPE_PUBLISHABLE_KEY` to `.env.example` | Placeholder only — real value in `.env` |
| Created `frontend/config.js` | Exports `API_BASE_URL` — one place to change for production |
| Updated `frontend/services/api.js` | Imports `API_BASE_URL` from `config.js` |
| Added lazy Stripe init in `payment.controller.js` | Returns 503 with clear message if `STRIPE_SECRET_KEY` missing |
| Added QR polling to `success.js` | Polls up to 6× at 2-second intervals for webhook confirmation |

**Logo and favicon:**
| Change | Detail |
|---|---|
| `frontend/index.html` | Added `<link rel="icon" type="image/png" href="/assets/images/icon.png" />` |
| `frontend/components/navbar.js` | Replaced text "TRAQQ" with `<img src="/assets/images/logo.png">` + text fallback via `onerror` |
| `frontend/components/footer.js` | Replaced text "TRAQQ" with `<img src="/assets/images/logo.png">` + text fallback via `onerror` |
| `frontend/assets/css/main.css` | Updated `.navbar-logo`, `.footer-logo` rules for image display; added responsive sizing (38px desktop, 30px mobile) |

**Verification:**
- `GET /api/config` → `{ stripePublishableKey: '' }` ✓ (empty until real key is added)
- `logo.png` → HTTP 200, 2,071,869 bytes, `image/png` ✓
- `icon.png` → HTTP 200, 2,135,112 bytes, `image/png` ✓
- Zero hardcoded `pk_test_` or `sk_test_` strings in frontend source ✓

---

### Session 5 — UI Overhaul + Image Integration (2026-05-30)

**Action:** Major frontend overhaul — images integrated, pages upgraded, design improved.

**Issues found and fixed:**

| Issue | Fix |
|---|---|
| Contact images had spaces in filenames (broken URL paths) | Renamed: `contact us1.png` → `contact-us-1.png` (×4) |
| Navbar logo too small (38px) | Increased to 54px desktop, 40px mobile |
| Navbar missing Contact link | Added Contact to both desktop nav and mobile menu |
| Home page was basic 3-section page | Full 7-section overhaul with Home.png background + book.png side image |
| FAQ page appeared empty (answers hidden, no first-item open) | Rewrote with 12 spec questions, first item open by default, improved toggle UI |
| Contact page had no image slider | Added 4-image auto-rotating slider with dots, arrows, pause on hover |
| Footer missing Contact link | Added Contact to Quick Links column; added contact details (email, location) |

**Files renamed:**
- `frontend/assets/images/contact us1.png` → `contact-us-1.png`
- `frontend/assets/images/contact us2.png` → `contact-us-2.png`
- `frontend/assets/images/contact us3.png` → `contact-us-3.png`
- `frontend/assets/images/contact us4.png` → `contact-us-4.png`

**Files modified:**

| File | What changed |
|---|---|
| `frontend/assets/css/main.css` | Logo size (54px/40px), 300+ lines of new CSS: hero-v2, service cards, hiw-preview, why-grid, terminals, faq-preview, final-cta, contact slider, faq-flat-list, footer-contact-block, responsive breakpoints |
| `frontend/pages/home.js` | Full rewrite: hero with Home.png + book.png, service cards, how-it-works preview, why TRAQQ, DFW terminals, FAQ preview, final CTA |
| `frontend/pages/contact.js` | Full rewrite: image slider with 4 contact images, auto-rotate, arrows, dots, pause on hover; contact info cards with spec content; updated form fields |
| `frontend/pages/faq.js` | Full rewrite: 12 spec questions in flat accordion, first item open by default, improved icon toggle UI |
| `frontend/pages/about.js` | Rewrite: spec content — mission, what we offer (6 items), brand values (6 items), CTA |
| `frontend/pages/howItWorks.js` | Rewrite: spec 5 steps + 4 why-grid items + CTA |
| `frontend/components/navbar.js` | Added Contact link to desktop nav + mobile menu |
| `frontend/components/footer.js` | Upgraded: added Contact to Quick Links, added contact details block (email, location) |

**Verification:**
- All 8 image assets → HTTP 200, correct MIME type ✓
- All SPA routes → HTTP 200 ✓
- Contact images renamed and all references updated ✓
- Zero old filenames (`contact us*.png`) remain in code ✓

---

### Session 6 — UI Polish: Logo, Hero, Marquee, Contact Form Upgrade (2026-05-30)

**Action:** Applied 5 targeted UI improvements that were visually unconfirmed in previous sessions.

**Changes made:**

| Change | Files Modified | Detail |
|---|---|---|
| Logo enlarged | `main.css` | `.navbar-logo-img` changed from `height: 54px` to `width: 165px; height: auto` (desktop) and `width: 120px; height: auto` (mobile, was `height: 40px`) |
| book.png moved lower | `main.css` | `.hero-visual-wrap` changed from `align-items: center` to `align-items: flex-end; padding-top: 3rem`. `.hero-book-img` max-width reduced 440px → 390px |
| Trust pills → moving marquee strip | `main.css`, `home.js` | Removed `.trust-row` / `.trust-pill` CSS and HTML. Added `.trust-marquee`, `.trust-marquee-track`, `.trust-marquee-item` CSS + `@keyframes marquee-scroll`. Marquee placed as full-width section between hero and service highlights (not inside hero text) |
| Contact form upgraded | `main.css`, `contact.js` | Complete contact.js rewrite — new layout: left=form card, right=slider+assist card. New heading "Get in Touch with TRAQQ", 2-col form grid, 5 fields (Full Name, Email, Phone, Inquiry Type select, Message), field-level validation, trust badges, submit note, "Need Immediate Assistance?" card |
| Contact page grid | `main.css` | `.contact-page-grid` overridden to `3fr 2fr` (was `1fr 1fr`) |

**Key CSS classes added in Session 6:**
- `.trust-marquee`, `.trust-marquee-track`, `.trust-marquee-item` — marquee strip
- `@keyframes marquee-scroll` — horizontal infinite animation
- `.form-group`, `.field-error` — form field wrappers with error display
- `.contact-form-card` — luxury dark card with gold border and shadow
- `.contact-form-title`, `.contact-form-subtitle`, `.contact-form-microcopy` — form header text
- `.contact-form-inner-grid` — 2-col desktop field layout
- `.contact-form-select` — custom-styled select (dark, gold arrow)
- `.contact-trust-badges`, `.contact-trust-badge` — small gold trust pills inside form
- `.contact-submit-note` — privacy microcopy under submit button
- `.contact-assist-card`, `.contact-assist-title`, `.contact-assist-detail` — "Need Immediate Assistance?" card

**Contact form behavior:**
- No backend email endpoint exists — form shows success toast on valid submit and clears fields
- Backend email sending: PENDING (not implemented)
- Success message: "Thank you for contacting TRAQQ. Our team will review your message and get back to you shortly."
- Validation: all fields required; email format checked; message min 10 chars; errors shown per-field

**Why previous changes weren't showing:**
- Session 5 changes were applied to the correct files but the user may not have hard-refreshed (Ctrl+Shift+R) to bypass browser CSS/JS cache
- Both servers were already running; no restart was needed for Session 6 changes to take effect

**Verification:**
- Both servers running: backend port 4000 ✓, frontend port 3000 ✓
- All file edits confirmed via Grep and Read tool ✓
- CSS cascade verified: new contact-page-grid rule overrides original 1fr 1fr column layout ✓

---

## 4. Current Pages and Routes

| # | Route | File | Purpose | Status |
|---|---|---|---|---|
| 1 | `/` | `pages/home.js` | Hero, features, CTA | ✅ Complete |
| 2 | `/booking` | `pages/booking.js` | 8-step booking wizard | ✅ Complete |
| 3 | `/checkout` | `pages/checkout.js` | Stripe payment + dev simulate | ✅ Complete |
| 4 | `/success` | `pages/success.js` | Confirmation + QR + trip details | ✅ Complete |
| 5 | `/history` | `pages/history.js` | My bookings (local + API tabs) | ✅ Complete |
| 6 | `/booking-details` | `pages/bookingDetails.js` | Single booking detail view | ✅ Complete |
| 7 | `/login` | `pages/login.js` | Sign in | ✅ Complete |
| 8 | `/register` | `pages/register.js` | Create account | ✅ Complete |
| 9 | `/admin` | `pages/adminDashboard.js` | Admin overview | ✅ Complete |
| 10 | `/admin/bookings` | `pages/adminBookings.js` | Booking management | ✅ Complete |
| 11 | `/admin/customers` | `pages/adminCustomers.js` | Customer list | ✅ Complete |
| 12 | `/admin/payments` | `pages/adminPayments.js` | Payment tracking | ✅ Complete |
| 13 | `/admin/analytics` | `pages/adminAnalytics.js` | Analytics charts | ✅ Complete |
| 14 | `/about` | `pages/about.js` | About page | ✅ Complete |
| 15 | `/how-it-works` | `pages/howItWorks.js` | Process explanation | ✅ Complete |
| 16 | `/contact` | `pages/contact.js` | Contact form | ✅ Complete |
| 17 | `/faq` | `pages/faq.js` | FAQ accordion | ✅ Complete |
| 18 | `/terms` | `pages/terms.js` | Terms of Service | ✅ Complete |
| 19 | `/privacy` | `pages/privacy.js` | Privacy Policy | ✅ Complete |
| 20 | `/cancellation-policy` | `pages/cancellationPolicy.js` | Cancellation rules | ✅ Complete |

**Missing / not yet built:**
- `/404` — 404 not-found page (currently unknown paths fall back to `/`)
- Google Places autocomplete on the `/booking` address step (requires real API key)
- Email notifications (no email backend exists)
- Real-time booking status updates (no WebSocket)

---

### Session 11 — Footer Logo Size + Booking Year Validation (2026-05-30)

**Action:** Two targeted fixes — enlarged footer logo and hardened 4-digit year validation on frontend and backend.

**Files modified:**

| File | Change |
|---|---|
| `frontend/assets/css/main.css` | `.footer-logo-img` changed from `height: 44px; width: auto; max-width: 160px` → `width: 170px; height: auto; max-width: 190px`. Expanded footer media query blocks to include responsive logo sizing. |
| `frontend/pages/booking.js` | `getDateError()` — updated year error message from `'Year must be exactly 4 digits.'` → `'Please enter a valid 4-digit year.'` |
| `backend/src/controllers/booking.controller.js` | `isValidCalendarDate()` — added `if (y < 1000 \|\| y > 9999) return false;` as first check (defense-in-depth on top of Zod regex). |

**CSS classes changed:**

| Class | Before | After |
|---|---|---|
| `.footer-logo-img` | `height: 44px; width: auto; max-width: 160px` | `width: 170px; height: auto; max-width: 190px` |
| `.footer-logo-img` @ 768px | *(not set)* | `width: 145px` |
| `.footer-logo-img` @ 480px | *(not set)* | `width: 125px` |

**Footer logo sizes:**
- Desktop (>768px): 170px wide
- Tablet (≤768px): 145px wide
- Mobile (≤480px): 125px wide
- All use `height: auto; object-fit: contain` — no stretch or crop

**Year validation:**
- Frontend `getDateError()`: The regex `/^\d{4}-\d{2}-\d{2}$/` rejects non-4-digit years first; then the `String(y).length !== 4` guard catches any edge case with updated message "Please enter a valid 4-digit year."
- Backend Zod schema: `pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` — `\d{4}` already enforces exactly 4 digits.
- Backend `isValidCalendarDate()`: added `y < 1000 || y > 9999` guard for defense-in-depth.
- 3-digit year (`123-01-01`) → backend 400, frontend blocked ✓
- 5-digit year (`12345-01-01`) → backend 400, frontend blocked ✓
- Alpha year (`abcd-01-01`) → frontend blocked ✓
- Valid year (`2027-06-15`) → passes ✓

**Verification (Playwright):**
- Desktop footer logo: 170px × 113px rendered, `object-fit: contain`, `naturalW: 1536px` — not cropped ✓
- Tablet footer logo: 145px ✓
- Mobile footer logo: 125px ✓
- Zero real console errors (400s from test requests are intentional) ✓

---

### Session 10 — Premium "Book Your Ride in Minutes" Section Redesign (2026-05-30)

**Action:** Full redesign of the "Book Your Ride in Minutes" section into a premium two-column layout with vertical timeline, floating image card, trust badges, staggered entrance animation, and radial gold glow.

**Files modified:**

| File | Change |
|---|---|
| `frontend/pages/home.js` | Replaced old `.book-ride-grid` section with new `.brim-section` HTML. Added IntersectionObserver at end of function for staggered step entrance and visual column fade-in. |
| `frontend/assets/css/main.css` | Replaced `.book-ride-*` CSS block with new `.brim-*` CSS block (~130 lines). Updated `@media (max-width: 900px)` and `@media (max-width: 768px)` responsive rules. Added `@media (max-width: 480px)` breakpoint for trust cards. |

**CSS classes added (replaces removed `.book-ride-*` classes):**

| Class | Purpose |
|---|---|
| `.brim-section` | Section container with `position: relative; overflow: hidden` |
| `.brim-bg-glow` | Decorative absolute radial gold glow background |
| `.brim-grid` | Two-column CSS grid (1.15fr 0.85fr), collapses at 900px |
| `.brim-subtitle` | Premium section subtitle paragraph |
| `.brim-timeline` | Vertical list container for step cards |
| `.brim-step` | Individual step card (dark bg, gold border, 3-col grid layout) with entrance animation |
| `.brim-step.brim-in` | Triggered by IntersectionObserver — `opacity:1; transform:translateY(0)` |
| `.brim-step-num` | Gold circular number badge (01–05) |
| `.brim-step-ico` | Lucide icon wrapper (gold, subtle opacity) |
| `.brim-step-title` | Bold step heading |
| `.brim-step-desc` | Muted step description |
| `.brim-cta` | CTA container (flex column) |
| `.brim-btn` | Gold primary CTA button with glow shadow |
| `.brim-cta-sub` | Muted secondary note below CTA button |
| `.brim-visual` | Right column container with entrance animation |
| `.brim-visual.brim-in` | Triggered by IntersectionObserver |
| `.brim-visual-halo` | Radial gold glow behind image card |
| `.brim-card` | Premium image card (dark bg, gold border, float animation) |
| `@keyframes brim-float` | Subtle 5.5s float animation on `.brim-card` |
| `.brim-card-badge` | Gold "Premium Booking Experience" pill badge inside card |
| `.brim-card-img` | `object-fit: contain; width: 100%` — full image always visible |
| `.brim-trust-row` | 3-column mini trust card row below image |
| `.brim-trust-item` | Individual dark trust card with hover border effect |
| `.brim-trust-ico` | Gold icon inside trust card |

**CSS classes removed:** `.book-ride-grid`, `.book-ride-steps-wrap`, `.book-ride-sub`, `.book-ride-steps-list`, `.book-ride-steps-list li`, `.book-ride-steps-list li::before`, `.book-ride-visual`, `.book-ride-img`

**Image handling:**
- `book.png` rendered at `376×212px` (natural: 1672×941px) with `object-fit: contain` — full image visible, no cropping
- Wrapped in `.brim-card` with gold border, dark background, subtle glow shadow
- `.brim-card` has `@keyframes brim-float` (0px → -9px → 0px, 5.5s infinite)

**Animations:**
- Steps: IntersectionObserver fires at 12% section visibility, JS stagger adds `.brim-in` to each step with 110ms delay between them
- Visual column: `.brim-in` added at 180ms delay (fades up from `translateY(20px)`)

**Verification (Playwright):**
- All 5 steps present and animated in (stepsInCount: 5) ✓
- `brimGrid`, `brimContent`, `brimVisual`, `brimCard`, `brimCardBadge`, `brimCardImg` all present ✓
- Trust items: 3 ✓ — "Flat $99 Rate", "Secure Checkout", "QR Confirmation"
- Badge text: "Premium Booking Experience" ✓
- CTA text: "Book Now — $99" ✓
- `object-fit: contain` confirmed on image ✓
- Zero console errors ✓
- Grid columns: 558.9px + 413.1px (two-column layout confirmed) ✓

---

### Session 9 — Book.png Fix, Hero Font, Date Validation, Icon Library Setup (2026-05-30)

**Action:** Verified and completed all three required fixes. Also added Lucide Icons CDN, Playfair Display font, replaced emojis in key pages, and added real business address. All changes verified visually on localhost via Playwright.

**Files modified:**

| File | Change |
|---|---|
| `frontend/index.html` | Added `Playfair Display` to Google Fonts URL. Added Lucide Icons CDN: `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js` (defer). |
| `frontend/router/router.js` | Added `if (window.lucide) window.lucide.createIcons();` after every page render. |
| `frontend/assets/css/main.css` | `.book-ride-visual` — moved shadow/border/bg from img to container; `padding: 1.25rem; max-width: 440px; background: rgba(10,10,10,0.55); border: 1px solid rgba(201,168,76,0.22); box-shadow: ...`. `.book-ride-img` — removed `object-fit: cover` and `aspect-ratio: 3/4`; now `width:100%; height:auto; object-fit:contain`. `.hero-v2-text .hero-headline` — added `font-family: 'Playfair Display', Georgia, serif`. Added Lucide utility classes: `.icon-xs/sm/md/lg/xl` + `[data-lucide]` base styles + `@keyframes spin`. Added `.gradient-heading` class with `@supports (-webkit-background-clip: text)` gold/white gradient. |
| `frontend/pages/home.js` | Hero h1: added `gradient-heading` class. Trust marquee: replaced `✦` with Lucide icons. Service cards: replaced 🚪💰👥✅ with Lucide `door-open/banknote/users/qr-code`. Why grid: replaced ★🛡📱🔒📋✈ with Lucide icons. Three section-title h2s: added `gradient-heading` class. |
| `frontend/pages/about.js` | Replaced 12 emoji icons (🚗💰🚪👥🔒✅⏱🛡📋🪑🦺★) with Lucide icons. |
| `frontend/pages/howItWorks.js` | Replaced step icons (📋✔🔒✅✈) and why-grid icons (💰👥✈📱) with Lucide. |
| `frontend/pages/faq.js` | FAQ accordion toggle: replaced `+` text with `<i data-lucide="plus">` — CSS rotation handles ×/+ visual toggle. Removed `icon.textContent = '+'` from JS. |
| `frontend/pages/success.js` | Replaced `✓` text in `.success-icon` with `<i data-lucide="check" class="icon-xl">`. |
| `frontend/utils/adminLayout.js` | Sidebar nav icons: replaced ◈◆◉◎◇ with Lucide `layout-dashboard/calendar-range/users/credit-card/bar-chart-2`. |
| `frontend/pages/adminDashboard.js` | Quick action icons: replaced ◆◉◎◇ with matching Lucide icons. |
| `frontend/pages/contact.js` | Trust badges: replaced `✓` with Lucide `shield-check/check-circle/plane`. Business address: `5860 Collin McKinney Pkwy, Suite 605, McKinney, TX 75070` added to assist card. |
| `frontend/components/footer.js` | Address updated from `Dallas Fort Worth, TX` to `5860 Collin McKinney Pkwy, Suite 605 / McKinney, TX 75070 / Serving Dallas Fort Worth, TX`. |
| `frontend/pages/booking.js` | Replaced `isValidFutureDate()` with `getDateError(dateStr)` — returns specific messages: empty string, regex mismatch, month 1-12 check, day 1-31 check, calendar round-trip (Feb 30, Apr 31), past date. `validate()` now calls `getDateError()`. Removed ⏳ emoji. Added `window.lucide && window.lucide.createIcons()` inside `render()` so icons work across step re-renders. |

**Verified on localhost (Playwright screenshots):**
- Hero headline: Playfair Display serif, gold/white gradient text (`background-clip: text`) ✓
- book.png: full image visible — 1672×941px rendered at 398×224px with `object-fit:contain; height:auto`. Dark premium card container. No cropping. ✓
- Date validation: month 13 → browser rejects → "Please select a pickup date." ✓ | Feb 30 → browser rejects → same ✓ | past date 2020-01-01 → "Please select a future pickup date." ✓ | valid date 2026-09-15 → advances to time step ✓
- Backend `isValidCalendarDate()` in `booking.controller.js` already validates month/day/calendar independently ✓

**Icon library:** Lucide Icons (CDN `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js`). `createIcons()` called in router after every navigation. Also called inside `booking.js render()` for multi-step re-renders.

**book.png note:** File is 1672×941px (landscape 16:9, ~1.5 MB). With `height:auto; object-fit:contain`, it shows at natural ratio (398×224px in the 440px-wide container). Full image is visible — it's a promotional card design ("Book Now / Reserve Your Airport Transfer / TRAQQ logo"). The previous `aspect-ratio:3/4; object-fit:cover` was cropping this to a portrait box.

**Business address:** `5860 Collin McKinney Pkwy, Suite 605, McKinney, TX 75070` — placed in contact.js assist card and footer.js contact block.

---

### Session 8 — Premium Gradient Heading Typography (2026-05-30)

**Action:** Added logo-inspired gold/white gradient text to all major headings across the site.

**Changes made:**

| Change | Files Modified | Detail |
|---|---|---|
| Added `.gradient-heading` utility class | `main.css` | `@supports (-webkit-background-clip: text)` block with gold/white linear-gradient (0% white → 42% #f7d36a → 70% #d4af37 → 100% white). Fallback: `color: var(--white)` for non-supporting browsers. |
| Applied gradient to all inner-hero page titles | `main.css` | `.inner-hero-title` gets same gradient via `@supports` block — covers About, How It Works, FAQ, Contact, Terms, Privacy, Cancellation pages automatically. |
| Improved hero headline typography | `main.css` | `.hero-v2-text .hero-headline` — `line-height` tightened 1.05 → 1.0, `letter-spacing` strengthened -0.02em → -0.03em for more cinematic feel. |
| Added `gradient-heading` to hero h1 | `home.js` | `<h1 class="hero-headline gradient-heading">Door-to-Door DFW Shuttle</h1>` |
| Added `gradient-heading` to section titles | `home.js` | Applied to: "Book Your Ride in Minutes", "Why Travelers Choose TRAQQ", "Serving Dallas Fort Worth International Airport". NOT applied to: "Private Airport Transportation, Designed Around You", "Quick Answers", final CTA h2. |

**CSS classes added in Session 8:**
- `.gradient-heading` — reusable utility; applies gold/white gradient text with white fallback
- Extended `.inner-hero-title` inside `@supports` block for consistent all-page gradient

**Gradient values:**
```css
background: linear-gradient(90deg, #ffffff 0%, #f7d36a 42%, #d4af37 70%, #ffffff 100%);
```

**Headings with gradient (full list):**
- Home hero h1: "Door-to-Door DFW Shuttle" — `hero-headline gradient-heading`
- Home section h2: "Book Your Ride in Minutes" — `section-title gradient-heading`
- Home section h2: "Why Travelers Choose TRAQQ" — `section-title gradient-heading`
- Home section h2: "Serving Dallas Fort Worth International Airport" — `section-title gradient-heading`
- All inner-hero-title h1s: About TRAQQ, How TRAQQ Works, Contact TRAQQ, Frequently Asked Questions, Terms of Service, Privacy Policy, Cancellation Policy — via CSS `.inner-hero-title` rule

**Headings intentionally left plain white:**
- "Private Airport Transportation, Designed Around You" (service section)
- "Quick Answers" (FAQ preview)
- Final CTA h2 ("Ready for a smoother airport ride?")
- Buttons, form labels, nav links, footer links, badges, descriptions

---

### Session 7 — Home Layout Fix, Marquee Fix, Booking Date Validation, Availability Endpoint (2026-05-30)

**Action:** Fixed book.png placement, made marquee seamless, added date validation and real-time slot availability to booking flow.

**Files modified:**

| File | What changed |
|---|---|
| `frontend/pages/home.js` | Hero is now full-width centered (no right column, no book.png in hero). book.png moved to "Book Your Ride in Minutes" section (right column). Trust marquee now uses two `.trust-marquee-group` divs for seamless looping. |
| `frontend/pages/booking.js` | Added `isValidFutureDate()` validation (rejects past dates, Feb 30, month 13 etc.). Step 0→1 transition now calls `GET /api/bookings/availability` and stores booked slots. Step 1 time grid shows disabled "Booked" slots. Going back to step 0 resets booked slots so availability is re-fetched. `validate()` rejects selecting a booked slot. |
| `frontend/assets/css/main.css` | Hero: changed from 2-col grid to `flex + column + text-center`. Removed `.hero-visual-wrap`, `.hero-book-img`. Removed old `hiw-preview-*` classes. Added `.book-ride-grid`, `.book-ride-steps-list`, `.book-ride-visual`, `.book-ride-img`. Added `.trust-marquee-group`. Added `.time-slot.booked`, `.time-slot-label`, `.availability-loading`. Updated responsive breakpoints. |
| `backend/src/controllers/booking.controller.js` | Added `getAvailability()` — validates date, queries PENDING/CONFIRMED bookings, returns available/unavailable slots. Updated `createBooking()` — added `isValidCalendarDate()`, past-date reject, duplicate-slot check with `findActiveBookingForSlot()`. Fixed: paymentStatus filter uses `notIn: ['REFUNDED', 'FAILED']` (was incorrectly using `in: ['PENDING', 'PAID']` but default status is 'UNPAID'). Added ZodError handling to return `{ error: '...' }`. |
| `backend/src/routes/booking.routes.js` | Added `GET /availability` route BEFORE `GET /:id` (critical ordering — otherwise 'availability' would be treated as a booking ID). |

**New API endpoint:**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/bookings/availability?date=YYYY-MM-DD` | None | Returns `{ success, date, availableSlots, unavailableSlots }` |

**Bug found and fixed:** The `paymentStatus` filter in availability/duplicate-slot checks was using `{ in: ['PENDING', 'PAID'] }` but the schema default is `"UNPAID"`. Changed to `{ notIn: ['REFUNDED', 'FAILED'] }` so bookings with `UNPAID` status (newly created, awaiting payment) correctly block the slot.

**Calendar date validation logic:**
- Frontend: `isValidFutureDate()` splits YYYY-MM-DD, checks month 1-12, day 1-31, uses `new Date(y, m-1, d)` to catch invalid combos like Feb 30
- Backend: `isValidCalendarDate()` does same check using `Date.UTC()` and validates components round-trip
- `<input type="date" min="today">` prevents past dates in browsers that support it; JS validation is the fallback

**Database-level double-booking protection:**
- Local dev (SQLite): application-level check via `findActiveBookingForSlot()` before insert
- Production note: add this PostgreSQL partial unique index for database-level protection:
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS unique_active_booking_slot
  ON "bookings" ("pickupDate", "pickupTime")
  WHERE "bookingStatus" IN ('PENDING', 'CONFIRMED')
  AND "paymentStatus" NOT IN ('REFUNDED', 'FAILED');
  ```

**Tests passed:**
- Availability endpoint returns 48 available slots for a clean date ✓
- Availability shows booked slot after booking created ✓
- Past date rejected: "Please select a future pickup date." ✓
- Feb 30 rejected: "Please select a valid pickup date." ✓
- Apr 31 rejected: "Please select a valid pickup date." ✓
- Month 13 rejected: "Please select a valid pickup date." ✓
- Duplicate booking blocked: "This time slot is already booked." ✓
- Backend health: ok ✓
- Frontend: HTTP 200, CSS 58,738 bytes ✓

---

## 5. Backend APIs

### Auth Endpoints

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | None | `{ fullName, phoneNumber, email?, password }` | `{ user, accessToken, refreshToken }` |
| `POST` | `/api/auth/login` | None | `{ email, password }` | `{ user, accessToken, refreshToken }` |
| `POST` | `/api/auth/refresh` | None | `{ refreshToken }` | `{ accessToken }` |

### Booking Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/bookings/availability?date=YYYY-MM-DD` | None | Returns `{ success, date, availableSlots, unavailableSlots }`. Checks PENDING/CONFIRMED bookings with paymentStatus NOT REFUNDED/FAILED. Route MUST be before `/:id` in router. |
| `POST` | `/api/bookings/create` | Optional (userId attached if logged in) | Zod validates all fields; validates calendar date; rejects past dates; checks duplicate slot before insert; returns 409 if slot taken |
| `GET` | `/api/bookings/:id` | None | Returns booking + transaction |
| `PUT` | `/api/bookings/:id` | JWT required | Used by admin to confirm/cancel |
| `DELETE` | `/api/bookings/:id` | Admin only | Hard delete |
| `GET` | `/api/bookings` | Admin only | Returns all bookings with user + transaction |

### Payment Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/payments/create-intent` | None | Body: `{ bookingId }`. Creates Stripe PaymentIntent + Transaction record. Returns `{ clientSecret }` |
| `POST` | `/api/payments/webhook` | Stripe signature | Raw body required (configured in server.js before json middleware). On `payment_intent.succeeded`: updates booking status, generates QR |

**Rate limiting:** 100 requests per 15 minutes per IP on all `/api/` routes.

---

## 6. Database and Prisma

### Schema Location
`C:\Users\sohila\traqq\backend\prisma\schema.prisma`

### Database File (Local Dev SQLite)
`C:\Users\sohila\traqq\backend\prisma\prisma\dev.db` (45 KB)

> **Why nested `prisma/prisma/`?** Prisma resolves SQLite file paths relative to the schema file location (`backend/prisma/`), not relative to the project root. The DATABASE_URL `file:./prisma/dev.db` becomes `backend/prisma/prisma/dev.db`.

### Local Dev Schema Differences vs Production

| Feature | Local (SQLite) | Production (PostgreSQL) |
|---|---|---|
| Provider | `sqlite` | `postgresql` |
| Enum types | Converted to `String` | Proper `enum` declarations |
| `@db.Decimal(10, 2)` | Removed | Present on `Booking.price` |
| Migrations | `prisma db push` (no migration files) | `prisma migrate dev` |

### Prisma Commands

```bash
# Run all from: C:\Users\sohila\traqq\backend\

npx prisma generate       # Regenerate client after schema changes
npx prisma db push        # Sync schema to SQLite (no migration files)
npx prisma studio         # Visual database browser (port 5555)
npx prisma migrate dev    # Use for production PostgreSQL (creates migration files)
```

### Migration Status
- Local dev: schema pushed via `prisma db push` (no migration history)
- Production: migrations not yet set up

---

## 7. Stripe Payment Integration

### Payment Flow (End-to-End)
```
1. User fills booking wizard → POST /api/bookings/create → booking ID in sessionStorage
2. /checkout page loads → POST /api/payments/create-intent → receives clientSecret
3. Stripe Elements mounted with clientSecret (theme: night, colorPrimary: #C9A84C)
4. User submits card → stripe.confirmPayment()
5. Stripe calls POST /api/payments/webhook (with signature verification)
6. Webhook: booking.bookingStatus = "CONFIRMED", booking.paymentStatus = "PAID"
7. QR code generated: JSON { bookingId, phone, ts } → base64 data URL → stored in booking.qrCode
8. Navigate to /success → fetch booking → display QR + trip details
```

### Stripe SDK Versions
- Backend: `stripe` npm package `^16.2.0`
- Frontend: Stripe.js loaded from `https://js.stripe.com/v3/` (defer in index.html)

### Local Dev Status
- **Placeholder keys in use** — Stripe calls will fail gracefully
- Checkout page shows **"Simulate Payment (Dev Mode)"** button when Stripe is unavailable
- This button navigates directly to `/success` so the full flow can be tested locally

### Required Stripe Setup (to enable real payments)
1. Add real `sk_test_...` key to `backend/.env` as `STRIPE_SECRET_KEY`
2. Add real `pk_test_...` key in two frontend files:
   - `frontend/pages/checkout.js` — line with `Stripe('pk_test_YOUR_PUBLISHABLE_KEY_HERE')`
   - `frontend/services/stripe.js` — line with `const STRIPE_PK = 'pk_test_YOUR_PUBLISHABLE_KEY_HERE'`
3. Add webhook secret to `backend/.env` as `STRIPE_WEBHOOK_SECRET`
4. For local webhook testing: `stripe listen --forward-to localhost:4000/api/payments/webhook`

---

## 8. Environment Variables

All values below are **placeholders**. Real secrets must be stored in `backend/.env` (never committed).

```env
# backend/.env

DATABASE_URL=your_postgresql_connection_string_here
# Local dev SQLite: DATABASE_URL="file:./prisma/dev.db"

JWT_SECRET=your_jwt_secret_here_at_least_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_here_at_least_32_chars

STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Frontend Stripe publishable key** (not a secret — safe in source, but must be updated before real payments):
- `frontend/pages/checkout.js` → `Stripe('pk_test_YOUR_PUBLISHABLE_KEY_HERE')`
- `frontend/services/stripe.js` → `const STRIPE_PK = 'pk_test_YOUR_PUBLISHABLE_KEY_HERE'`

**Frontend API base URL:**
- `frontend/services/api.js` → `const BASE_URL = 'http://localhost:4000/api'`
- Change this for production deployment.

---

## 9. Localhost Running Instructions

### Prerequisites
- Node.js v18+ (tested on v22.14.0)
- npm v9+ (tested on v10.9.2)
- No database installation required (SQLite is bundled)

### Terminal 1 — Backend

```bash
cd C:\Users\sohila\traqq\backend

# First time only:
npm install
copy .env.example .env
# Edit .env — set JWT_SECRET and JWT_REFRESH_SECRET to random strings
npx prisma generate
npx prisma db push

# Every time:
node server.js
# Expected output: TRAQQ API running on port 4000
```

### Terminal 2 — Frontend

```bash
cd C:\Users\sohila\traqq

# Start static server:
node frontend-server.js
# Expected output: TRAQQ Frontend running at http://localhost:3000
```

### URLs

| Service | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:4000 |
| **Health check** | http://localhost:4000/health |
| **Admin dashboard** | http://localhost:3000/admin |
| **Prisma Studio** | `npx prisma studio` in `backend/` (port 5555) |

### Verification Test

```bash
# Test backend (PowerShell):
Invoke-RestMethod http://localhost:4000/health

# Test booking creation:
$body = '{"pickupDate":"2026-07-01","pickupTime":"9:00","pickupAddress":"123 Main St Dallas TX","passengerCount":2,"dropoffTerminal":"A","phoneNumber":"2145550001"}' | ConvertTo-Json
# Actually just post it directly:
Invoke-RestMethod -Uri http://localhost:4000/api/bookings/create -Method POST -Body $body -ContentType "application/json"
```

---

## 10. Issues and Fixes

### Issue 1 — PostgreSQL Not Available Locally

- **Error:** `psql` not found, no Docker
- **Cause:** PostgreSQL not installed on the local Windows machine
- **Fix:** Changed `prisma/schema.prisma` datasource provider from `"postgresql"` to `"sqlite"`, removed `@db.Decimal(10,2)`, converted enum types to `String`
- **Files affected:** `backend/prisma/schema.prisma`
- **Result:** Prisma generates SQLite database, all API operations work normally

### Issue 2 — Prisma SQLite Enum Not Supported

- **Error:** Prisma validation error — enum types not supported with SQLite provider
- **Cause:** SQLite provider in Prisma does not support native enums
- **Fix:** All enum fields changed to `String`, enum declarations removed. Application-level validation (Zod) still enforces valid values.
- **Files affected:** `backend/prisma/schema.prisma`
- **Result:** Schema validates, client generates, database pushes successfully

### Issue 3 — `npx serve` Requires Interactive Confirmation

- **Error:** `npx serve` opens an interactive "Ok to proceed? (y)" prompt that cannot be piped
- **Cause:** npx prompts before downloading packages it hasn't cached
- **Fix:** Wrote a custom 40-line Node.js static server `frontend-server.js` in the project root with correct MIME types and SPA fallback
- **Files created:** `frontend-server.js`
- **Result:** Frontend served with correct MIME types (critical for ES modules), SPA routes fall back to `index.html`

### Issue 4 — `Start-Process` Cannot Run `.cmd` Files on Windows PS 5.1

- **Error:** `Start-Process -FilePath "serve.cmd"` → "not a valid Win32 application"
- **Cause:** PowerShell 5.1's `Start-Process` cannot launch `.cmd` files directly as a binary
- **Fix:** Used `Start-Process node` to run `frontend-server.js` directly (same approach as backend)
- **Result:** Both servers start as hidden Node.js processes

### Issue 5 — SQLite DB Created in Nested Path

- **Observation:** DATABASE_URL `file:./prisma/dev.db` creates the file at `backend/prisma/prisma/dev.db` (not `backend/prisma/dev.db`)
- **Cause:** Prisma resolves SQLite file paths relative to the schema file location, not the project root
- **Impact:** None — database works correctly, just in a nested location
- **Fix:** None needed. Documented for future reference.

---

## 11. Important Decisions

| Decision | Reason |
|---|---|
| **Vanilla JS SPA only — no React/Vue/Angular** | Per project specification. Must never be changed. |
| **Manual SPA router with `history.pushState()`** | No routing library allowed; custom router in `router/router.js` |
| **SQLite for local dev** | PostgreSQL not available locally; Prisma supports SQLite transparently |
| **Stripe secret key stays on backend only** | Security requirement — publishable key only goes to frontend |
| **QR code generated only after webhook confirms payment** | Prevents QR codes for unpaid bookings |
| **`passengerCount` max 6 enforced in Zod** | Core business rule from SRS |
| **Half-hour time slots only** | Business rule — times generated dynamically with 30-min intervals |
| **JWT in localStorage** | Session storage would be lost on tab close; localStorage persists across sessions |
| **Booking history in localStorage** | Allows guests (no login) to see their recent bookings |
| **Admin sidebar uses shared `adminLayout.js`** | Avoids duplicating 50+ lines of HTML across 5 admin pages |
| **CSS-only bar charts in analytics** | No chart library dependency; keeps frontend vanilla |
| **`frontend-server.js` custom static server** | Avoids `npx serve` interactive prompt issue; full control over MIME types and SPA routing |
| **No email backend** | Out of scope for this phase; contact form uses simulated send |

---

## 12. Next Steps

### High Priority

- [ ] Add real Stripe test keys to enable actual payment testing
  - Backend: add `STRIPE_SECRET_KEY=sk_test_...` and `STRIPE_PUBLISHABLE_KEY=pk_test_...` to `.env`
  - Frontend: no source code changes needed — publishable key is fetched from `GET /api/config`
- [ ] Add Google Maps Places API key for address autocomplete on `/booking` Step 3
  - Load script in `index.html`: `https://maps.googleapis.com/maps/api/js?key=KEY&libraries=places`
  - Wire autocomplete to `#pickupAddress` input in `booking.js`
- [x] Admin user seeded — run `node seed-admin.js` in `backend/` — see Section 14 for credentials

### Medium Priority

- [ ] Add `/404` page for unknown routes (currently falls back to Home)
- [ ] Add input formatting for phone number field (auto-format as (555) 000-0000)
- [ ] Add booking confirmation email (requires email service like SendGrid or Resend)
- [ ] Add Stripe webhook local testing (`stripe listen --forward-to localhost:4000/api/payments/webhook`)
- [ ] Add luggage display to the booking summary sidebar panel
- [ ] Add loading spinner component for API calls across all pages

### Production Readiness

- [ ] Switch Prisma schema back to PostgreSQL provider
- [ ] Restore enum types in schema.prisma
- [ ] Restore `@db.Decimal(10, 2)` on `Booking.price`
- [ ] Run `npx prisma migrate dev --name init` to create migration history
- [ ] Set all production environment variables (DATABASE_URL, JWT_SECRET, STRIPE keys, etc.)
- [ ] Change `API_BASE_URL` in `frontend/config.js` from `http://localhost:4000/api` to production API URL
- [ ] Deploy backend to Render or Railway
- [ ] Deploy database to Supabase PostgreSQL or Railway PostgreSQL
- [ ] Deploy frontend to Vercel or Netlify
- [ ] Set up Stripe webhook endpoint in Stripe Dashboard pointing to production URL
- [ ] Add HTTPS (handled by hosting platform)

### Nice to Have

- [ ] Admin: Add ability to view/download bookings as CSV
- [ ] Admin: Add date range filter to analytics
- [ ] Customer: Add SMS or email booking reminder
- [ ] Customer: Add ability to reschedule from the booking details page
- [ ] Add `prefers-color-scheme` media query detection (currently always dark mode)

---

## 14. Admin Access (Local Development)

> **IMPORTANT:** These credentials are for LOCAL DEVELOPMENT only. Change before any production deployment. Never commit passwords to Git.

### Admin Dashboard URLs

| Service | URL |
|---|---|
| Admin Dashboard | http://localhost:3000/admin |
| Admin Bookings | http://localhost:3000/admin/bookings |
| Admin Booking Details | http://localhost:3000/admin/booking-details?id=BOOKING_ID |
| Admin Customers | http://localhost:3000/admin/customers |
| Admin Payments | http://localhost:3000/admin/payments |
| Admin Analytics | http://localhost:3000/admin/analytics |
| Admin Settings | http://localhost:3000/admin/settings |
| Backend API | http://localhost:4000 |
| Health Check | http://localhost:4000/health |

### Local Dev Admin Credentials

| Field | Value |
|---|---|
| Email | `admin@traqq.local` |
| Password | `Admin@123456` |
| Role | `ADMIN` |
| Phone | `0000000001` |

> These are TEST CREDENTIALS for local dev. Do not use in production.

### Seed Script

```bash
# Run from backend/ directory:
node seed-admin.js
```

The script:
- Checks if `admin@traqq.local` already exists → skips if found
- Creates the user with a bcrypt-hashed password (cost factor 10)
- Sets role to `ADMIN`
- Safe to run multiple times (idempotent)

### Admin Security Architecture

| Layer | What protects it |
|---|---|
| Frontend | `adminLayout.js` checks `getUser()` + `isAdmin()` before rendering any admin page. Shows "Sign In Required" (not logged in) or "Access Denied" (wrong role). |
| Backend — `/api/admin/*` | All routes use `router.use(authenticate, requireAdmin)` middleware — 401 without token, 403 for non-admin role |
| Backend — `GET /api/bookings` | Requires `authenticate + requireAdmin` |
| Backend — `DELETE /api/bookings/:id` | Requires `authenticate + requireAdmin` |
| JWT | Access token (15 min) includes `{ id, role }`. Role is verified on every protected request. |
| Password | Stored as bcrypt hash (`$2a$10$...`) — plain text never stored or logged |

### Other Admin Users in DB (local dev)

These were created during debugging sessions. Safe to leave or delete:
- `admin@traqq.test` / `AdminPass123!` (created Session 17)
- `testadmin@traqq.test` (created during early testing)

### Production Admin Setup

For production:
1. Run seed script with a strong unique password
2. Remove or disable test admin accounts
3. Rotate JWT secrets (set `JWT_SECRET` and `JWT_REFRESH_SECRET` in env)
4. Never share passwords in code, logs, or documentation

---

## 13. Developer Notes for Future Claude Sessions

### Must Read Before Touching Anything
1. This project uses **Vanilla JavaScript only** — no frameworks, no JSX, no TypeScript
2. All pages export a `default` function: `export default function pageName(root, { params }) { ... }`
3. Navigation uses `data-link="/path"` attributes OR `import { navigate } from '../router/router.js'`
4. The router passes URL search params: `/booking-details?id=abc` → `params.id = 'abc'`
5. The SQLite schema has `String` fields where the target schema uses enums — **do not add enum types back to the SQLite schema**

### What Has Already Been Built (Do Not Rebuild)
- All 20 frontend pages
- Full backend REST API (auth, bookings, payments)
- Prisma schema + local SQLite database
- Custom static file server (`frontend-server.js`)
- Admin dashboard with 5 sub-pages
- All 7 static content pages
- Footer, navbar, auth utilities, admin layout utility
- Toast notification system

### What Should NOT Be Changed
- Core architecture (Vanilla JS SPA, Express backend, Prisma ORM)
- The 20-route SPA router structure
- Payment flow (Stripe on backend, Stripe.js on frontend)
- JWT authentication flow
- The flat $99 price logic
- The 6-passenger maximum enforcement

### Risky Areas
- **`backend/prisma/schema.prisma`** — Any change requires `npx prisma generate` and `npx prisma db push` to take effect. Wrong changes can break the database.
- **`frontend/router/router.js`** — All navigation depends on this. A syntax error here breaks the entire SPA.
- **`frontend/assets/js/main.js`** — Entry point; a bad import here breaks the whole app.
- **`frontend/services/api.js`** — All API calls go through this. The `BASE_URL` must match the running backend port.
- **Stripe webhook handler** — Must receive raw body (configured in `server.js` before `express.json()` middleware). Do not change this order.

### Setup Requirements for a New Machine
1. Node.js v18+ required
2. No PostgreSQL needed for local dev (SQLite bundled)
3. Run `npm install` in `backend/` before anything else
4. Copy `backend/.env.example` to `backend/.env` and set at minimum `JWT_SECRET` and `JWT_REFRESH_SECRET`
5. Run `npx prisma generate` then `npx prisma db push` to create the database
6. Start backend with `node server.js` (port 4000)
7. Start frontend with `node frontend-server.js` from project root (port 3000)

### Known Quirks
- SQLite DB is at `backend/prisma/prisma/dev.db` (nested, not `backend/prisma/dev.db`) — this is expected
- Admin pages hide the global footer (router.js checks `ADMIN_ROUTES` array)
- The booking history tab "Account Bookings" only works with an admin JWT (backend GET /api/bookings is admin-only)
- Stripe payment on `/checkout` shows a "Simulate Payment" button in local dev — this is intentional
- Google Maps autocomplete is wired up in HTML comment but not activated (needs real API key)

---

*Memory file created: 2026-05-30*
*Last updated: 2026-05-31 (Session 19 — Fixed Access Denied by adding Sign Out & Switch Account button; added prisma/seed.js + npm run seed:admin; README admin section added; all verified)*
*Project status: Running locally — http://localhost:3000 (frontend) · http://localhost:4000 (backend)*
