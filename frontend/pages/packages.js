import { api } from '../services/api.js';
import { showToast } from '../utils/auth.js';

const TERMS = [
  "Monthly ride packages are valid for 30 days from purchase date.",
  "Each ride counts as one one-way airport transfer.",
  "Unused rides do not roll over.",
  "Advance booking is required.",
  "Rides are subject to availability.",
  "Packages are non-refundable.",
  "Packages are non-transferable.",
  "Additional fees may apply for: Extra stops, Extra luggage, Out-of-area pickups, Special requests.",
  "Changes to bookings are subject to availability.",
  "Holiday and peak travel availability may be limited."
];

const PACKAGES = [
  { id: 'PACKAGE_2', rides: 2, price: 179, perRide: 89.50 },
  { id: 'PACKAGE_4', rides: 4, price: 349, perRide: 87.25, popular: true },
  { id: 'PACKAGE_6', rides: 6, price: 529, perRide: 88.17 },
  { id: 'PACKAGE_8', rides: 8, price: 699, perRide: 87.38 }
];

const FEATURES = [
  'Private airport shuttle',
  'Up to 6 passengers',
  'DFW Terminals A – E',
  'Priority booking',
  'Flat monthly pricing'
];

// Gold check SVG icon
const CHECK_ICON = `<svg class="pkg-feature-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="8" cy="8" r="7.5" stroke="currentColor" stroke-opacity="0.4"/>
  <path d="M5 8.5L7 10.5L11 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export default function packages(root) {
  root.innerHTML = `
    <div class="static-page">
      <div class="inner-hero">
        <div class="container">
          <p class="hero-eyebrow">Premium Services</p>
          <h1 class="inner-hero-title">Monthly Airport Ride Packages</h1>
          <p class="inner-hero-sub">Lock in your rides and save. Perfect for frequent flyers, business travelers, and families who value consistency.</p>
        </div>
      </div>

      <div class="container">
        <!-- Package Cards -->
        <div class="pkg-section">
          <div class="pkg-grid">
            ${PACKAGES.map(pkg => `
              <div class="pkg-card${pkg.popular ? ' pkg-card--popular reveal-up' : ' reveal-up'}">
                ${pkg.popular ? '<div class="pkg-popular-ribbon">Most Popular</div>' : ''}

                <div class="pkg-card-header">
                  <div class="pkg-ride-count">${pkg.rides}<span class="pkg-ride-unit"> rides</span></div>
                  <div class="pkg-price-row">
                    <span class="pkg-price">$${pkg.price}</span><span class="pkg-price-mo"> /month</span>
                  </div>
                  <div class="pkg-per-ride">≈ $${pkg.perRide.toFixed(2)} per ride</div>
                </div>

                <div class="pkg-divider"></div>

                <ul class="pkg-features">
                  ${FEATURES.map(f => `
                    <li class="pkg-feature-item">
                      ${CHECK_ICON}
                      <span>${f}</span>
                    </li>`).join('')}
                </ul>

                <div class="pkg-btn-wrap">
                  <button
                    class="pkg-btn ${pkg.popular ? 'pkg-btn--popular' : 'pkg-btn--regular'} btn-purchase"
                    data-package="${pkg.id}"
                  >Purchase Package</button>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Terms Accordion -->
        <h2 style="font-size: 1.75rem; text-align: center; margin-bottom: 2rem; font-weight: 700;" class="reveal-up">Terms &amp; Conditions</h2>
        <div class="faq-flat-list reveal-up" id="faqList" style="max-width: 760px; margin: 0 auto 4rem auto;">
          ${TERMS.map((term, i) => `
            <div class="faq-flat-item" data-idx="${i}">
              <button class="faq-btn" aria-expanded="false">
                <span>${i + 1}. ${term.split('.')[0]}</span>
                <span class="faq-btn-icon"><i data-lucide="plus" class="icon-sm"></i></span>
              </button>
              <div class="faq-flat-body">${term}</div>
            </div>`).join('')}
        </div>

        <!-- Short legal note -->
        <div class="reveal-up" style="max-width: 760px; margin: 0 auto 5rem; text-align: center; padding: 2rem; border-top: 1px solid var(--border);">
          <p style="font-size: 0.78rem; color: var(--white-muted); line-height: 1.7;">
            Terms apply. Monthly packages are valid for 30 days from purchase date. Unused rides do not roll over. Advance booking required. Packages are non-refundable and non-transferable.
          </p>
        </div>
      </div>
    </div>`;

  if (window.lucide) window.lucide.createIcons();

  // ── FAQ accordion ──────────────────────────────────────────────────────────
  root.querySelectorAll('.faq-flat-item').forEach(item => {
    const btn = item.querySelector('.faq-btn');
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      root.querySelectorAll('.faq-flat-item').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.faq-btn').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ── Purchase buttons ───────────────────────────────────────────────────────
  root.querySelectorAll('.btn-purchase').forEach(btn => {
    btn.addEventListener('click', async () => {
      const packageId = btn.dataset.package;
      const user = JSON.parse(localStorage.getItem('traqq_user') || 'null');

      if (!user) {
        showToast('Please sign in to purchase a package', 'error');
        setTimeout(() => window.location.href = '/login', 1500);
        return;
      }

      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = 'Redirecting…';

      try {
        const { url } = await api.post('/packages/checkout', { packageId });
        window.location.href = url;
      } catch (err) {
        btn.disabled = false;
        btn.textContent = originalText;
        showToast(err.message || 'Failed to start checkout', 'error');
      }
    });
  });
}
