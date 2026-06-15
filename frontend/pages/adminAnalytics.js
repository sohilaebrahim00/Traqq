import { adminLayout } from '../utils/adminLayout.js';
import { api } from '../services/api.js';

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
}

function barChart(items, maxH, colorClass) {
  const maxVal = Math.max(1, ...items.map(i => i.val));
  return `
    <div class="bar-chart">
      ${items.map(i => `
        <div class="bar-col">
          <span class="bar-val">${i.label2 || i.val}</span>
          <div class="bar-bar ${colorClass}" style="height:${Math.max(4, (i.val / maxVal) * maxH)}px;"></div>
          <span class="bar-label">${i.label}</span>
        </div>`).join('')}
    </div>`;
}

function miniPie(segments) {
  return segments.map(s => `
    <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.6rem;">
      <div style="width:12px;height:12px;border-radius:3px;background:${s.color};flex-shrink:0;"></div>
      <span style="font-size:0.8rem;flex:1;color:var(--white-muted);">${s.label}</span>
      <span style="font-size:0.85rem;font-weight:600;">${s.val}</span>
      <span style="font-size:0.75rem;color:var(--white-muted);">${s.pct}%</span>
    </div>`).join('');
}

export default async function adminAnalytics(root, { isActive } = {}) {
  const rendered = adminLayout(root, {
    title: 'Analytics',
    active: '/admin/analytics',
    bodyHTML: `
      <div class="admin-stats-grid" id="analytics-stats">
        ${Array(4).fill(`
          <div class="stat-card">
            <div class="stat-card-icon stat-card-icon--muted">
              <div class="skeleton" style="width:22px;height:22px;border-radius:50%;"></div>
            </div>
            <div class="stat-card-body">
              <div class="skeleton" style="height:10px;width:70%;margin-bottom:0.4rem;border-radius:4px;"></div>
              <div class="skeleton" style="height:28px;width:50%;border-radius:4px;"></div>
            </div>
          </div>`).join('')}
      </div>

      <div class="admin-two-col" style="margin-bottom:1.5rem;">
        <div class="admin-panel">
          <div class="admin-panel-header"><h3>Daily Rides — Last 7 Days</h3></div>
          <div class="analytics-chart-wrap" id="rides-chart">
            <div class="skeleton" style="height:200px;border-radius:var(--radius-sm);"></div>
          </div>
        </div>
        <div class="admin-panel">
          <div class="admin-panel-header"><h3>Daily Revenue — Last 7 Days</h3></div>
          <div class="analytics-chart-wrap" id="revenue-chart">
            <div class="skeleton" style="height:200px;border-radius:var(--radius-sm);"></div>
          </div>
        </div>
      </div>

      <div class="admin-two-col" style="margin-bottom:1.5rem;">
        <div class="admin-panel">
          <div class="admin-panel-header"><h3>Bookings by Terminal</h3></div>
          <div class="analytics-chart-wrap" id="terminal-chart"></div>
        </div>
        <div class="admin-panel">
          <div class="admin-panel-header"><h3>Trip Direction Split</h3></div>
          <div class="analytics-chart-wrap" id="direction-chart"></div>
        </div>
      </div>

      <div class="admin-two-col">
        <div class="admin-panel">
          <div class="admin-panel-header"><h3>Booking Status Breakdown</h3></div>
          <div class="admin-panel-body" id="booking-status-chart"></div>
        </div>
        <div class="admin-panel">
          <div class="admin-panel-header"><h3>Payment Status Breakdown</h3></div>
          <div class="admin-panel-body" id="payment-status-chart"></div>
        </div>
      </div>`
  });

  if (!rendered) return;

  try {
    const bookings = await api.get('/bookings');
    if (isActive && !isActive()) return;
    const total     = bookings.length;
    const paid      = bookings.filter(b => b.paymentStatus === 'PAID');
    const confirmed = bookings.filter(b => b.bookingStatus === 'CONFIRMED');
    const conversion = total ? Math.round(paid.length / total * 100) : 0;

    // --- Today / week / month ---
    const now       = new Date();
    const todayStr  = now.toDateString();
    const weekAgo   = new Date(now.getTime() - 6 * 86400000);
    const monthAgo  = new Date(now.getTime() - 29 * 86400000);
    const todayRides  = bookings.filter(b => new Date(b.pickupDate).toDateString() === todayStr).length;
    const weeklyRides = bookings.filter(b => new Date(b.pickupDate) >= weekAgo).length;

    // --- Stat cards ---
    root.querySelector('#analytics-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon">
          <i data-lucide="layers" class="icon-md"></i>
        </div>
        <div class="stat-card-body">
          <p class="stat-label">Total Rides</p>
          <p class="stat-value">${total}</p>
          <p class="stat-sub">All time · ${todayRides} today</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">
          <i data-lucide="dollar-sign" class="icon-md"></i>
        </div>
        <div class="stat-card-body">
          <p class="stat-label">Revenue</p>
          <p class="stat-value" style="color:var(--gold);">$${paid.reduce((s, b) => s + Number(b.price || 0), 0).toLocaleString()}</p>
          <p class="stat-sub">${paid.length} paid rides</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon ${conversion >= 50 ? 'stat-card-icon--green' : ''}">
          <i data-lucide="trending-up" class="icon-md"></i>
        </div>
        <div class="stat-card-body">
          <p class="stat-label">Conversion Rate</p>
          <p class="stat-value" style="color:${conversion >= 50 ? '#4caf50' : 'var(--gold)'};">${conversion}%</p>
          <p class="stat-sub">Booking → Payment</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon stat-card-icon--green">
          <i data-lucide="check-circle" class="icon-md"></i>
        </div>
        <div class="stat-card-body">
          <p class="stat-label">Confirmed</p>
          <p class="stat-value" style="color:#4caf50;">${confirmed.length}</p>
          <p class="stat-sub">${total ? Math.round(confirmed.length/total*100) : 0}% of bookings</p>
        </div>
      </div>`;
    if (window.lucide) window.lucide.createIcons();

    // --- Daily rides + revenue (last 7 days) ---
    const days = getLast7Days();
    const dailyData = days.map(d => {
      const dayBookings = bookings.filter(b => new Date(b.pickupDate).toDateString() === d.toDateString());
      const revenue = dayBookings.filter(b => b.paymentStatus === 'PAID').reduce((s, b) => s + Number(b.price || 0), 0);
      return {
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        val: dayBookings.length,
        revenue
      };
    });
    root.querySelector('#rides-chart').innerHTML = barChart(dailyData, 160, '');

    const revenueData = dailyData.map(d => ({
      label: d.label, val: d.revenue,
      label2: d.revenue > 0 ? `$${d.revenue.toFixed(0)}` : '0'
    }));
    root.querySelector('#revenue-chart').innerHTML = barChart(revenueData, 160, 'bar-gold');

    // --- Terminal breakdown ---
    const terminals = ['A','B','C','D','E'];
    const termData  = terminals.map(t => ({
      label: `Term. ${t}`, val: bookings.filter(b => b.dropoffTerminal === t).length
    }));
    root.querySelector('#terminal-chart').innerHTML = barChart(termData, 120, 'bar-green');

    // --- Direction split ---
    const toDFW   = bookings.filter(b => b.tripDirection === 'TO_DFW').length;
    const fromDFW = bookings.filter(b => b.tripDirection === 'FROM_DFW').length;
    const dirChart = document.querySelector ? root.querySelector('#direction-chart') : null;
    if (dirChart) {
      dirChart.innerHTML = `
        <div style="display:flex;align-items:flex-end;gap:2rem;height:160px;padding:1.5rem;justify-content:center;">
          <div class="bar-col">
            <span class="bar-val">${toDFW}</span>
            <div class="bar-bar bar-gold" style="height:${Math.max(4, total ? (toDFW/total)*130 : 4)}px;width:60px;"></div>
            <span class="bar-label">→ To DFW</span>
          </div>
          <div class="bar-col">
            <span class="bar-val">${fromDFW}</span>
            <div class="bar-bar bar-green" style="height:${Math.max(4, total ? (fromDFW/total)*130 : 4)}px;width:60px;"></div>
            <span class="bar-label">← From DFW</span>
          </div>
        </div>`;
    }

    // --- Booking status breakdown ---
    const bStatuses = [
      { label: 'Confirmed', val: confirmed.length, color: '#4caf50' },
      { label: 'Pending',   val: bookings.filter(b => b.bookingStatus === 'PENDING').length,   color: 'var(--gold)' },
      { label: 'Cancelled', val: bookings.filter(b => b.bookingStatus === 'CANCELLED').length, color: '#ff5f5f' },
      { label: 'Completed', val: bookings.filter(b => b.bookingStatus === 'COMPLETED').length, color: '#64b5f6' },
    ].map(s => ({ ...s, pct: total ? Math.round(s.val/total*100) : 0 }));
    root.querySelector('#booking-status-chart').innerHTML = miniPie(bStatuses);

    // --- Payment status breakdown ---
    const pStatuses = [
      { label: 'Paid',     val: paid.length,                                                     color: '#4caf50' },
      { label: 'Unpaid',   val: bookings.filter(b => b.paymentStatus === 'UNPAID').length,   color: 'var(--gold)' },
      { label: 'Failed',   val: bookings.filter(b => b.paymentStatus === 'FAILED').length,   color: '#ff5f5f' },
      { label: 'Refunded', val: bookings.filter(b => b.paymentStatus === 'REFUNDED').length, color: '#ce93d8' },
    ].map(s => ({ ...s, pct: total ? Math.round(s.val/total*100) : 0 }));
    root.querySelector('#payment-status-chart').innerHTML = miniPie(pStatuses);

  } catch (e) {
    root.querySelector('#analytics-stats').innerHTML = `
      <div style="grid-column:1/-1;padding:1.5rem;">
        <p class="form-error">${e.message}</p>
        <p style="font-size:0.8rem;color:var(--white-muted);margin-top:0.4rem;">Make sure you are signed in as an admin.</p>
      </div>`;
  }
}
