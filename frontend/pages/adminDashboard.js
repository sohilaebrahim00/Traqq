import { adminLayout } from '../utils/adminLayout.js';
import { api } from '../services/api.js';
import { escapeHtml } from '../utils/auth.js';

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function statusBadge(s) {
  const map = {
    CONFIRMED: 'status-confirmed', PENDING: 'status-pending',
    CANCELLED: 'status-cancelled', COMPLETED: 'status-completed'
  };
  return `<span class="status-badge ${map[s] || 'status-pending'}">${s}</span>`;
}

function payBadge(s) {
  const map = { PAID: 'status-paid', UNPAID: 'status-unpaid', FAILED: 'status-failed', REFUNDED: 'status-refunded' };
  return `<span class="status-badge ${map[s] || 'status-unpaid'}">${s}</span>`;
}

function statCard(icon, iconClass, label, value, sub, valueColor) {
  return `
    <div class="stat-card">
      <div class="stat-card-icon ${iconClass}">
        <i data-lucide="${icon}" class="icon-md"></i>
      </div>
      <div class="stat-card-body">
        <p class="stat-label">${label}</p>
        <p class="stat-value" ${valueColor ? `style="color:${valueColor};"` : ''}>${value}</p>
        <p class="stat-sub">${sub}</p>
      </div>
    </div>`;
}

const skeletonCard = `
  <div class="stat-card">
    <div class="stat-card-icon stat-card-icon--muted">
      <div class="skeleton" style="width:22px;height:22px;border-radius:50%;"></div>
    </div>
    <div class="stat-card-body">
      <div class="skeleton" style="height:10px;width:70%;margin-bottom:0.5rem;border-radius:4px;"></div>
      <div class="skeleton" style="height:28px;width:50%;margin-bottom:0.35rem;border-radius:4px;"></div>
      <div class="skeleton" style="height:9px;width:80%;border-radius:4px;"></div>
    </div>
  </div>`;

