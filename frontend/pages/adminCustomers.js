import { adminLayout } from '../utils/adminLayout.js';
import { api } from '../services/api.js';

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function payBadge(s) {
  const map = { PAID: 'status-paid', UNPAID: 'status-unpaid', FAILED: 'status-failed' };
  return s ? `<span class="status-badge ${map[s] || 'status-unpaid'}">${s}</span>` : '—';
}

export default async function adminCustomers(root, { isActive } = {}) {
  const rendered = adminLayout(root, {
    title: 'Customers',
    active: '/admin/customers',
    bodyHTML: `
      <div class="admin-stats-grid" id="cust-stats" style="grid-template-columns:repeat(3,1fr);">
        ${[1,2,3].map(() => `
          <div class="stat-card">
            <div class="stat-card-icon stat-card-icon--muted">
              <div class="skeleton" style="width:22px;height:22px;border-radius:50%;"></div>
            </div>
            <div class="stat-card-body">
              <div class="skeleton" style="height:10px;width:70%;margin-bottom:0.4rem;border-radius:4px;"></div>
              <div class="skeleton" style="height:28px;width:40%;border-radius:4px;"></div>
            </div>
          </div>`).join('')}
      </div>

      <div class="admin-panel">
        <div class="admin-panel-header">
          <div class="admin-filter-row">
            <input type="text" class="admin-search" id="cust-search" placeholder="Search name, phone, email…" />
            <select class="admin-select" id="cust-sort">
              <option value="bookings">Sort: Most Bookings</option>
              <option value="spend">Sort: Highest Spend</option>
              <option value="recent">Sort: Most Recent</option>
            </select>
          </div>
          <span class="admin-count" id="cust-count">Loading…</span>
        </div>
        <div id="customers-table-wrap">
          <div class="skeleton" style="height:300px;margin:1rem;border-radius:var(--radius-sm);"></div>
        </div>
      </div>`
  });

  if (!rendered) return;

  let customers = [];

  function buildCustomers(bookings) {
    const map = {};
    bookings.forEach(b => {
      const key = b.phoneNumber;
      if (!map[key]) {
        map[key] = {
          phone: b.phoneNumber,
          email: b.email || b.user?.email || '—',
          name: b.user?.fullName || '—',
          bookings: 0,
          paid: 0,
          totalSpend: 0,
          lastBooking: null,
          lastPayStatus: null,
        };
      }
      map[key].bookings++;
      if (b.paymentStatus === 'PAID') { map[key].paid++; map[key].totalSpend += 99; }
      map[key].lastPayStatus = b.paymentStatus;
      const d = new Date(b.createdAt);
      if (!map[key].lastBooking || d > new Date(map[key].lastBooking)) {
        map[key].lastBooking = b.createdAt;
      }
    });
    return Object.values(map);
  }

  function sortCustomers(list, by) {
    if (by === 'spend') return [...list].sort((a, b) => b.totalSpend - a.totalSpend);
    if (by === 'recent') return [...list].sort((a, b) => new Date(b.lastBooking) - new Date(a.lastBooking));
    return [...list].sort((a, b) => b.bookings - a.bookings);
  }

  function render(list) {
    root.querySelector('#cust-count').textContent = `${list.length} customer${list.length !== 1 ? 's' : ''}`;
    if (!list.length) {
      root.querySelector('#customers-table-wrap').innerHTML = `
        <div class="empty-state" style="padding:3rem;">
          <i data-lucide="users" class="icon-xl" style="color:var(--white-muted);margin-bottom:0.75rem;display:block;"></i>
          <h3>No customers found</h3>
          <p style="color:var(--white-muted);font-size:0.85rem;">Try adjusting your search criteria.</p>
        </div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    root.querySelector('#customers-table-wrap').innerHTML = `
      <div class="admin-table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Total Bookings</th>
              <th>Paid Rides</th>
              <th>Total Spent</th>
              <th>Last Booking</th>
              <th>Last Payment</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(c => `
              <tr>
                <td>${c.name}</td>
                <td style="white-space:nowrap;">${c.phone}</td>
                <td>${c.email}</td>
                <td style="text-align:center;">${c.bookings}</td>
                <td style="text-align:center;">${c.paid}</td>
                <td class="price-gold">$${c.totalSpend.toLocaleString()}</td>
                <td style="white-space:nowrap;">${fmtDate(c.lastBooking)}</td>
                <td>${payBadge(c.lastPayStatus)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    if (window.lucide) window.lucide.createIcons();
  }

  function applyFilter() {
    const q    = root.querySelector('#cust-search').value.toLowerCase().trim();
    const sort = root.querySelector('#cust-sort').value;
    const filtered = q
      ? customers.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email.toLowerCase().includes(q))
      : customers;
    render(sortCustomers(filtered, sort));
  }

  try {
    const bookings = await api.get('/bookings');
    if (isActive && !isActive()) return;

    customers = buildCustomers(bookings);
    const totalCustomers = customers.length;
    const totalRevenue = customers.reduce((s, c) => s + c.totalSpend, 0);
    const repeat = customers.filter(c => c.bookings > 1).length;

    root.querySelector('#cust-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon">
          <i data-lucide="users" class="icon-md"></i>
        </div>
        <div class="stat-card-body">
          <p class="stat-label">Total Customers</p>
          <p class="stat-value">${totalCustomers}</p>
          <p class="stat-sub">Unique phone numbers</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">
          <i data-lucide="dollar-sign" class="icon-md"></i>
        </div>
        <div class="stat-card-body">
          <p class="stat-label">Customer Revenue</p>
          <p class="stat-value" style="color:var(--gold);">$${totalRevenue.toLocaleString()}</p>
          <p class="stat-sub">From paid rides</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon stat-card-icon--green">
          <i data-lucide="repeat" class="icon-md"></i>
        </div>
        <div class="stat-card-body">
          <p class="stat-label">Repeat Customers</p>
          <p class="stat-value" style="color:#4caf50;">${repeat}</p>
          <p class="stat-sub">2+ bookings</p>
        </div>
      </div>`;
    if (window.lucide) window.lucide.createIcons();

    render(sortCustomers(customers, 'bookings'));

    root.querySelector('#cust-search').addEventListener('input', applyFilter);
    root.querySelector('#cust-sort').addEventListener('change', applyFilter);
  } catch (e) {
    root.querySelector('#customers-table-wrap').innerHTML = `
      <div class="empty-state" style="padding:2.5rem;">
        <i data-lucide="wifi-off" class="icon-xl" style="color:#ff5f5f;margin-bottom:0.75rem;display:block;"></i>
        <h3>Could not load customers</h3>
        <p style="color:var(--white-muted);font-size:0.85rem;">${e.message}</p>
      </div>`;
    root.querySelector('#cust-count').textContent = 'Error';
    root.querySelector('#cust-stats').innerHTML = '';
    if (window.lucide) window.lucide.createIcons();
  }
}
