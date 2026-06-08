import { adminLayout } from '../utils/adminLayout.js';
import { api } from '../services/api.js';

function fmtDateTime(d) {
  return d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

function payBadge(s) {
  const map = { PAID: 'status-paid', UNPAID: 'status-unpaid', FAILED: 'status-failed', REFUNDED: 'status-refunded' };
  return `<span class="status-badge ${map[s] || 'status-unpaid'}">${s}</span>`;
}

function statusBadge(s) {
  const map = { CONFIRMED: 'status-confirmed', PENDING: 'status-pending', CANCELLED: 'status-cancelled', COMPLETED: 'status-completed' };
  return `<span class="status-badge ${map[s] || 'status-pending'}">${s}</span>`;
}

const skeletonCard = `
  <div class="stat-card">
    <div class="stat-card-icon stat-card-icon--muted">
      <div class="skeleton" style="width:22px;height:22px;border-radius:50%;"></div>
    </div>
    <div class="stat-card-body">
      <div class="skeleton" style="height:10px;width:70%;margin-bottom:0.4rem;border-radius:4px;"></div>
      <div class="skeleton" style="height:28px;width:50%;border-radius:4px;"></div>
    </div>
  </div>`;

export default async function adminPayments(root, { isActive } = {}) {
  const rendered = adminLayout(root, {
    title: 'Payments',
    active: '/admin/payments',
    bodyHTML: `
      <div class="admin-stats-grid" id="pay-stats">
        ${Array(4).fill(skeletonCard).join('')}
      </div>

      <div class="admin-panel">
        <div class="admin-panel-header">
          <div class="admin-filter-row">
            <select class="admin-select" id="pay-filter">
              <option value="">All Payments</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
          <span class="admin-count" id="pay-count">Loading…</span>
        </div>
        <div id="payments-table-wrap">
          <div class="skeleton" style="height:300px;margin:1rem;border-radius:var(--radius-sm);"></div>
        </div>
      </div>`
  });

  if (!rendered) return;

  function render(list) {
    root.querySelector('#pay-count').textContent = `${list.length} record${list.length !== 1 ? 's' : ''}`;
    if (!list.length) {
      root.querySelector('#payments-table-wrap').innerHTML = `
        <div class="empty-state" style="padding:3rem;">
          <i data-lucide="credit-card" class="icon-xl" style="color:var(--white-muted);margin-bottom:0.75rem;display:block;"></i>
          <h3>No payment records</h3>
          <p style="color:var(--white-muted);font-size:0.85rem;">Payment records will appear here after bookings are created.</p>
        </div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    root.querySelector('#payments-table-wrap').innerHTML = `
      <div class="admin-table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Booking Ref</th>
              <th>Phone</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Payment Status</th>
              <th>Booking Status</th>
              <th>Stripe Intent</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${list.map(b => `
              <tr>
                <td><span class="booking-ref-sm">TRQ-${b.id.slice(-8).toUpperCase()}</span></td>
                <td style="white-space:nowrap;">${b.phoneNumber}</td>
                <td class="price-gold">$99.00</td>
                <td style="text-transform:uppercase;font-size:0.78rem;">USD</td>
                <td>${payBadge(b.paymentStatus)}</td>
                <td>${statusBadge(b.bookingStatus)}</td>
                <td>
                  ${b.transaction?.stripePaymentIntent
                    ? `<code style="font-size:0.7rem;color:var(--white-muted);">${b.transaction.stripePaymentIntent.slice(0, 22)}…</code>`
                    : '<span style="color:var(--white-muted);">—</span>'}
                </td>
                <td style="white-space:nowrap;">${fmtDateTime(b.createdAt)}</td>
                <td>
                  <a class="btn-view-link" data-link="/admin/booking-details?id=${b.id}" href="/admin/booking-details?id=${b.id}">
                    <i data-lucide="eye" class="icon-xs"></i> View
                  </a>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    if (window.lucide) window.lucide.createIcons();
  }

  try {
    const bookings = await api.get('/bookings');
    if (isActive && !isActive()) return;

    const paid     = bookings.filter(b => b.paymentStatus === 'PAID');
    const unpaid   = bookings.filter(b => b.paymentStatus === 'UNPAID');
    const failed   = bookings.filter(b => b.paymentStatus === 'FAILED');
    const refunded = bookings.filter(b => b.paymentStatus === 'REFUNDED');
    const revenue  = paid.length * 99;

    root.querySelector('#pay-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon">
          <i data-lucide="dollar-sign" class="icon-md"></i>
        </div>
        <div class="stat-card-body">
          <p class="stat-label">Total Revenue</p>
          <p class="stat-value" style="color:var(--gold);">$${revenue.toLocaleString()}</p>
          <p class="stat-sub">${paid.length} paid ride${paid.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon stat-card-icon--green">
          <i data-lucide="check-circle" class="icon-md"></i>
        </div>
        <div class="stat-card-body">
          <p class="stat-label">Successful</p>
          <p class="stat-value" style="color:#4caf50;">${paid.length}</p>
          <p class="stat-sub">${bookings.length ? Math.round(paid.length / bookings.length * 100) : 0}% success rate</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">
          <i data-lucide="clock" class="icon-md"></i>
        </div>
        <div class="stat-card-body">
          <p class="stat-label">Pending</p>
          <p class="stat-value" style="color:var(--gold);">${unpaid.length}</p>
          <p class="stat-sub">Awaiting payment</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon stat-card-icon--red">
          <i data-lucide="x-circle" class="icon-md"></i>
        </div>
        <div class="stat-card-body">
          <p class="stat-label">Failed</p>
          <p class="stat-value" style="color:#ff5f5f;">${failed.length + refunded.length}</p>
          <p class="stat-sub">${failed.length} failed · ${refunded.length} refunded</p>
        </div>
      </div>`;
    if (window.lucide) window.lucide.createIcons();

    let all = bookings;
    render(all);

    root.querySelector('#pay-filter').addEventListener('change', (e) => {
      const v = e.target.value;
      render(v ? all.filter(b => b.paymentStatus === v) : all);
    });
  } catch (e) {
    root.querySelector('#pay-stats').innerHTML = '';
    root.querySelector('#payments-table-wrap').innerHTML = `
      <div class="empty-state" style="padding:2.5rem;">
        <i data-lucide="wifi-off" class="icon-xl" style="color:#ff5f5f;margin-bottom:0.75rem;display:block;"></i>
        <h3>Could not load payments</h3>
        <p style="color:var(--white-muted);font-size:0.85rem;">${e.message}</p>
      </div>`;
    root.querySelector('#pay-count').textContent = 'Error';
    if (window.lucide) window.lucide.createIcons();
  }
}
