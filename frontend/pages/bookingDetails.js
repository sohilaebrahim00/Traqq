import { api } from '../services/api.js';
import { navigate } from '../router/router.js';
import { escapeHtml } from '../utils/auth.js';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${m === 0 ? '00' : m} ${ampm}`;
}

function statusClass(s) {
  return { CONFIRMED: 'confirmed', PENDING: 'pending', CANCELLED: 'cancelled', COMPLETED: 'completed' }[s] || 'pending';
}

export default async function bookingDetails(root, { params }) {
  const bookingId = params?.id;

  root.innerHTML = `
    <div class="details-page">
      <div class="container">
        <div class="details-back">
          <a data-link="/history" href="/history" class="back-link">← Back to My Bookings</a>
        </div>

        <div id="details-body">
          ${!bookingId ? renderLookupForm() : renderSkeleton()}
        </div>
      </div>
    </div>`;

  if (!bookingId) {
    attachLookupListener(root);
    return;
  }

  await loadBooking(root, bookingId);
}

function renderLookupForm() {
  return `
    <div class="details-lookup">
      <h1>Look Up a Booking</h1>
      <p class="details-sub">Enter your booking ID to view full details and your QR code.</p>
      <div class="lookup-form">
        <input type="text" class="form-input" id="lookup-id" placeholder="Enter Booking ID (e.g. A1B2C3D4E5)" />
        <p id="lookup-error" class="form-error" style="display:none;"></p>
        <button class="btn btn-primary btn-full" id="lookup-btn">Find Booking</button>
      </div>
      <p class="hint" style="margin-top:1rem;">Booking IDs are sent to you after completing payment. Check your confirmation page or history.</p>
    </div>`;
}

function renderSkeleton() {
  return `
    <div>
      <div class="skeleton" style="height:32px;max-width:400px;margin-bottom:1.5rem;"></div>
      <div class="details-grid">
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
      </div>
    </div>`;
}

function attachLookupListener(root) {
  root.querySelector('#lookup-btn')?.addEventListener('click', () => {
    const val = root.querySelector('#lookup-id').value.trim();
    if (!val) {
      root.querySelector('#lookup-error').textContent = 'Please enter a booking ID.';
      root.querySelector('#lookup-error').style.display = 'block';
      return;
    }
    navigate(`/booking-details?id=${encodeURIComponent(val)}`);
  });

  root.querySelector('#lookup-id')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') root.querySelector('#lookup-btn').click();
  });
}

async function loadBooking(root, bookingId) {
  try {
    const booking = await api.get(`/bookings/${bookingId}`);
    root.querySelector('#details-body').innerHTML = renderDetails(booking);
  } catch (e) {
    root.querySelector('#details-body').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">◈</div>
        <h3>Booking not found</h3>
        <p>${e.message}</p>
        <button class="btn btn-ghost" data-link="/booking-details" onclick="history.back()">Try Another ID</button>
        <a class="btn btn-primary" data-link="/booking" href="/booking" style="margin-top:0.5rem;">Book a Ride</a>
      </div>`;
  }
}

function renderDetails(booking) {
  return `
    <div class="details-header-row">
      <div>
        <h1>Booking Details</h1>
        <code class="booking-ref">${booking.bookingRef || ('#' + booking.id.slice(-10).toUpperCase())}</code>
      </div>
      <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
        <span class="status-badge status-${statusClass(booking.bookingStatus)}">${booking.bookingStatus}</span>
        <span class="status-badge ${booking.paymentStatus === 'PAID' ? 'status-confirmed' : 'status-pending'}">${booking.paymentStatus}</span>
      </div>
    </div>

    <div class="details-grid">
      <div class="details-card">
        <h3 class="details-card-title">Trip Details</h3>
        <div class="detail-row"><span>Pickup Date</span><span>${formatDate(booking.pickupDate)}</span></div>
        <div class="detail-row"><span>Pickup Time</span><span>${formatTime(booking.pickupTime)}</span></div>
        ${(() => {
          const dir = booking.tripDirection || 'TO_DFW';
          const terminal = booking.dropoffTerminal ? `DFW Terminal ${escapeHtml(booking.dropoffTerminal)}` : 'DFW International Airport';
          if (dir === 'FROM_DFW') {
            return [
              `<div class="detail-row"><span>Pickup</span><span>${terminal}</span></div>`,
              `<div class="detail-row"><span>Drop-off</span><span>${escapeHtml(booking.destinationAddress || booking.pickupAddress)}</span></div>`
            ].join('');
          }
          if (dir === 'POINT_TO_POINT') {
            return [
              `<div class="detail-row"><span>Pickup</span><span>${escapeHtml(booking.pickupAddress)}</span></div>`,
              booking.destinationAddress ? `<div class="detail-row"><span>Drop-off</span><span>${escapeHtml(booking.destinationAddress)}</span></div>` : ''
            ].join('');
          }
          return [
            `<div class="detail-row"><span>Pickup</span><span>${escapeHtml(booking.pickupAddress)}</span></div>`,
            `<div class="detail-row"><span>Drop-off</span><span>${terminal}</span></div>`
          ].join('');
        })()}
        <div class="detail-row"><span>Passengers</span><span>${booking.passengerCount}</span></div>
        <div class="detail-row"><span>Carry-on Bags</span><span>${booking.carryOnCount}</span></div>
        <div class="detail-row"><span>Checked Bags</span><span>${booking.checkedLuggageCount}</span></div>
        ${booking.airline ? `<div class="detail-row"><span>Airline</span><span>${escapeHtml(booking.airline)}</span></div>` : ''}
        ${booking.departureTime ? `<div class="detail-row"><span>Departure</span><span>${escapeHtml(booking.departureTime)}</span></div>` : ''}
      </div>

      <div class="details-card">
        <h3 class="details-card-title">Payment & Contact</h3>
        <div class="detail-row"><span>Amount</span><span class="price-gold">$${Number(booking.price || 99).toFixed(2)}</span></div>
        <div class="detail-row"><span>Payment Status</span><span class="${booking.paymentStatus === 'PAID' ? 'text-green' : ''}">${booking.paymentStatus}</span></div>
        <div class="detail-row"><span>Phone</span><span>${escapeHtml(booking.phoneNumber)}</span></div>
        ${booking.email ? `<div class="detail-row"><span>Email</span><span>${escapeHtml(booking.email)}</span></div>` : ''}
        <div class="detail-row"><span>Booked On</span><span>${formatDate(booking.createdAt)}</span></div>
      </div>
    </div>

    ${booking.qrCode ? `
    <div class="details-qr-section">
      <h3>Your Check-in QR Code</h3>
      <p class="hint">Show this to your driver at pickup.</p>
      <div class="qr-wrapper" style="margin:1.5rem 0;">
        <img class="qr-image" src="${booking.qrCode}" alt="Booking QR Code" />
      </div>
    </div>` : booking.bookingStatus === 'CONFIRMED' ? `
    <div class="details-qr-section">
      <h3>QR Code</h3>
      <p class="hint">Your QR code is being generated and will appear here once ready.</p>
    </div>` : ''}

    <div style="margin-top:2rem;display:flex;gap:1rem;flex-wrap:wrap;">
      <a class="btn btn-primary" data-link="/booking" href="/booking">Book Another Ride</a>
      <a class="btn btn-ghost" data-link="/history" href="/history">My Bookings</a>
    </div>`;
}
