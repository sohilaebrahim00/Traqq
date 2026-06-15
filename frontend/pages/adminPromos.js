import { adminLayout } from '../utils/adminLayout.js';
import { api } from '../services/api.js';
import { escapeHtml } from '../utils/auth.js';

function fmtDate(d) {
  return d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

function fmtMoney(val) {
  return val !== null && val !== undefined ? '$' + Number(val).toFixed(2) : '—';
}

export default async function adminPromos(root, { isActive } = {}) {
  const rendered = adminLayout(root, {
    title: 'Promo Codes',
    active: '/admin/promos',
    bodyHTML: `
      <div id="promo-content">
        <div class="skeleton" style="height:120px;border-radius:var(--radius-sm);margin-bottom:1.5rem;"></div>
        <div class="skeleton" style="height:300px;border-radius:var(--radius-sm);"></div>
      </div>`
  });

  if (!rendered) return;

  const content = root.querySelector('#promo-content');

  try {
    const { uses, summary } = await api.get('/admin/promo/usage');
    if (isActive && !isActive()) return;

    const totalSaved = uses.reduce((sum, u) => sum + Number(u.discountAmount), 0);
    const paidUses = uses.filter(u => u.booking?.paymentStatus === 'PAID');

    content.innerHTML = `
      <!-- Stats cards -->
      <div class="promo-usage-grid">
        ${summary.map(pc => `
          <div class="promo-stat-card">
            <p class="promo-stat-code">${pc.code}</p>
            <p class="promo-stat-count">${pc._count.uses}</p>
            <p class="promo-stat-label">${pc.discountPct}% off · ${pc.firstRideOnly ? 'First ride only' : 'Any ride'} · ${pc.isActive ? '✓ Active' : '✗ Inactive'}</p>
          </div>`).join('')}
        <div class="promo-stat-card">
          <p class="promo-stat-code" style="color:var(--white-muted);">Total Discount</p>
          <p class="promo-stat-count">${fmtMoney(totalSaved)}</p>
          <p class="promo-stat-label">${paidUses.length} completed rides with promo</p>
        </div>
      </div>

      <!-- Usage table -->
      <div class="admin-panel">
        <div class="admin-panel-header">
          <h3>Promo Code Usage History</h3>
          <span class="admin-count">${uses.length} use${uses.length !== 1 ? 's' : ''}</span>
        </div>
        ${uses.length ? `
        <div class="admin-table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Customer</th>
                <th>Booking Ref</th>
                <th>Discount</th>
                <th>Payment</th>
                <th>Date Used</th>
              </tr>
            </thead>
            <tbody>
              ${uses.map(u => `
                <tr>
                  <td><code style="color:var(--gold);font-size:0.85rem;">${escapeHtml(u.promoCode?.code || '—')}</code></td>
                  <td>
                    ${escapeHtml(u.user?.fullName || '—')}<br>
                    <span style="font-size:0.78rem;color:var(--white-muted);">${escapeHtml(u.booking?.phoneNumber || '')}</span>
                  </td>
                  <td>
                    <a class="btn-view-link" data-link="/admin/booking-details?id=${u.bookingId}" href="/admin/booking-details?id=${u.bookingId}">
                      ${escapeHtml(u.booking?.bookingRef || u.bookingId.slice(-8).toUpperCase())}
                    </a>
                  </td>
                  <td style="color:#4caf50;font-weight:600;">${fmtMoney(u.discountAmount)}</td>
                  <td>
                    <span class="status-badge ${u.booking?.paymentStatus === 'PAID' ? 'status-paid' : 'status-unpaid'}">
                      ${escapeHtml(u.booking?.paymentStatus || '—')}
                    </span>
                  </td>
                  <td style="white-space:nowrap;font-size:0.82rem;">${fmtDate(u.usedAt)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `
        <div class="empty-state" style="padding:3rem;">
          <i data-lucide="tag" class="icon-xl" style="color:var(--white-muted);margin-bottom:0.75rem;display:block;"></i>
          <h3 style="color:var(--white);">No promo codes used yet</h3>
          <p style="color:var(--white-muted);font-size:0.85rem;">Usage will appear here once customers redeem promo codes at checkout.</p>
          <div style="margin-top:1.5rem;padding:1rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);display:inline-block;">
            <p style="color:var(--white-muted);font-size:0.8rem;">Active promo code:</p>
            <code style="color:var(--gold);font-size:1rem;font-weight:700;">INFLUENCER15</code>
            <p style="color:var(--white-muted);font-size:0.75rem;margin-top:0.25rem;">15% off first ride · Unlimited uses</p>
          </div>
        </div>`}
      </div>`;

    if (window.lucide) window.lucide.createIcons();
  } catch (e) {
    if (isActive && !isActive()) return;
    content.innerHTML = `
      <div class="empty-state" style="padding:3rem;">
        <p class="form-error">${e.message || 'Failed to load promo usage.'}</p>
      </div>`;
    if (window.lucide) window.lucide.createIcons();
  }
}
