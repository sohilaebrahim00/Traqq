import { adminLayout } from '../utils/adminLayout.js';
import { api } from '../services/api.js';
import { showToast } from '../utils/auth.js';

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function statusBadge(s) {
  const map = { CONFIRMED: 'status-confirmed', PENDING: 'status-pending', CANCELLED: 'status-cancelled', COMPLETED: 'status-completed' };
  return `<span class="status-badge ${map[s] || 'status-pending'}">${s}</span>`;
}

function payBadge(s) {
  const map = { PAID: 'status-paid', UNPAID: 'status-unpaid', FAILED: 'status-failed', REFUNDED: 'status-refunded' };
  return `<span class="status-badge ${map[s] || 'status-unpaid'}">${s}</span>`;
}

function qrBadge(qr) {
  return qr
    ? `<span style="color:#4caf50;font-size:0.78rem;font-weight:600;">✓ Ready</span>`
    : `<span style="color:var(--white-muted);font-size:0.78rem;">—</span>`;
}

function actionButtons(b) {
  const btns = [];
  if (b.bookingStatus === 'PENDING') {
    btns.push(`<button class="btn-action btn-confirm" data-action="CONFIRMED" data-id="${b.id}" title="Confirm ride">
      <i data-lucide="check" class="icon-xs"></i>
    </button>`);
  }
  if (b.bookingStatus !== 'CANCELLED' && b.bookingStatus !== 'COMPLETED') {
    btns.push(`<button class="btn-action btn-cancel" data-action="CANCELLED" data-id="${b.id}" title="Cancel ride">
      <i data-lucide="x" class="icon-xs"></i>
    </button>`);
  }
  if (b.bookingStatus === 'CONFIRMED') {
    btns.push(`<button class="btn-action btn-complete" data-action="COMPLETED" data-id="${b.id}" title="Mark completed">
      <i data-lucide="flag" class="icon-xs"></i>
    </button>`);
  }
  btns.push(`<a class="btn-view-link" data-link="/admin/booking-details?id=${b.id}" href="/admin/booking-details?id=${b.id}" title="View details">
    <i data-lucide="eye" class="icon-xs"></i> View
  </a>`);
  return `<div class="admin-actions-cell">${btns.join('')}</div>`;
}

