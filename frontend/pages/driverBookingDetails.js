import { api } from '../services/api.js';
import { navigate } from '../router/router.js';
import { getUser, showToast, escapeHtml } from '../utils/auth.js';

const VALID_TRANSITIONS = {
  ASSIGNED:           ['DRIVER_ON_THE_WAY', 'CANCELLED'],
  DRIVER_ON_THE_WAY:  ['DRIVER_ARRIVED', 'CANCELLED'],
  DRIVER_ARRIVED:     ['PASSENGER_PICKED_UP', 'CANCELLED'],
  PASSENGER_PICKED_UP:['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT:         ['DROPPED_OFF', 'CANCELLED'],
  DROPPED_OFF:        ['COMPLETED', 'CANCELLED'],
  COMPLETED:          [],
  CANCELLED:          []
};

const STATUS_LABELS = {
  ASSIGNED:             'Assigned',
  DRIVER_ON_THE_WAY:    'En Route to Pickup',
  DRIVER_ARRIVED:       'Arrived at Pickup',
  PASSENGER_PICKED_UP:  'Passenger On Board',
  IN_TRANSIT:           'In Transit',
  DROPPED_OFF:          'Dropped Off',
  COMPLETED:            'Completed',
  CANCELLED:            'Cancelled'
};

const NEXT_ACTION_LABEL = {
  ASSIGNED:             'Start Driving to Pickup',
  DRIVER_ON_THE_WAY:    'I Have Arrived',
  DRIVER_ARRIVED:       'Passenger On Board',
  PASSENGER_PICKED_UP:  'Start Transfer',
  IN_TRANSIT:           'Passenger Dropped Off',
  DROPPED_OFF:          'Mark Completed',
  COMPLETED:            null,
  CANCELLED:            null
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
  });
}

function fmtTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm   = h >= 12 ? 'PM' : 'AM';
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtTs(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function rideStatusClass(s) {
  if (['COMPLETED'].includes(s)) return 'ds-badge ds-badge--green';
  if (['CANCELLED'].includes(s)) return 'ds-badge ds-badge--red';
  if (['UNASSIGNED'].includes(s)) return 'ds-badge ds-badge--muted';
  return 'ds-badge ds-badge--gold';
}

function requireDriverAuth(root) {
  const user = getUser();
  if (!user || user.role !== 'DRIVER') {
    root.innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-brand"><span class="auth-logo">TRAQQ</span></div>
          <h2 style="margin-bottom:0.75rem;">Driver Access Required</h2>
          <p style="color:var(--white-muted);margin-bottom:1.5rem;">Sign in to access ride details.</p>
          <a class="btn btn-primary btn-full" data-link="/driver/login" href="/driver/login">Sign In as Driver</a>
        </div>
      </div>`;
    return false;
  }
  return true;
}

function buildTimeline(b) {
  const steps = [
    { label: 'Booking Assigned',      ts: b.assignedAt,           done: !!b.assignedAt },
    { label: 'En Route to Pickup',    ts: b.driverStartedAt,       done: !!b.driverStartedAt },
    { label: 'Arrived at Pickup',     ts: b.driverArrivedAt,       done: !!b.driverArrivedAt },
    { label: 'Passenger On Board',    ts: b.passengerPickedUpAt,   done: !!b.passengerPickedUpAt },
    { label: 'Ride Completed',        ts: b.completedAt,           done: !!b.completedAt }
  ];

  return steps.map(s => `
    <div class="ds-timeline-step ${s.done ? 'ds-timeline-step--done' : ''}">
      <div class="ds-timeline-dot">
        ${s.done ? '<i data-lucide="check" class="icon-xs"></i>' : ''}
      </div>
      <div class="ds-timeline-info">
        <span class="ds-timeline-label">${s.label}</span>
        ${s.done ? `<span class="ds-timeline-time">${fmtTs(s.ts)}</span>` : ''}
      </div>
    </div>`).join('');
}

export default async function driverBookingDetails(root, { params = {}, isActive } = {}) {
  if (!requireDriverAuth(root)) return;

  const bookingId = params.id;
  if (!bookingId) {
    navigate('/driver/dashboard');
    return;
  }

  root.innerHTML = `
    <div class="ds-layout">
      <header class="ds-header">
        <div class="ds-header-inner">
          <div class="ds-header-left">
            <button class="btn btn-ghost btn-sm ds-back-btn" id="ds-back" type="button">
              <i data-lucide="arrow-left" class="icon-xs"></i> Back
            </button>
          </div>
          <div class="ds-header-right">
            <span class="ds-logo">TRAQQ</span>
          </div>
        </div>
      </header>

      <main class="ds-main" id="ds-detail-main">
        <div class="ds-skeleton-card" style="height:200px;margin-bottom:1rem;"></div>
        <div class="ds-skeleton-card" style="height:160px;margin-bottom:1rem;"></div>
        <div class="ds-skeleton-card" style="height:120px;"></div>
      </main>
    </div>`;

  root.querySelector('#ds-back')?.addEventListener('click', () => {
    navigate('/driver/dashboard');
  });

  if (window.lucide) window.lucide.createIcons();

  let booking;

  async function loadAndRender() {
    try {
      booking = await api.get(`/driver/bookings/${bookingId}`);
      if (isActive && !isActive()) return;
      renderDetail();
    } catch (err) {
      if (isActive && !isActive()) return;
      const main = root.querySelector('#ds-detail-main');
      if (main) {
        main.innerHTML = `
          <div class="empty-state">
            <p class="form-error">${err.status === 403 ? 'This booking is not assigned to you.' : (err.message || 'Failed to load booking.')}</p>
            <button class="btn btn-ghost btn-sm" id="go-back" type="button" style="margin-top:1rem;">← Back to Dashboard</button>
          </div>`;
        main.querySelector('#go-back')?.addEventListener('click', () => navigate('/driver/dashboard'));
      }
      if (window.lucide) window.lucide.createIcons();
    }
  }

  function renderDetail() {
    const main = root.querySelector('#ds-detail-main');
    if (!main) return;

    const nextStatus   = (VALID_TRANSITIONS[booking.rideStatus] || []).find(s => s !== 'CANCELLED');
    const canCancel    = VALID_TRANSITIONS[booking.rideStatus]?.includes('CANCELLED');
    const isTerminal   = booking.rideStatus === 'COMPLETED' || booking.rideStatus === 'CANCELLED';
    const nextLabel    = NEXT_ACTION_LABEL[booking.rideStatus];

    main.innerHTML = `
      <div class="ds-detail-ref">
        <span>${booking.bookingRef || `TRQ-${booking.id.slice(-8).toUpperCase()}`}</span>
        <span class="${rideStatusClass(booking.rideStatus)}">${STATUS_LABELS[booking.rideStatus] || booking.rideStatus}</span>
      </div>

      <!-- Ride Info Card -->
      <div class="ds-card">
        <p class="ds-card-title">Ride Details</p>
        <div class="ds-info-row">
          <span class="ds-info-label"><i data-lucide="calendar" class="icon-xs"></i> Date</span>
          <span class="ds-info-value">${fmtDate(booking.pickupDate)} at ${fmtTime(booking.pickupTime)}</span>
        </div>
        <div class="ds-info-row">
          <span class="ds-info-label"><i data-lucide="map-pin" class="icon-xs"></i> Pickup</span>
          <span class="ds-info-value">${escapeHtml(booking.pickupAddress)}</span>
        </div>
        <div class="ds-info-row">
          <span class="ds-info-label"><i data-lucide="plane" class="icon-xs"></i> Terminal</span>
          <span class="ds-info-value">DFW Terminal ${escapeHtml(booking.dropoffTerminal)}</span>
        </div>
        <div class="ds-info-row">
          <span class="ds-info-label"><i data-lucide="users" class="icon-xs"></i> Passengers</span>
          <span class="ds-info-value">${booking.passengerCount} passenger${booking.passengerCount !== 1 ? 's' : ''}</span>
        </div>
        ${booking.carryOnCount > 0 || booking.checkedLuggageCount > 0 ? `
        <div class="ds-info-row">
          <span class="ds-info-label"><i data-lucide="briefcase" class="icon-xs"></i> Luggage</span>
          <span class="ds-info-value">
            ${booking.carryOnCount > 0 ? `${booking.carryOnCount} carry-on` : ''}
            ${booking.carryOnCount > 0 && booking.checkedLuggageCount > 0 ? ' · ' : ''}
            ${booking.checkedLuggageCount > 0 ? `${booking.checkedLuggageCount} checked` : ''}
          </span>
        </div>` : ''}
        ${booking.airline ? `
        <div class="ds-info-row">
          <span class="ds-info-label"><i data-lucide="flag" class="icon-xs"></i> Airline</span>
          <span class="ds-info-value">${escapeHtml(booking.airline)}${booking.departureTime ? ` · Dep. ${fmtTime(booking.departureTime)}` : ''}</span>
        </div>` : ''}

        <!-- Navigation button -->
        <a
          class="btn btn-ghost btn-full"
          style="margin-top:1.25rem;"
          href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.pickupAddress)}"
          target="_blank"
          rel="noopener noreferrer"
          id="nav-btn"
        >
          <i data-lucide="navigation" class="icon-xs"></i> Navigate to Pickup
        </a>
      </div>

      <!-- Status Timeline Card -->
      <div class="ds-card">
        <p class="ds-card-title">Ride Timeline</p>
        <div class="ds-timeline">
          ${buildTimeline(booking)}
        </div>
      </div>

      <!-- Status Actions Card -->
      ${!isTerminal ? `
      <div class="ds-card" id="ds-actions-card">
        <p class="ds-card-title">Update Ride Status</p>
        <p id="status-error" class="form-error" style="display:none;"></p>

        ${nextStatus && nextLabel ? `
        <button class="btn btn-primary btn-full" id="btn-next-status" type="button">
          <i data-lucide="check-circle" class="icon-xs"></i>
          ${nextLabel}
        </button>` : ''}

        ${canCancel ? `
        <button class="btn btn-ghost btn-full ds-cancel-btn" id="btn-cancel" type="button" style="margin-top:0.75rem;">
          <i data-lucide="x-circle" class="icon-xs"></i>
          Cancel Ride
        </button>` : ''}
      </div>` : `
      <div class="ds-card" style="text-align:center;">
        <p style="color:var(--white-muted);font-size:0.875rem;">
          This ride is <strong>${STATUS_LABELS[booking.rideStatus]}</strong>. No further actions required.
        </p>
      </div>`}`;

    if (window.lucide) window.lucide.createIcons();

    // Status update handlers
    async function patchStatus(newStatus) {
      const errEl = root.querySelector('#status-error');
      const nextBtn = root.querySelector('#btn-next-status');
      const cancelBtn = root.querySelector('#btn-cancel');

      if (errEl) errEl.style.display = 'none';
      if (nextBtn) { nextBtn.disabled = true; nextBtn.textContent = 'Updating…'; }
      if (cancelBtn) cancelBtn.disabled = true;

      try {
        booking = await api.patch(`/driver/bookings/${bookingId}/status`, { status: newStatus });
        showToast(`Status updated to: ${STATUS_LABELS[newStatus] || newStatus}`, 'success');
        renderDetail(); // re-render with updated booking
      } catch (err) {
        if (errEl) {
          errEl.textContent = err.message || 'Failed to update status.';
          errEl.style.display = 'block';
        }
        if (nextBtn) { nextBtn.disabled = false; nextBtn.textContent = nextLabel || 'Update Status'; }
        if (cancelBtn) cancelBtn.disabled = false;
      }
    }

    root.querySelector('#btn-next-status')?.addEventListener('click', () => {
      if (nextStatus) patchStatus(nextStatus);
    });

    root.querySelector('#btn-cancel')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to cancel this ride?')) {
        patchStatus('CANCELLED');
      }
    });
  }

  await loadAndRender();
}
