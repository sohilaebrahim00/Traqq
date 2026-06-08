import { adminLayout } from '../utils/adminLayout.js';
import { api } from '../services/api.js';
import { showToast } from '../utils/auth.js';

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function fmtDateTime(d) {
  return d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

function statusBadge(s) {
  const map = { CONFIRMED: 'status-confirmed', PENDING: 'status-pending', CANCELLED: 'status-cancelled', COMPLETED: 'status-completed' };
  return `<span class="status-badge ${map[s] || 'status-pending'}">${s}</span>`;
}

function payBadge(s) {
  const map = { PAID: 'status-paid', UNPAID: 'status-unpaid', FAILED: 'status-failed', REFUNDED: 'status-refunded' };
  return `<span class="status-badge ${map[s] || 'status-unpaid'}">${s}</span>`;
}

function row(label, value) {
  return `
    <div class="admin-detail-row">
      <span class="admin-detail-label">${label}</span>
      <span class="admin-detail-value">${value ?? '—'}</span>
    </div>`;
}

export default async function adminBookingDetails(root, { params, isActive } = {}) {
  const bookingId = params?.id;

  const rendered = adminLayout(root, {
    title: 'Booking Details',
    active: '/admin/bookings',
    bodyHTML: `
      <div class="admin-back-row">
        <a class="btn btn-ghost btn-sm" data-link="/admin/bookings" href="/admin/bookings">
          <i data-lucide="arrow-left" class="icon-xs"></i> Back to Bookings
        </a>
      </div>
      <div id="detail-content">
        <div class="skeleton" style="height:400px;border-radius:var(--radius);"></div>
      </div>`
  });

  if (!rendered) return;

  if (!bookingId) {
    root.querySelector('#detail-content').innerHTML = `
      <div class="admin-detail-card" style="text-align:center;padding:3rem;">
        <i data-lucide="alert-circle" class="icon-xl" style="color:#ff5f5f;margin-bottom:1rem;display:block;"></i>
        <h3>No Booking ID</h3>
        <p style="color:var(--white-muted);margin-top:0.5rem;">No booking ID was provided in the URL.</p>
      </div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  try {
    const booking = await api.get(`/bookings/${bookingId}`);
    if (isActive && !isActive()) return;
    
    let availableDrivers = [];
    if (!booking.driverId && booking.bookingStatus === 'CONFIRMED' && booking.paymentStatus === 'PAID') {
      try {
        const drivers = await api.get('/admin/drivers');
        availableDrivers = drivers.filter(d => d.isAvailable);
      } catch (e) {
        console.error('Failed to load drivers', e);
      }
    }

    const ref = 'TRQ-' + booking.id.slice(-8).toUpperCase();
    const hasQR = !!booking.qrCode;

    root.querySelector('#detail-content').innerHTML = `
      <!-- Status + actions bar -->
      <div class="admin-detail-actions">
        ${booking.bookingStatus === 'PENDING' ? `
          <button class="btn btn-primary btn-sm" id="btn-confirm" type="button">
            <i data-lucide="check" class="icon-xs"></i> Confirm Ride
          </button>` : ''}
        ${booking.bookingStatus !== 'CANCELLED' && booking.bookingStatus !== 'COMPLETED' ? `
          <button class="btn btn-ghost btn-sm" id="btn-cancel" type="button" style="color:#ff5f5f;border-color:rgba(255,95,95,0.4);">
            <i data-lucide="x" class="icon-xs"></i> Cancel Ride
          </button>` : ''}
        ${booking.bookingStatus === 'CONFIRMED' ? `
          <button class="btn btn-ghost btn-sm" id="btn-complete" type="button" style="color:#64b5f6;border-color:rgba(100,181,246,0.4);">
            <i data-lucide="flag" class="icon-xs"></i> Mark Completed
          </button>` : ''}
        ${hasQR ? `
          <a class="btn btn-ghost btn-sm" href="/verify-booking?id=${booking.id}" target="_blank" rel="noopener noreferrer">
            <i data-lucide="qr-code" class="icon-xs"></i> Verify QR
          </a>` : ''}
      </div>

      <!-- 2-col detail grid -->
      <div class="admin-detail-grid">

        <!-- Booking Summary -->
        <div class="admin-detail-card">
          <p class="admin-detail-card-title">
            <i data-lucide="file-text" class="icon-xs"></i> Booking Summary
          </p>
          ${row('Booking Ref', `<span class="booking-ref-sm">${ref}</span>`)}
          ${row('Booking ID', `<code style="font-size:0.72rem;color:var(--white-muted);">${booking.id}</code>`)}
          ${row('Trip Direction', booking.tripDirection === 'FROM_DFW' ? '← From DFW' : '→ To DFW')}
          ${row('Pickup Date', fmtDate(booking.pickupDate))}
          ${row('Pickup Time', booking.pickupTime)}
          ${row('Pickup Address', booking.pickupAddress)}
          ${row('DFW Terminal', `DFW Terminal ${booking.dropoffTerminal}`)}
          ${booking.airline ? row('Airline', booking.airline) : ''}
          ${booking.departureTime ? row('Flight Departure', booking.departureTime) : ''}
          ${row('Created', fmtDateTime(booking.createdAt))}
        </div>

        <!-- Customer + Passengers -->
        <div class="admin-detail-card">
          <p class="admin-detail-card-title">
            <i data-lucide="user" class="icon-xs"></i> Customer
          </p>
          ${row('Full Name', booking.user?.fullName || '—')}
          ${row('Phone', booking.phoneNumber)}
          ${row('Email', booking.email || booking.user?.email || '—')}
          <br>
          <p class="admin-detail-card-title" style="margin-top:1rem;">
            <i data-lucide="users" class="icon-xs"></i> Passengers & Luggage
          </p>
          ${row('Passengers', booking.passengerCount + ' / 6 max')}
          ${row('Carry-on Bags', booking.carryOnCount ?? 0)}
          ${row('Checked Bags', booking.checkedLuggageCount ?? 0)}
        </div>

        <!-- Payment -->
        <div class="admin-detail-card">
          <p class="admin-detail-card-title">
            <i data-lucide="credit-card" class="icon-xs"></i> Payment
          </p>
          ${row('Amount', '<span style="color:var(--gold);font-weight:700;">$99.00 USD</span>')}
          ${row('Payment Status', payBadge(booking.paymentStatus))}
          ${row('Booking Status', statusBadge(booking.bookingStatus))}
          ${booking.transaction?.stripePaymentIntent
            ? row('Stripe Intent', `<code style="font-size:0.7rem;color:var(--white-muted);">${booking.transaction.stripePaymentIntent.slice(0, 28)}…</code>`)
            : row('Stripe Intent', '—')}
        </div>

        <!-- QR Code -->
        <div class="admin-detail-card">
          <p class="admin-detail-card-title">
            <i data-lucide="qr-code" class="icon-xs"></i> QR Code
          </p>
          ${hasQR ? `
            <div style="text-align:center;padding:0.5rem 0 1rem;">
              <img src="${booking.qrCode}" alt="Booking QR" style="max-width:180px;border-radius:8px;border:1px solid var(--border);">
              <p style="font-size:0.75rem;color:var(--white-muted);margin-top:0.75rem;">
                Scan to verify at pickup. Valid for confirmed + paid bookings only.
              </p>
              <a class="btn-view-link" style="display:inline-flex;margin-top:0.75rem;"
                 data-link="/verify-booking?id=${booking.id}" href="/verify-booking?id=${booking.id}">
                <i data-lucide="external-link" class="icon-xs"></i> Open Verification Page
              </a>
            </div>` : `
            <div style="text-align:center;padding:1.5rem 0;">
              <i data-lucide="qr-code" class="icon-xl" style="color:var(--white-muted);margin-bottom:0.75rem;display:block;opacity:0.4;"></i>
              <p style="color:var(--white-muted);font-size:0.85rem;">
                QR code is generated automatically after<br>successful Stripe payment.
              </p>
            </div>`}
        </div>

        <!-- Driver Assignment -->
        <div class="admin-detail-card">
          <p class="admin-detail-card-title">
            <i data-lucide="steering-wheel" class="icon-xs"></i> Driver & Vehicle
          </p>
          ${booking.driver ? `
            <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid var(--border);">
              <div style="width:40px;height:40px;border-radius:50%;background:var(--gold-dim);color:var(--gold);display:flex;align-items:center;justify-content:center;font-weight:600;overflow:hidden;">
                ${booking.driver.profilePhoto 
                  ? `<img src="${booking.driver.profilePhoto}" style="width:100%;height:100%;object-fit:cover;">`
                  : booking.driver.user?.fullName?.charAt(0) || 'D'}
              </div>
              <div>
                <p style="color:var(--white);font-weight:600;">${booking.driver.user?.fullName || 'Assigned Driver'}</p>
                <p style="font-size:0.8rem;color:var(--white-muted);">${booking.driver.user?.phoneNumber || ''}</p>
              </div>
            </div>
            ${row('Vehicle', `${booking.driver.vehicleColor} ${booking.driver.vehicleMake} ${booking.driver.vehicleModel}`)}
            ${row('License Plate', `<span style="color:var(--gold);font-family:monospace;">${booking.driver.vehiclePlate}</span>`)}
            ${row('Ride Status', `<span class="status-badge status-confirmed">${booking.rideStatus}</span>`)}
          ` : availableDrivers.length > 0 ? `
            <div style="margin-top:0.5rem;">
              <label class="form-label">Assign a Driver</label>
              <div style="display:flex; gap:0.5rem;">
                <select id="assign-driver-select" class="form-input" style="flex:1;">
                  <option value="">-- Select Driver --</option>
                  ${availableDrivers.map(d => `<option value="${d.id}">${d.fullName} (${d.vehicleMake} ${d.vehicleModel})</option>`).join('')}
                </select>
                <button class="btn btn-primary" id="btn-assign-driver" type="button" style="white-space:nowrap;">Assign</button>
              </div>
              <p id="assign-error" class="form-error" style="display:none;margin-top:0.5rem;"></p>
            </div>
          ` : `
            <div style="text-align:center;padding:1.5rem 0;">
              <i data-lucide="car-front" class="icon-xl" style="color:var(--white-muted);margin-bottom:0.75rem;display:block;opacity:0.4;"></i>
              <p style="color:var(--white-muted);font-size:0.85rem;">
                ${(booking.bookingStatus === 'CONFIRMED' && booking.paymentStatus === 'PAID') 
                  ? 'No available drivers found.' 
                  : 'Booking must be CONFIRMED and PAID<br>to assign a driver.'}
              </p>
            </div>
          `}
        </div>

      </div>`;

    if (window.lucide) window.lucide.createIcons();

    // Action button handlers
    async function updateStatus(newStatus, label) {
      try {
        await api.patch(`/admin/bookings/${booking.id}/status`, { status: newStatus });
        showToast(`Booking ${label} successfully.`, 'success');
        window.location.href = `/admin/booking-details?id=${booking.id}`;
      } catch (e) {
        showToast(`Failed: ${e.message}`, 'error');
      }
    }

    root.querySelector('#btn-confirm')?.addEventListener('click', () => updateStatus('CONFIRMED', 'confirmed'));
    root.querySelector('#btn-cancel')?.addEventListener('click', () => updateStatus('CANCELLED', 'cancelled'));
    root.querySelector('#btn-complete')?.addEventListener('click', () => updateStatus('COMPLETED', 'marked as completed'));

    // Driver Assignment Handler
    const assignBtn = root.querySelector('#btn-assign-driver');
    if (assignBtn) {
      assignBtn.addEventListener('click', async () => {
        const driverId = root.querySelector('#assign-driver-select').value;
        const errEl = root.querySelector('#assign-error');
        errEl.style.display = 'none';
        
        if (!driverId) {
          errEl.textContent = 'Please select a driver.';
          errEl.style.display = 'block';
          return;
        }

        assignBtn.disabled = true;
        assignBtn.textContent = 'Assigning...';

        try {
          await api.patch(`/admin/bookings/${booking.id}/assign`, { driverId });
          showToast('Driver assigned successfully.', 'success');
          window.location.href = `/admin/booking-details?id=${booking.id}`;
        } catch (e) {
          errEl.textContent = e.error || e.message || 'Failed to assign driver.';
          errEl.style.display = 'block';
          assignBtn.disabled = false;
          assignBtn.textContent = 'Assign';
        }
      });
    }

  } catch (e) {
    root.querySelector('#detail-content').innerHTML = `
      <div class="admin-detail-card" style="text-align:center;padding:3rem;">
        <i data-lucide="alert-circle" class="icon-xl" style="color:#ff5f5f;margin-bottom:1rem;display:block;"></i>
        <h3>Booking Not Found</h3>
        <p style="color:var(--white-muted);margin-top:0.5rem;">${e.message}</p>
        <a class="btn btn-primary btn-sm" style="margin-top:1.5rem;display:inline-flex;" data-link="/admin/bookings" href="/admin/bookings">
          Back to Bookings
        </a>
      </div>`;
    if (window.lucide) window.lucide.createIcons();
  }
}