export default async function adminDashboard(root, { isActive } = {}) {
  const rendered = adminLayout(root, {
    title: 'Dashboard',
    active: '/admin',
    bodyHTML: `
      <div class="admin-stats-grid-7" id="stats-grid">
        ${Array(7).fill(skeletonCard).join('')}
      </div>

      <div class="admin-two-col">
        <div class="admin-panel">
          <div class="admin-panel-header">
            <h3>Recent Bookings</h3>
            <a class="btn-view-link" data-link="/admin/bookings" href="/admin/bookings">
              <i data-lucide="arrow-right" class="icon-xs"></i> View All
            </a>
          </div>
          <div id="recent-bookings">
            <div class="skeleton" style="height:220px;margin:1rem;border-radius:var(--radius-sm);"></div>
          </div>
        </div>

        <div class="admin-panel">
          <div class="admin-panel-header"><h3>Quick Actions</h3></div>
          <div class="admin-quick-actions">
            <a class="admin-action-card" data-link="/admin/bookings" href="/admin/bookings">
              <span class="admin-action-icon"><i data-lucide="calendar-range" class="icon-lg"></i></span>
              <span>Manage Bookings</span>
            </a>
            <a class="admin-action-card" data-link="/admin/customers" href="/admin/customers">
              <span class="admin-action-icon"><i data-lucide="users" class="icon-lg"></i></span>
              <span>View Customers</span>
            </a>
            <a class="admin-action-card" data-link="/admin/payments" href="/admin/payments">
              <span class="admin-action-icon"><i data-lucide="credit-card" class="icon-lg"></i></span>
              <span>Track Payments</span>
            </a>
            <a class="admin-action-card" data-link="/admin/analytics" href="/admin/analytics">
              <span class="admin-action-icon"><i data-lucide="bar-chart-2" class="icon-lg"></i></span>
              <span>Analytics</span>
            </a>
          </div>
        </div>
      </div>`
  });

  // Auth guard fired — adminLayout showed Sign In / Access Denied page, stop here
  if (!rendered) return;

  const statsGrid = root.querySelector('#stats-grid');
  const recentDiv = root.querySelector('#recent-bookings');

  function showError(msg) {
    if (statsGrid) {
      statsGrid.innerHTML = `
        <div style="grid-column:1/-1;padding:1.5rem;">
          <p class="form-error" style="margin-bottom:0.5rem;">${msg}</p>
          <p style="font-size:0.8rem;color:var(--white-muted);">Make sure you are signed in as admin and the backend is running on port 4000.</p>
        </div>`;
    }
    if (recentDiv) {
      recentDiv.innerHTML = `
        <div class="empty-state" style="padding:2rem;">
          <p style="color:var(--white-muted);font-size:0.85rem;">Could not load recent bookings.</p>
        </div>`;
    }
  }

  try {
    const [overviewRes, bookings] = await Promise.all([
      api.get('/admin/overview'),
      api.get('/bookings')
    ]);
    if (isActive && !isActive()) return;
    const s = overviewRes.stats;

    if (statsGrid) {
      statsGrid.innerHTML =
        statCard('layers',       '',                      'Total Bookings',   s.total,                          'All time',                         'var(--white)') +
        statCard('check-circle', 'stat-card-icon--green', 'Confirmed',        s.confirmed,                      `${s.total ? Math.round(s.confirmed/s.total*100) : 0}% of bookings`, '#4caf50') +
        statCard('clock',        '',                      'Pending',          s.pending,                        'Awaiting confirmation',            'var(--gold)') +
        statCard('dollar-sign',  '',                      'Revenue',          `$${s.revenue.toLocaleString()}`, `${s.paid} paid ride${s.paid !== 1 ? 's' : ''}`, 'var(--gold)') +
        statCard('calendar',     '',                      "Today's Rides",    s.todayRides,                     'Scheduled for today',              'var(--white)') +
        statCard('x-circle',     'stat-card-icon--red',   'Failed Payments',  s.failed,                         'Stripe failures',                  '#ff5f5f') +
        statCard('qr-code',      'stat-card-icon--green', 'QR Generated',     s.withQR,                         'Confirmed + paid bookings',        '#4caf50');
    }

    if (window.lucide) window.lucide.createIcons();

    const recent = bookings.slice(0, 8);
    if (recentDiv) {
      recentDiv.innerHTML = recent.length
        ? `<div class="admin-table-scroll">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Ref</th><th>Customer</th><th>Direction</th>
                  <th>Date</th><th>Terminal</th><th>Payment</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                ${recent.map(b => `
                  <tr>
                    <td><span class="booking-ref-sm">${escapeHtml(b.bookingRef || ('TRQ-'+b.id.slice(-8).toUpperCase()))}</span></td>
                    <td>${escapeHtml(b.user?.fullName || b.phoneNumber)}</td>
                    <td>${b.tripDirection === 'FROM_DFW' ? '← From DFW' : '→ To DFW'}</td>
                    <td>${fmtDate(b.pickupDate)}</td>
                    <td>DFW ${escapeHtml(b.dropoffTerminal)}</td>
                    <td>${payBadge(b.paymentStatus)}</td>
                    <td>${statusBadge(b.bookingStatus)}</td>
                    <td>
                      <a class="btn-view-link" data-link="/admin/booking-details?id=${b.id}" href="/admin/booking-details?id=${b.id}">
                        View
                      </a>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`
        : `<div class="empty-state" style="padding:2.5rem;">
            <i data-lucide="inbox" class="icon-xl" style="color:var(--white-muted);margin-bottom:0.75rem;display:block;"></i>
            <h3 style="color:var(--white);">No bookings yet</h3>
            <p style="color:var(--white-muted);font-size:0.85rem;">Bookings will appear here once customers start reserving rides.</p>
          </div>`;
    }

    if (window.lucide) window.lucide.createIcons();
  } catch (e) {
    showError(e.message);
    if (window.lucide) window.lucide.createIcons();
  }
}
