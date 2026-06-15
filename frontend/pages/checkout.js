import { api } from '../services/api.js';
import { navigate } from '../router/router.js';
import { getToken, showToast, escapeHtml } from '../utils/auth.js';

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

function fmtMoney(dollars) {
  return '$' + Number(dollars).toFixed(2);
}

function showPaymentError(container, message, isPermission) {
  container.innerHTML = `
    <div class="payment-unavailable">
      <p class="payment-unavail-title">${isPermission ? 'Payment Setup Required' : 'Payment Unavailable'}</p>
      <p class="hint">${message}</p>
      ${isPermission
        ? `<p class="hint" style="font-size:0.8rem;color:var(--white-muted);">
             Go to Stripe Dashboard → API Keys → Restricted Keys → ensure "Payment Intents: Write" is enabled.
           </p>`
        : `<p class="hint" style="font-size:0.8rem;color:var(--white-muted);">
             Add <code>STRIPE_RESTRICTED_KEY</code> and <code>STRIPE_PUBLISHABLE_KEY</code> to <code>backend/.env</code>.
           </p>`}
    </div>`;
}

export default async function checkout(root) {
  const bookingId = sessionStorage.getItem('traqq_booking_id');
  const booking = JSON.parse(sessionStorage.getItem('traqq_booking_data') || 'null');

  if (!bookingId || !booking) {
    navigate('/booking');
    return;
  }

  let currentPrice = Number(booking.price) || 99;
  let appliedPromo = null; // { code, discountPct, discountAmount, finalPrice }

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

          <!-- Promo code section -->
          <div class="checkout-card promo-section" id="promo-section">
            <p class="promo-section-title">Have a promo code?</p>
            <div class="promo-input-row">
              <input type="text" class="form-input promo-input" id="promoInput"
                placeholder="Enter code (e.g. INFLUENCER15)"
                autocomplete="off"
                style="text-transform:uppercase;letter-spacing:0.05em;" />
              <button class="btn btn-primary btn-sm" id="promoApplyBtn" type="button">Apply</button>
            </div>
            <p id="promo-message" class="promo-message" style="display:none;"></p>
          </div>

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
              <span class="price-gold" id="order-price">${fmtMoney(currentPrice)}</span>
            </div>
            <div id="promo-discount-row" style="display:none;" class="checkout-summary-item checkout-discount-row">
              <span id="promo-discount-label">Promo discount</span>
              <span class="price-discount" id="promo-discount-amount"></span>
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
              <span>${escapeHtml(booking.pickupAddress) || '—'}</span>
            </div>
            <div class="checkout-detail-row">
              <span class="checkout-detail-key">Terminal</span>
              <span>DFW Terminal ${escapeHtml(booking.dropoffTerminal)}</span>
            </div>
            <div class="checkout-detail-row">
              <span class="checkout-detail-key">Passengers</span>
              <span>${booking.passengerCount}</span>
            </div>
            ${booking.airline ? `
            <div class="checkout-detail-row">
              <span class="checkout-detail-key">Airline</span>
              <span>${escapeHtml(booking.airline)}</span>
            </div>` : ''}
            <div class="checkout-summary-divider"></div>
            <div class="checkout-summary-total">
              <span>Total Due</span>
              <span class="price-gold" id="summary-total" style="font-size:1.25rem;">${fmtMoney(currentPrice)}</span>
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
  const promoDiscountRow = root.querySelector('#promo-discount-row');
  const promoDiscountAmount = root.querySelector('#promo-discount-amount');
  const promoDiscountLabel = root.querySelector('#promo-discount-label');

  function updatePriceSummary(price, promo) {
    if (promo) {
      orderPrice.textContent = fmtMoney(99);
      promoDiscountRow.style.display = '';
      promoDiscountLabel.textContent = `Promo: ${promo.code} (${promo.discountPct}% off)`;
      promoDiscountAmount.textContent = `−${fmtMoney(promo.discountAmount)}`;
    } else {
      orderPrice.textContent = fmtMoney(price);
      promoDiscountRow.style.display = 'none';
    }
    summaryTotal.textContent = fmtMoney(price);
  }

  // ── Promo code logic ──────────────────────────────────────────────────────
  const promoInput = root.querySelector('#promoInput');
  const promoApplyBtn = root.querySelector('#promoApplyBtn');
  const promoMsg = root.querySelector('#promo-message');

  promoInput?.addEventListener('input', () => {
    promoInput.value = promoInput.value.toUpperCase();
    // Clear previous error/success on new input
    promoMsg.style.display = 'none';
    promoMsg.className = 'promo-message';
    if (appliedPromo) {
      appliedPromo = null;
      currentPrice = Number(booking.price) || 99;
      updatePriceSummary(currentPrice, null);
      updatePayBtn();
    }
  });

  promoApplyBtn?.addEventListener('click', async () => {
    const code = promoInput.value.trim().toUpperCase();
    if (!code) {
      showPromoMsg('Please enter a promo code.', 'error');
      return;
    }

    promoApplyBtn.disabled = true;
    promoApplyBtn.textContent = 'Checking…';
    promoMsg.style.display = 'none';

    try {
      const result = await api.post('/promo/apply', { code, bookingId });
      appliedPromo = result.promo;
      currentPrice = result.finalPrice;
      updatePriceSummary(currentPrice, appliedPromo);
      showPromoMsg(`${result.promo.discountPct}% discount applied! You save ${fmtMoney(result.promo.discountAmount)}.`, 'success');
      promoApplyBtn.textContent = 'Applied ✓';
      promoInput.disabled = true;
      updatePayBtn();
    } catch (err) {
      appliedPromo = null;
      currentPrice = Number(booking.price) || 99;
      updatePriceSummary(currentPrice, null);
      showPromoMsg(err.message || 'Invalid promo code.', 'error');
      promoApplyBtn.disabled = false;
      promoApplyBtn.textContent = 'Apply';
    }
  });

  function showPromoMsg(msg, type) {
    promoMsg.textContent = msg;
    promoMsg.className = `promo-message promo-message--${type}`;
    promoMsg.style.display = 'block';
  }

  // ── Check for active packages (only when logged in) ──────────────────────
  let activePackages = [];
  if (getToken()) {
    try {
      activePackages = await api.get('/packages/active');
    } catch { /* ignore */ }
  }

  if (activePackages && activePackages.length > 0) {
    const pkg = activePackages[0];
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
            Pay ${fmtMoney(currentPrice)}
          </button>
        </div>
      </div>`;

    stripeSection.style.display = 'none';
    root.querySelector('#promo-section').style.display = 'none';
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
        stripeSection.style.display = '';
        root.querySelector('#promo-section').style.display = '';
      }
    });

    root.querySelector('#payInsteadBtn').addEventListener('click', () => {
      pkgBanner.style.display = 'none';
      stripeSection.style.display = '';
      root.querySelector('#promo-section').style.display = '';
      updatePriceSummary(currentPrice, appliedPromo);
    });
  }

  // ── Stripe setup ──────────────────────────────────────────────────────────
  const payBtn = root.querySelector('#payBtn');
  const payBtnText = root.querySelector('#pay-btn-text');
  const errEl = root.querySelector('#payment-error');
  const container = root.querySelector('#payment-element-container');

  function updatePayBtn() {
    if (payBtnText && !payBtn.disabled) {
      payBtnText.textContent = `Pay ${fmtMoney(currentPrice)} Securely`;
    }
  }

  if (typeof Stripe === 'undefined') {
    showPaymentError(container, 'Stripe.js failed to load. Check your internet connection.', false);
    payBtn.style.display = 'none';
    return;
  }

  let stripe, elements;

  try {
    const config = await api.get('/config');
    if (!config.stripePublishableKey) {
      showPaymentError(container, 'STRIPE_PUBLISHABLE_KEY is not set in backend/.env', false);
      payBtn.style.display = 'none';
      return;
    }

    let intentData;
    try {
      intentData = await api.post('/payments/create-intent', { bookingId });
    } catch (intentErr) {
      const msg = intentErr.message || 'Payment initialization failed.';
      const isPermission = msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('key');
      showPaymentError(container, msg, isPermission);
      payBtn.style.display = 'none';
      return;
    }

    const { clientSecret } = intentData;
    currentPrice = intentData.amount ? intentData.amount / 100 : currentPrice;
    updatePriceSummary(currentPrice, appliedPromo);

    stripe = Stripe(config.stripePublishableKey);
    elements = stripe.elements({
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
      payBtnText.textContent = `Pay ${fmtMoney(currentPrice)} Securely`;
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
        payBtnText.textContent = `Pay ${fmtMoney(currentPrice)} Securely`;
      } else {
        showToast('Payment successful!', 'success');
        navigate('/success');
      }
    });
  } catch (e) {
    const isPermission = (e.message || '').toLowerCase().includes('permission');
    showPaymentError(container, e.message || 'Payment system error.', isPermission);
    payBtn.style.display = 'none';
  }
}
