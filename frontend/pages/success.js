import { api } from '../services/api.js';
import { saveBookingToHistory, escapeHtml } from '../utils/auth.js';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${m === 0 ? '00' : m} ${ampm}`;
}

// Poll until webhook confirms payment or max attempts reached.
// Stripe webhooks typically fire within 1-5 seconds after payment.
async function fetchBookingWithRetry(bookingId, maxAttempts = 6) {
  for (let i = 0; i < maxAttempts; i++) {
    const booking = await api.get(`/bookings/${bookingId}`);
    if (booking.qrCode || booking.paymentStatus === 'PAID') return booking;
    if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, 2000));
  }
  return api.get(`/bookings/${bookingId}`);
}

export default async function success(root) {
  const bookingId = sessionStorage.getItem('traqq_booking_id');

  root.innerHTML = `
    <div class="success-page">
      <div class="success-container reveal-scale">
        <div class="success-checkmark">
          <div class="success-icon"><i data-lucide="check" class="icon-xl"></i></div>
        </div>
        <h1>You're All Set!</h1>
        <p class="success-sub">Your private DFW shuttle is confirmed. Your driver will be at your door on time.</p>

        <div class="success-qr-area">
          <p class="qr-label">Show this QR code at pickup</p>
          <div id="qr-wrapper" class="qr-wrapper">
            <div class="skeleton qr-skeleton"></div>
          </div>
          <p id="qr-hint" class="hint" style="margin-top:0.75rem;">Confirming your payment...</p>
        </div>

        <div id="booking-details-block" class="booking-details-block">
          <div class="skeleton" style="height:24px;margin-bottom:0.5rem;"></div>
          <div class="skeleton" style="height:24px;margin-bottom:0.5rem;"></div>
          <div class="skeleton" style="height:24px;"></div>
        </div>

        <div class="success-actions">
          <a class="btn btn-primary" data-link="/" href="/">Back to Home</a>
          <a class="btn btn-ghost" data-link="/history" href="/history">View My Bookings</a>
        </div>

        <div class="success-reminder">
          <p>Save your Booking ID in case you need to look it up later.</p>
        </div>
      </div>
    </div>`;

  const qrWrapper = root.querySelector('#qr-wrapper');
  const qrHint = root.querySelector('#qr-hint');

  if (!bookingId) {
    qrHint.textContent = 'No booking found. Please complete a booking first.';
    root.querySelector('#booking-details-block').innerHTML = '';
    return;
  }

  try {
    const booking = await fetchBookingWithRetry(bookingId);

    saveBookingToHistory(booking);

    if (booking.qrCode) {
      qrWrapper.innerHTML = `<img class="qr-image" src="${booking.qrCode}" alt="Booking QR Code" />`;
      qrHint.textContent = 'Screenshot this for quick check-in.';
    } else {
      qrWrapper.innerHTML = `<div class="qr-placeholder"><span>QR</span><p>Pending</p></div>`;
      qrHint.textContent = 'QR code will appear here once payment is confirmed by Stripe. Check back in a moment.';
    }

    const paymentBadge = booking.paymentStatus === 'PAID'
      ? '<span class="status-badge status-confirmed">PAID</span>'
      : `<span class="status-badge status-${booking.paymentStatus.toLowerCase()}">${booking.paymentStatus}</span>`;

    const bookingRef = booking.bookingRef || ('TRQ-' + booking.id.slice(-8).toUpperCase());

    root.querySelector('#booking-details-block').innerHTML = `
      <div class="success-detail-grid">
        <div class="success-detail-item">
          <span class="success-detail-label">Booking Ref</span>
          <code class="booking-ref">${bookingRef}</code>
        </div>
        <div class="success-detail-item">
          <span class="success-detail-label">Direction</span>
          <span>${booking.tripDirection === 'FROM_DFW' ? 'From DFW Airport' : 'To DFW Airport'}</span>
        </div>
        <div class="success-detail-item">
          <span class="success-detail-label">Status</span>
          <span class="status-badge status-${booking.bookingStatus.toLowerCase()}">${booking.bookingStatus}</span>
        </div>
        <div class="success-detail-item">
          <span class="success-detail-label">Payment</span>
          ${paymentBadge}
        </div>
        <div class="success-detail-item">
          <span class="success-detail-label">Pickup Date</span>
          <span>${formatDate(booking.pickupDate)}</span>
        </div>
        <div class="success-detail-item">
          <span class="success-detail-label">Pickup Time</span>
          <span>${formatTime(booking.pickupTime)}</span>
        </div>
        <div class="success-detail-item">
          <span class="success-detail-label">From</span>
          <span>${escapeHtml(booking.pickupAddress)}</span>
        </div>
        <div class="success-detail-item">
          <span class="success-detail-label">Terminal</span>
          <span>DFW Terminal ${escapeHtml(booking.dropoffTerminal)}</span>
        </div>
        <div class="success-detail-item">
          <span class="success-detail-label">Passengers</span>
          <span>${booking.passengerCount}</span>
        </div>
        <div class="success-detail-item">
          <span class="success-detail-label">Luggage</span>
          <span>${booking.carryOnCount || 0} carry-on, ${booking.checkedLuggageCount || 0} checked</span>
        </div>
        <div class="success-detail-item">
          <span class="success-detail-label">Contact</span>
          <span>${escapeHtml(booking.phoneNumber)}</span>
        </div>
        ${booking.airline ? `
        <div class="success-detail-item">
          <span class="success-detail-label">Airline</span>
          <span>${escapeHtml(booking.airline)}</span>
        </div>` : ''}
        ${booking.departureTime ? `
        <div class="success-detail-item">
          <span class="success-detail-label">Departure</span>
          <span>${formatTime(escapeHtml(booking.departureTime))}</span>
        </div>` : ''}
        <div class="success-detail-item">
          <span class="success-detail-label">Total Paid</span>
          <span class="price-gold" style="font-weight:700;">$${Number(booking.price || 99).toFixed(2)}</span>
        </div>
      </div>`;

    // Keep traqq_booking_id so the page still works on refresh.
    // A new booking will overwrite it. sessionStorage is tab-scoped anyway.
    sessionStorage.removeItem('traqq_booking_data');
  } catch {
    qrHint.textContent = 'Unable to load booking details. Your booking was saved — use your Booking ID to look it up.';
    root.querySelector('#booking-details-block').innerHTML =
      `<p class="hint">Booking ID: <code>${bookingId}</code></p>`;
  }
}
