import { api } from '../services/api.js';
import { navigate } from '../router/router.js';
import { getUser, escapeHtml } from '../utils/auth.js';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC'
  });
}

function fmtTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm   = h >= 12 ? 'PM' : 'AM';
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function rideStatusLabel(s) {
  const map = {
    UNASSIGNED:         'Unassigned',
    ASSIGNED:           'Assigned',
    DRIVER_ON_THE_WAY:  'En Route to Pickup',
    DRIVER_ARRIVED:     'Arrived at Pickup',
    PASSENGER_PICKED_UP:'Passenger On Board',
    IN_TRANSIT:         'In Transit',
    DROPPED_OFF:        'Dropped Off',
    COMPLETED:          'Completed',
    CANCELLED:          'Cancelled'
  };
  return map[s] || s;
}

function rideStatusClass(s) {
  if (['COMPLETED'].includes(s)) return 'ds-badge ds-badge--green';
  if (['CANCELLED'].includes(s)) return 'ds-badge ds-badge--red';
  if (['UNASSIGNED'].includes(s)) return 'ds-badge ds-badge--muted';
  return 'ds-badge ds-badge--gold';
}

function tripDirection(d) {
  return d === 'FROM_DFW' ? '← From DFW' : '→ To DFW';
}

function requireDriverAuth(root) {
  const user = getUser();
  if (!user) {
    root.innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-brand"><span class="auth-logo">TRAQQ</span></div>
          <h2 style="margin-bottom:0.75rem;">Sign In Required</h2>
          <p style="color:var(--white-muted);margin-bottom:1.5rem;">Please sign in as a driver to access the dashboard.</p>
          <a class="btn btn-primary btn-full" data-link="/driver/login" href="/driver/login">Sign In as Driver</a>
        </div>
      </div>`;
    return false;
  }
  if (user.role !== 'DRIVER') {
    root.innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-brand"><span class="auth-logo">TRAQQ</span></div>
          <h2 style="margin-bottom:0.75rem;">Access Denied</h2>
          <p style="color:var(--white-muted);margin-bottom:1.5rem;">Your account does not have driver access.</p>
          <a class="btn btn-ghost btn-full" data-link="/" href="/">← Back to Home</a>
        </div>
      </div>`;
    return false;
  }
  return true;
}

function renderBookingCard(b) {
  const isToday = (() => {
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
    return String(b.pickupDate).slice(0, 10) === todayStr;
  })();

  return `
    <a class="ds-ride-card ${isToday ? 'ds-ride-card--today' : ''}"
       data-link="/driver/bookings/${b.id}" href="/driver/bookings/${b.id}">
      <div class="ds-ride-card-header">
        <span class="ds-ride-ref">${escapeHtml(b.bookingRef || `TRQ-${b.id.slice(-8).toUpperCase()}`)}</span>
        <span class="${rideStatusClass(b.rideStatus)}">${rideStatusLabel(b.rideStatus)}</span>
      </div>
      <div class="ds-ride-card-body">
        <div class="ds-ride-detail">
          <span class="ds-ride-icon"><i data-lucide="clock" class="icon-xs"></i></span>
          <span>${fmtDate(b.pickupDate)} at ${fmtTime(b.pickupTime)}</span>
        </div>
        <div class="ds-ride-detail">
          <span class="ds-ride-icon"><i data-lucide="map-pin" class="icon-xs"></i></span>
          <span>${escapeHtml(b.pickupAddress)}</span>
        </div>
        <div class="ds-ride-detail">
          <span class="ds-ride-icon"><i data-lucide="plane" class="icon-xs"></i></span>
          <span>${tripDirection(b.tripDirection)} · Terminal ${escapeHtml(b.dropoffTerminal)}</span>
        </div>
        <div class="ds-ride-detail">
          <span class="ds-ride-icon"><i data-lucide="users" class="icon-xs"></i></span>
          <span>${b.passengerCount} passenger${b.passengerCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div class="ds-ride-card-footer">
        <span style="font-size:0.78rem;color:var(--white-muted);">Tap to view details →</span>
        ${isToday ? '<span class="ds-today-chip">Today</span>' : ''}
      </div>
    </a>`;
}