function buildTable(list) {
  if (!list.length) return `
    <div class="empty-state" style="padding:3rem;">
      <i data-lucide="search-x" class="icon-xl" style="color:var(--white-muted);margin-bottom:0.75rem;display:block;"></i>
      <h3>No bookings found</h3>
      <p style="color:var(--white-muted);font-size:0.85rem;">Try adjusting your search or filters.</p>
    </div>`;

  return `
    <p class="admin-table-hint">← Scroll horizontally to view all columns and Actions →</p>
    <div class="admin-table-scroll">
      <table class="admin-table" style="width:max-content;min-width:1400px;">
        <thead>
          <tr>
            <th>Ref</th>
            <th>Direction</th>
            <th>Date</th>
            <th>Time</th>
            <th>Address</th>
            <th>Terminal</th>
            <th>Pax</th>
            <th>Carry-on</th>
            <th>Checked</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Payment</th>
            <th>Status</th>
            <th>QR</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(b => `
            <tr data-id="${b.id}">
              <td><span class="booking-ref-sm">TRQ-${b.id.slice(-8).toUpperCase()}</span></td>
              <td style="white-space:nowrap;">${b.tripDirection === 'FROM_DFW' ? '← From DFW' : '→ To DFW'}</td>
              <td style="white-space:nowrap;">${fmtDate(b.pickupDate)}</td>
              <td style="white-space:nowrap;">${b.pickupTime}</td>
              <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${b.pickupAddress}">${b.pickupAddress}</td>
              <td style="white-space:nowrap;">DFW ${b.dropoffTerminal}</td>
              <td>${b.passengerCount}</td>
              <td>${b.carryOnCount ?? 0}</td>
              <td>${b.checkedLuggageCount ?? 0}</td>
              <td style="white-space:nowrap;">${b.phoneNumber}</td>
              <td style="white-space:nowrap;">${b.email || '—'}</td>
              <td>${payBadge(b.paymentStatus)}</td>
              <td>${statusBadge(b.bookingStatus)}</td>
              <td>${qrBadge(b.hasQrCode)}</td>
              <td style="white-space:nowrap;">${fmtDate(b.createdAt)}</td>
              <td>${actionButtons(b)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

let modalResolve = null;

function showConfirmModal(root, message) {
  return new Promise(resolve => {
    modalResolve = resolve;
    const mo = root.querySelector('#admin-modal-overlay');
    root.querySelector('#admin-modal-message').textContent = message;
    mo.classList.add('open');
  });
}

function closeModal(root) {
  root.querySelector('#admin-modal-overlay')?.classList.remove('open');
}

export default async function adminBookings(root, { isActive } = {}) {
  const rendered = adminLayout(root, {
    title: 'Bookings',
    active: '/admin/bookings',
    bodyHTML: `
      <!-- Confirmation modal -->
      <div class="admin-modal-overlay" id="admin-modal-overlay">
        <div class="admin-modal">
          <div class="admin-modal-icon"><i data-lucide="alert-triangle" class="icon-lg"></i></div>
          <h3 class="admin-modal-title">Confirm Action</h3>
          <p class="admin-modal-body" id="admin-modal-message"></p>
          <div class="admin-modal-actions">
            <button class="btn btn-ghost btn-sm" id="modal-cancel-btn" type="button">Cancel</button>
            <button class="btn btn-primary btn-sm" id="modal-confirm-btn" type="button">Confirm</button>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="admin-panel" style="margin-bottom:1.25rem;">
        <div class="admin-panel-header">
          <div class="admin-filter-row">
            <input type="text" class="admin-search" id="search-input" placeholder="Search ref, phone, email…" />
            <select class="admin-select" id="status-filter">
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <select class="admin-select" id="pay-filter">
              <option value="">All Payments</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            <select class="admin-select" id="direction-filter">
              <option value="">All Directions</option>
              <option value="TO_DFW">To DFW</option>
              <option value="FROM_DFW">From DFW</option>
            </select>
            <select class="admin-select" id="terminal-filter">
              <option value="">All Terminals</option>
              <option value="A">Terminal A</option>
              <option value="B">Terminal B</option>
              <option value="C">Terminal C</option>
              <option value="D">Terminal D</option>
              <option value="E">Terminal E</option>
            </select>
          </div>
          <span class="admin-count" id="booking-count">Loading…</span>
        </div>
      </div>

      <!-- Table -->
      <div class="admin-panel">
        <div id="bookings-table-wrap">
          <div class="skeleton" style="height:320px;margin:1rem;border-radius:var(--radius-sm);"></div>
        </div>
      </div>`
  });

  if (!rendered) return;

  // Modal wiring
  root.querySelector('#modal-cancel-btn')?.addEventListener('click', () => {
    closeModal(root);
    if (modalResolve) { modalResolve(false); modalResolve = null; }
  });
  root.querySelector('#modal-confirm-btn')?.addEventListener('click', () => {
    closeModal(root);
    if (modalResolve) { modalResolve(true); modalResolve = null; }
  });

  let allBookings = [];

  function applyFilters() {
    const search    = root.querySelector('#search-input').value.toLowerCase().trim();
    const status    = root.querySelector('#status-filter').value;
    const pay       = root.querySelector('#pay-filter').value;
    const direction = root.querySelector('#direction-filter').value;
    const terminal  = root.querySelector('#terminal-filter').value;

    const filtered = allBookings.filter(b => {
      const ref = 'TRQ-' + b.id.slice(-8).toUpperCase();
      const matchSearch = !search ||
        ref.toLowerCase().includes(search) ||
        b.id.toLowerCase().includes(search) ||
        b.phoneNumber.includes(search) ||
        (b.email || '').toLowerCase().includes(search) ||
        (b.user?.fullName || '').toLowerCase().includes(search);
      return matchSearch &&
        (!status    || b.bookingStatus === status) &&
        (!pay       || b.paymentStatus === pay) &&
        (!direction || b.tripDirection === direction) &&
        (!terminal  || b.dropoffTerminal === terminal);
    });

    root.querySelector('#booking-count').textContent = `${filtered.length} booking${filtered.length !== 1 ? 's' : ''}`;
    root.querySelector('#bookings-table-wrap').innerHTML = buildTable(filtered);

    root.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id));
    });
    if (window.lucide) window.lucide.createIcons();
  }

  async function handleAction(newStatus, bookingId) {
    const labels = { CONFIRMED: 'confirm', CANCELLED: 'cancel', COMPLETED: 'mark as completed' };
    const warnings = {
      CANCELLED: 'This booking will be cancelled. The customer will not be automatically refunded.'
    };
    const msg = (warnings[newStatus] || '') +
      `\n\nStatus will change to: ${newStatus}.`;
    const confirmed = await showConfirmModal(root, msg.trim());
    if (!confirmed) return;

    try {
      await api.patch(`/admin/bookings/${bookingId}/status`, { status: newStatus });
      const b = allBookings.find(x => x.id === bookingId);
      if (b) b.bookingStatus = newStatus;
      applyFilters();
      showToast(`Booking ${labels[newStatus] || 'updated'} successfully.`, 'success');
    } catch (e) {
      showToast(`Failed: ${e.message}`, 'error');
    }
  }

  try {
    allBookings = await api.get('/bookings');
    // Guard: user navigated away while the fetch was in flight — stop here.
    if (isActive && !isActive()) return;
    applyFilters();

    ['#search-input', '#status-filter', '#pay-filter', '#direction-filter', '#terminal-filter'].forEach(sel => {
      const el = root.querySelector(sel);
      el?.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', applyFilters);
    });
  } catch (e) {
    if (isActive && !isActive()) return;
    const wrap = root.querySelector('#bookings-table-wrap');
    const count = root.querySelector('#booking-count');
    if (wrap) wrap.innerHTML = `
      <div class="empty-state" style="padding:2.5rem;">
        <i data-lucide="wifi-off" class="icon-xl" style="color:#ff5f5f;margin-bottom:0.75rem;display:block;"></i>
        <h3>Could not load bookings</h3>
        <p style="color:var(--white-muted);font-size:0.85rem;">${e.message}</p>
        <p style="color:var(--white-muted);font-size:0.8rem;margin-top:0.5rem;">Make sure you are signed in as an admin and the backend is running.</p>
      </div>`;
    if (count) count.textContent = 'Error';
    if (window.lucide) window.lucide.createIcons();
  }
}
