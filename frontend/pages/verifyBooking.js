import { api } from '../services/api.js';

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

export default async function verifyBooking(root, { params }) {
  const bookingId = params.id;

  root.innerHTML = `
    <div class="verify-page">
      <div class="verify-container reveal-scale">
        <div class="verify-spinner">
          <i data-lucide="loader-2" class="icon-xl spin"></i>
        </div>
        <p class="verify-loading">Verifying booking...</p>
      </div>
    </div>`;

  if (!bookingId) {
    root.querySelector('.verify-container').innerHTML = buildInvalid(
      'No Booking ID',
      'No booking ID was provided. Please scan a valid TRAQQ QR code.'
    );
    return;
  }

  try {
    const result = await api.get(`/bookings/verify/${bookingId}`);

    if (result.valid && result.booking) {
      const b = result.booking;
      root.querySelector('.verify-container').innerHTML = `
        <div class="verify-icon verify-icon-valid">
          <i data-lucide="check-circle" class="icon-xl"></i>
        </div>
        <h1 class="verify-title verify-valid">Booking Verified</h1>
        <p class="verify-subtitle">This is a valid, confirmed TRAQQ airport shuttle booking.</p>

        <div class="verify-badge">
          <span class="status-badge status-confirmed">CONFIRMED</span>
          <span class="status-badge status-confirmed" style="background:rgba(76,175,80,0.12);">PAID</span>
        </div>

        <div class="verify-details">
          <div class="verify-detail-row">
            <span class="verify-detail-label">Booking Ref</span>
            <code class="booking-ref">${b.ref}</code>
          </div>
          <div class="verify-detail-row">
            <span class="verify-detail-label">Direction</span>
            <span>${b.tripDirection === 'FROM_DFW' ? 'From DFW Airport' : 'To DFW Airport'}</span>
          </div>
          <div class="verify-detail-row">
            <span class="verify-detail-label">Pickup Date</span>
            <span>${formatDate(b.pickupDate)}</span>
          </div>
          <div class="verify-detail-row">
            <span class="verify-detail-label">Pickup Time</span>
            <span>${formatTime(b.pickupTime)}</span>
          </div>
          <div class="verify-detail-row">
            <span class="verify-detail-label">Terminal</span>
            <span>DFW Terminal ${b.terminal}</span>
          </div>
          <div class="verify-detail-row">
            <span class="verify-detail-label">Passengers</span>
            <span>${b.passengerCount}</span>
          </div>
        </div>

        <a class="btn btn-ghost" data-link="/" href="/">Back to Home</a>`;
    } else {
      root.querySelector('.verify-container').innerHTML = buildInvalid(
        'Booking Not Valid',
        result.message || 'This booking is not confirmed or payment has not been completed.'
      );
    }

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    root.querySelector('.verify-container').innerHTML = buildInvalid(
      'Verification Failed',
      'Unable to verify this booking. The booking may not exist or the QR code may be invalid.'
    );
  }
}

function buildInvalid(title, message) {
  return `
    <div class="verify-icon verify-icon-invalid">
      <i data-lucide="x-circle" class="icon-xl"></i>
    </div>
    <h1 class="verify-title verify-invalid">${title}</h1>
    <p class="verify-subtitle">${message}</p>
    <a class="btn btn-ghost" data-link="/" href="/">Back to Home</a>`;
}
