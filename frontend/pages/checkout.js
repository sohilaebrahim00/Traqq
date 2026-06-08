import { api } from '../services/api.js';
import { navigate } from '../router/router.js';
import { getToken, showToast } from '../utils/auth.js';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${m === 0 ? '00' : m} ${ampm}`;
}

function formatExpiry(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showDevFallback(container, message) {
  container.innerHTML = `
    <div class="payment-unavailable">
      <p class="payment-unavail-title">Payment system unavailable</p>
      <p class="hint">${message}</p>
      <p class="hint">Add <code>STRIPE_RESTRICTED_KEY</code> and <code>STRIPE_PUBLISHABLE_KEY</code> to <code>backend/.env</code> to enable real payments.</p>
      <button class="btn btn-primary btn-full" id="testProceedBtn" style="margin-top:1rem;">
        Simulate Payment (Dev Mode)
      </button>
    </div>`;
  container.querySelector('#testProceedBtn')?.addEventListener('click', () => {
    showToast('Payment simulated — dev mode', 'info');
    navigate('/success');
  });
}

export default async function checkout(root) {
  const bookingId = sessionStorage.getItem('traqq_booking_id');
  const booking = JSON.parse(sessionStorage.getItem('traqq_booking_data') || 'null');

  if (!bookingId || !booking) {
    navigate('/booking');
    return;
  }

  root.innerHTML = `
    <div class="checkout-page">
      <div class="checkout-grid">
        <div class="checkout-main">
          <div class="checkout-header">
            <div class="checkout-step-tag">Step 2 of 2</div>
            <h1 class="checkout-title">Secure Payment</h1>
            <p class="checkout-sub">Your ride is held for 15 minutes. Complete payment to confirm.</p>
          </div>

          <div id="pkg-banner"></div>

          <div class="checkout-card" id="stripe-section">
            <div id="payment-element-container" class="payment-element-wrapper">
              <div class="checkout-loading">
                <div class="skeleton" style="height:48px;margin-bottom:1rem;"></div>
                <div class="skeleton" style="height:48px;margin-bottom:1rem;"></div>
                <div class="skeleton" style="height:48px;"></div>
              </div>
            </div>
            <p id="payment-error" class="form-error" style="display:none;margin-top:1rem;"></p>
            <button class="btn btn-primary btn-full" id="payBtn" disabled style="margin-top:1.5rem;">
              <span id="pay-btn-text">Initializing...</span>
            </button>
            <p class="checkout-secure-note">
              <span>🔒</span> Secured by Stripe. We never store your card details.
            </p>
          </div>

          <button class="btn btn-ghost" data-link="/booking" style="margin-top:1rem;width:100%;">
            ← Change booking details
          </button>
        </div>

        <aside class="checkout-summary-panel">
          <div class="checkout-summary-card">
            <p class="checkout-summary-label">Order Summary</p>
            <div class="checkout-summary-item">
              <span>Private DFW Shuttle</span>
              <span class="price-gold" id="order-price">$99.00</span>
            </div>
            <div class="checkout-summary-divider"></div>
            ${booking.tripDirection ? `
            <div class="checkout-detail-row">
              <span class="checkout-detail-key">Direction</span>
              <span>${booking.tripDirection === 'FROM_DFW' ? 'From DFW Airport' : 'To DFW Airport'}</span>
            </div>` : ''}
            <div class="checkout-detail-row">
              <span class="checkout-detail-key">Date</span>
              <span>${formatDate(booking.pickupDate)}</span>
            </div>
            <div class="checkout-detail-row">
              <span class="checkout-detail-key">Time</span>
              <span>${formatTime(booking.pickupTime)}</span>
            </div>
            <div class="checkout-detail-row">
              <span class="checkout-detail-key">From</span>
              <span>${booking.pickupAddress || '—'}</span>
            </div>
            <div class="checkout-detail-row">
              <span class="checkout-detail-key">Terminal</span>
              <span>DFW Terminal ${booking.dropoffTerminal}</span>
            </div>
            <div class="checkout-detail-row">
              <span class="checkout-detail-key">Passengers</span>
              <span>${booking.passengerCount}</span>
            </div>
            ${booking.airline ? `
            <div class="checkout-detail-row">
              <span class="checkout-detail-key">Airline</span>
              <span>${booking.airline}</span>
            </div>` : ''}
            <div class="checkout-summary-divider"></div>
            <div class="checkout-summary-total">
              <span>Total Due</span>
              <span class="price-gold" id="summary-total" style="font-size:1.25rem;">$99.00</span>
            </div>
            <div class="checkout-trust-badges">
              <span class="trust-badge">✓ No hidden fees</span>
              <span class="trust-badge">✓ Instant confirmation</span>
              <span class="trust-badge">✓ Free cancellation 24h+</span>
            </div>
          </div>
        </aside>
      </div>
    </div>`;

  const pkgBanner = root.querySelector('#pkg-banner');
  const stripeSection = root.querySelector('#stripe-section');
  const orderPrice = root.querySelector('#order-price');
  const summaryTotal = root.querySelector('#summary-total');

  // ── Check for active packages (only when logged in) ──────────────────────
  let activePackages = [];
  if (getToken()) {
    try {
      activePackages = await api.get('/packages/active');
    } catch { /* ignore — user may not be logged in */ }
  }

  if (activePackages && activePackages.length > 0) {
    const pkg = activePackages[0]; // Use the soonest-expiring package
    const daysLeft = Math.ceil((new Date(pkg.expirationDate) - new Date()) / (1000 * 60 * 60 * 24));

    pkgBanner.innerHTML = `
      <div class="pkg-redeem-banner" id="pkg-redeem-banner">
        <div class="pkg-redeem-icon">🎟</div>
        <div class="pkg-redeem-info">
          <p class="pkg-redeem-name">${pkg.packageName}</p>
          <p class="pkg-redeem-meta">
            <strong style="color:var(--gold);">${pkg.remainingRides}</strong> ride${pkg.remainingRides !== 1 ? 's' : ''} remaining
            · Expires ${formatExpiry(pkg.expirationDate)} (${daysLeft}d)
          </p>
        </div>
        <div class="pkg-redeem-actions">
          <button class="btn btn-primary" id="usePackageBtn" data-pkg-id="${pkg.id}">
            Use Package Ride
          </button>
          <button class="btn btn-ghost btn-sm" id="payInsteadBtn">
            Pay $99
          </button>
        </div>
      </div>`;

    // Hide stripe section by default — show package option first
    stripeSection.style.display = 'none';
    orderPrice.textContent = '1 Package Ride';
    summaryTotal.textContent = '1 Package Ride';

    root.querySelector('#usePackageBtn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Redeeming…';
      try {
        await api.post('/packages/redeem', { bookingId, packagePurchaseId: pkg.id });
        showToast('Ride redeemed from your package!', 'success');
        navigate('/success');
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Use Package Ride';
        showToast(err.message || 'Redemption failed. Try paying with card.', 'error');
        // Reveal Stripe fallback
        stripeSection.style.display = '';
      }
    });

    root.querySelector('#payInsteadBtn').addEventListener('click', () => {
      pkgBanner.style.display = 'none';
      stripeSection.style.display = '';
      orderPrice.textContent = '$99.00';
      summaryTotal.textContent = '$99.00';
    });
  }

  // ── Stripe setup ──────────────────────────────────────────────────────────
  const payBtn = root.querySelector('#payBtn');
  const payBtnText = root.querySelector('#pay-btn-text');
  const errEl = root.querySelector('#payment-error');
  const container = root.querySelector('#payment-element-container');

  if (typeof Stripe === 'undefined') {
    showDevFallback(container, 'Stripe.js failed to load. Check your internet connection or add your Stripe publishable key.');
    payBtn.style.display = 'none';
    return;
  }

  try {
    const config = await api.get('/config');
    if (!config.stripePublishableKey) {
      showDevFallback(container, 'STRIPE_PUBLISHABLE_KEY is not set in backend/.env');
      payBtn.style.display = 'none';
      return;
    }

    const { clientSecret } = await api.post('/payments/create-intent', { bookingId });

    const stripe = Stripe(config.stripePublishableKey);
    const elements = stripe.elements({
      clientSecret,
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#C9A84C',
          colorBackground: '#161616',
          colorText: '#f5f5f5',
          borderRadius: '8px'
        }
      }
    });

    const payEl = elements.create('payment');
    container.innerHTML = '';
    payEl.mount(container);

    payEl.on('ready', () => {
      payBtn.disabled = false;
      payBtnText.textContent = 'Pay $99.00 Securely';
    });

    payBtn.addEventListener('click', async () => {
      payBtn.disabled = true;
      payBtnText.textContent = 'Processing payment...';
      errEl.style.display = 'none';

      const { error } = await stripe.confirmPayment({ elements, redirect: 'if_required' });

      if (error) {
        errEl.textContent = error.message;
        errEl.style.display = 'block';
        payBtn.disabled = false;
        payBtnText.textContent = 'Pay $99.00 Securely';
      } else {
        showToast('Payment successful!', 'success');
        navigate('/success');
      }
    });
  } catch (e) {
    showDevFallback(container, e.message);
    payBtn.style.display = 'none';
  }
}
