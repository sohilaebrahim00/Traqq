# TRAQQ Setup

## 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in .env values (DATABASE_URL, JWT_SECRET, STRIPE keys, etc.)
npm run db:generate
npm run db:migrate
npm run dev
```

## 2. Frontend

Serve the frontend folder with any static server:

```bash
npx serve frontend
# or open frontend/index.html via VS Code Live Server
```

## 3. Stripe Keys

- Replace `pk_test_YOUR_PUBLISHABLE_KEY_HERE` in `frontend/services/stripe.js` and `frontend/pages/checkout.js`
- Add `sk_test_...` and `whsec_...` to `backend/.env`

## 4. Google Places

Add your API key to `backend/.env` as `GOOGLE_MAPS_API_KEY`.
For frontend address autocomplete, load the Maps JS API in `index.html`:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&libraries=places" defer></script>
```

Then wire it to the `#pickupAddress` input in `booking.js`.
