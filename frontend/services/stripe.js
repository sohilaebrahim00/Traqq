import { api } from './api.js';

let _stripe = null;

// Returns an initialised Stripe instance, fetching the publishable key
// from the backend /api/config endpoint so no key is ever hardcoded here.
export async function getStripe() {
  if (_stripe) return _stripe;
  if (typeof Stripe === 'undefined') throw new Error('Stripe.js not loaded');
  const { stripePublishableKey } = await api.get('/config');
  if (!stripePublishableKey) {
    throw new Error('STRIPE_PUBLISHABLE_KEY is not set in backend/.env');
  }
  _stripe = Stripe(stripePublishableKey);
  return _stripe;
}
