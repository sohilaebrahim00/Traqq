import { api } from '../services/api.js';
import { getToken, getLocalBookings, escapeHtml } from '../utils/auth.js';
import { navigate } from '../router/router.js';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function statusClass(status) {
  const map = { CONFIRMED: 'confirmed', PENDING: 'pending', CANCELLED: 'cancelled', COMPLETED: 'completed' };
  return map[status] || 'pending';
}

function renderBookingCard(b) {
  return `
    <div class="booking-card">
      <div class="booking-card-header">
        <div>
          <span class="booking-id">#${b.id.slice(-10).toUpperCase()}</span>
          <span class="booking-date-small">${formatDate(b.pickupDate)}</span>
        </div>
        <span class="status-badge status-${statusClass(b.bookingStatus)}">${b.bookingStatus}</span>
      </div>
      <div class="booking-card-body">
        <div class="booking-card-grid">
          <div>
            <p class="booking-card-label">Pickup Time</p>
            <p>${escapeHtml(b.pickupTime || '—')}</p>
          </div>
          <div>
            <p class="booking-card-label">${b.tripDirection === 'POINT_TO_POINT' ? 'Category' : 'Terminal'}</p>
            <p>${b.tripDirection === 'POINT_TO_POINT' ? escapeHtml(b.bookingType ? b.bookingType.replace('_', ' ') : 'Point-to-Point') : (b.dropoffTerminal ? `DFW Terminal ${escapeHtml(b.dropoffTerminal)}` : 'DFW Airport')}</p>
          </div>
          <div>
            <p class="booking-card-label">Passengers</p>
            <p>${b.passengerCount || '—'}</p>
          </div>
          <div>
            <p class="booking-card-label">Payment</p>
            <p class="${b.paymentStatus === 'PAID' ? 'text-green' : 'text-muted'}">${b.paymentStatus || 'UNPAID'}</p>
          </div>
        </div>
      </div>
      <div class="booking-card-footer">
        <span class="price-gold">$${Number(b.price || 99).toFixed(2)}</span>
        <div style="display:flex;gap:0.5rem;">
          <a class="btn btn-ghost btn-sm" data-link="/booking-details?id=${b.id}" href="/booking-details?id=${b.id}">View Details</a>
          ${b.qrCode ? `<button class="btn btn-ghost btn-sm" onclick="window.open('${b.qrCode}')">QR Code</button>` : ''}
        </div>
      </div>
    </div>`;
}

function renderEmpty() {
  return `
    <div class="empty-state">
      <div class="empty-icon">◈</div>
      <h3>No bookings yet</h3>
      <p>Your confirmed rides will appear here.</p>
      <a class="btn btn-primary" data-link="/booking" href="/booking">Book Your First Ride</a>
    </div>`;
}

function renderPackageCard(pkg) {
  const expires = new Date(pkg.expirationDate);
  const daysLeft = Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24));
  
  return `
    <div class="booking-card" style="border-color: var(--gold); box-shadow: 0 4px 20px rgba(201,160,80,0.1);">
      <div class="booking-card-header" style="border-bottom-color: rgba(201,160,80,0.2);">
        <div>
          <span class="booking-id" style="color: var(--gold);"><i data-lucide="award" class="icon-sm" style="margin-right:0.5rem; vertical-align:-3px;"></i>${pkg.packageName}</span>
        </div>
        <span class="status-badge status-confirmed">Active Package</span>
      </div>
      <div class="booking-card-body">
        <div class="booking-card-grid">
          <div>
            <p class="booking-card-label">Remaining Rides</p>
            <p style="font-size:1.5rem; font-weight:700; color:var(--white);">${pkg.remainingRides} <span style="font-size:1rem; color:var(--white-muted); font-weight:400;">/ ${pkg.totalRides}</span></p>
          </div>
          <div>
            <p class="booking-card-label">Expires In</p>
            <p style="color:var(--white);">${daysLeft} days <span style="color:var(--white-muted); font-size:0.85rem;">(${formatDate(pkg.expirationDate)})</span></p>
          </div>
        </div>
      </div>
      <div class="booking-card-footer" style="background: rgba(201,160,80,0.05);">
        <p style="font-size:0.85rem; color:var(--white-muted);">Your active package rides will automatically apply at checkout.</p>
      </div>
    </div>`;
}

export default async function history(root) {
  root.innerHTML = `
    <div class="history-page">
      <div class="container">
        <div class="history-header">
          <div>
            <h1>My Bookings</h1>
            <p class="history-sub">All your TRAQQ shuttle rides in one place.</p>
          </div>
          <a class="btn btn-primary" data-link="/booking" href="/booking">+ New Booking</a>
        </div>

        <div class="history-tabs">
          <button class="history-tab active" data-tab="local">Recent</button>
          ${getToken() ? `<button class="history-tab" data-tab="api">Account Bookings</button>` : ''}
        </div>

        <div id="packages-list" style="margin-bottom: 3rem;"></div>
        <div id="bookings-list"></div>
      </div>
    </div>`;

  const list = root.querySelector('#bookings-list');
  const packagesList = root.querySelector('#packages-list');

  function showLocal() {
    packagesList.innerHTML = '';
    const bookings = getLocalBookings();
    list.innerHTML = bookings.length
      ? bookings.map(renderBookingCard).join('')
      : renderEmpty();
  }

  async function showFromAPI() {
    list.innerHTML = `<div class="skeleton-list">${[1,2,3].map(() => '<div class="skeleton skeleton-card"></div>').join('')}</div>`;
    packagesList.innerHTML = '';
    
    try {
      const [bookings, packages] = await Promise.all([
        api.get('/customer/bookings'),
        api.get('/packages/active').catch(() => []) // fail gracefully if packages fail
      ]);
      
      if (packages && packages.length > 0) {
        packagesList.innerHTML = packages.map(renderPackageCard).join('');
      }

      list.innerHTML = bookings.length ? bookings.map(renderBookingCard).join('') : renderEmpty();
    } catch (e) {
      list.innerHTML = `
        <div class="empty-state">
          <p class="form-error">Could not load bookings: ${e.message}</p>
          <p class="hint">Showing locally saved bookings instead.</p>
        </div>`;
      showLocal();
    }
  }

  // Default: show local bookings
  showLocal();

  // Tab switching
  root.querySelectorAll('.history-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      root.querySelectorAll('.history-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (tab.dataset.tab === 'api') showFromAPI();
      else showLocal();
    });
  });
}