export default async function driverDashboard(root, { isActive } = {}) {
  if (!requireDriverAuth(root)) return;

  const user = getUser();

  root.innerHTML = `
    <div class="ds-layout">
      <header class="ds-header">
        <div class="ds-header-inner">
          <div class="ds-header-left">
            <span class="ds-logo">TRAQQ</span>
            <span class="ds-role-chip">Driver</span>
          </div>
          <div class="ds-header-right">
            <span class="ds-driver-name">${user.fullName || 'Driver'}</span>
            <button class="btn btn-ghost btn-sm" id="ds-signout" type="button">Sign Out</button>
          </div>
        </div>
      </header>

      <main class="ds-main">
        <div class="ds-welcome">
          <h1 class="ds-welcome-title">Welcome back, ${user.fullName.split(' ')[0]}</h1>
          <p class="ds-welcome-sub">Here are your assigned rides.</p>
        </div>

        <div class="ds-tabs">
          <button class="ds-tab active" data-tab="today" id="tab-today" type="button">Today</button>
          <button class="ds-tab" data-tab="upcoming" id="tab-upcoming" type="button">Upcoming</button>
          <button class="ds-tab" data-tab="all" id="tab-all" type="button">All Rides</button>
        </div>

        <div id="ds-ride-list" class="ds-ride-list">
          <div class="ds-skeleton-card"></div>
          <div class="ds-skeleton-card"></div>
          <div class="ds-skeleton-card"></div>
        </div>
      </main>
    </div>`;

  root.querySelector('#ds-signout')?.addEventListener('click', () => {
    localStorage.removeItem('traqq_access_token');
    localStorage.removeItem('traqq_refresh_token');
    localStorage.removeItem('traqq_user');
    navigate('/driver/login');
  });

  let allBookings = [];

  function renderTab(tab) {
    const list = root.querySelector('#ds-ride-list');
    if (!list) return;

    const todayStr    = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
    const tomorrowStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(Date.now() + 86400000));

    let filtered;
    if (tab === 'today') {
      filtered = allBookings.filter(b => String(b.pickupDate).slice(0, 10) === todayStr);
    } else if (tab === 'upcoming') {
      filtered = allBookings.filter(b => String(b.pickupDate).slice(0, 10) >= tomorrowStr);
    } else {
      filtered = allBookings;
    }

    if (!filtered.length) {
      list.innerHTML = `
        <div class="empty-state">
          <i data-lucide="calendar-x" class="icon-xl" style="color:var(--white-muted);margin-bottom:0.75rem;display:block;"></i>
          <h3 style="color:var(--white);">No rides found</h3>
          <p>${tab === 'today' ? "You have no rides scheduled for today." : "No rides in this range."}</p>
        </div>`;
    } else {
      list.innerHTML = filtered.map(renderBookingCard).join('');
    }
    if (window.lucide) window.lucide.createIcons();
  }

  root.querySelectorAll('.ds-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('.ds-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      renderTab(btn.dataset.tab);
    });
  });

  try {
    const data = await api.get('/driver/bookings');
    if (isActive && !isActive()) return;
    allBookings = data;
    renderTab('today');
  } catch (err) {
    if (isActive && !isActive()) return;
    const list = root.querySelector('#ds-ride-list');
    if (list) {
      list.innerHTML = `
        <div class="empty-state">
          <p class="form-error">${err.message || 'Failed to load bookings.'}</p>
          <p style="font-size:0.82rem;color:var(--white-muted);margin-top:0.5rem;">
            Make sure you are signed in as a driver and the backend is running.
          </p>
        </div>`;
    }
    if (window.lucide) window.lucide.createIcons();
  }
}
