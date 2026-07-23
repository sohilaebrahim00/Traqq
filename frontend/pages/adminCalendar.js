import { adminLayout } from '../utils/adminLayout.js';
import { api } from '../services/api.js';
import { escapeHtml } from '../utils/auth.js';

const DAY_NAMES  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function toYMD(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function statusColor(status) {
  return {
    CONFIRMED: 'var(--gold)',
    PENDING:   '#ff9f43',
    CANCELLED: '#ff5f5f',
    COMPLETED: '#64b5f6'
  }[status] || 'var(--white-muted)';
}

function shortTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${m === 0 ? '00' : '30'} ${ampm}`;
}

export default async function adminCalendar(root, { isActive } = {}) {
  adminLayout(root, {
    title: 'Calendar',
    active: '/admin/calendar',
    bodyHTML: `
      <div class="calendar-toolbar">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <button class="btn btn-ghost btn-sm" id="cal-prev">‹ Prev</button>
          <button class="btn btn-ghost btn-sm" id="cal-today">Today</button>
          <button class="btn btn-ghost btn-sm" id="cal-next">Next ›</button>
        </div>
        <h2 id="cal-title" style="color:var(--white);font-size:1.1rem;font-weight:600;"></h2>
        <div style="display:flex;gap:0.5rem;">
          <button class="btn btn-ghost btn-sm cal-view-btn${location.hash !== '#week' ? ' active' : ''}" data-view="day" id="view-day">Day</button>
          <button class="btn btn-ghost btn-sm cal-view-btn${location.hash === '#week' ? ' active' : ''}" data-view="week" id="view-week">Week</button>
        </div>
      </div>

      <div id="cal-content" style="margin-top:1.5rem;">
        <div class="skeleton" style="height:500px;border-radius:var(--radius);"></div>
      </div>`
  });

  let currentDate = new Date();
  currentDate.setHours(0,0,0,0);

  let view = 'day';
  let allBookings = [];

  async function loadBookings() {
    try {
      const res = await api.get('/bookings?limit=500');
      if (isActive && !isActive()) return;
      allBookings = Array.isArray(res) ? res : (res.bookings || []);
    } catch (e) {
      allBookings = [];
    }
    render();
  }

  function bookingsForDate(ymd) {
    return allBookings.filter(b => {
      const bDate = b.pickupDate ? new Date(b.pickupDate).toISOString().slice(0, 10) : null;
      return bDate === ymd;
    }).sort((a, b) => (a.pickupTime || '').localeCompare(b.pickupTime || ''));
  }

  function bookingCard(b, compact = false) {
    const ref = b.bookingRef ? `TRQ-${b.bookingRef}` : b.id.slice(-8).toUpperCase();
    const color = statusColor(b.bookingStatus);
    const time  = shortTime(b.pickupTime);
    const name  = b.user?.fullName || b.phoneNumber || 'Customer';
    const addr  = b.pickupAddress || '';

    if (compact) {
      return `
        <a class="cal-event-compact" data-link="/admin/booking-details?id=${b.id}" href="/admin/booking-details?id=${b.id}"
           style="border-left:3px solid ${color};" title="${escapeHtml(name)} — ${escapeHtml(addr)}">
          <span style="color:${color};font-weight:600;font-size:0.72rem;">${time}</span>
          <span style="color:var(--white);font-size:0.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(name)}</span>
        </a>`;
    }

    return `
      <a class="cal-event-card" data-link="/admin/booking-details?id=${b.id}" href="/admin/booking-details?id=${b.id}">
        <div class="cal-event-card-stripe" style="background:${color};"></div>
        <div class="cal-event-card-body">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.25rem;">
            <span style="color:${color};font-weight:700;font-size:0.85rem;">${time}</span>
            <span class="status-badge" style="background:${color}22;color:${color};font-size:0.65rem;padding:0.15rem 0.45rem;">${b.bookingStatus}</span>
          </div>
          <p style="color:var(--white);font-weight:600;margin:0 0 0.2rem;font-size:0.9rem;">${escapeHtml(name)}</p>
          ${addr ? `<p style="color:var(--white-muted);font-size:0.78rem;margin:0 0 0.2rem;line-height:1.4;">${escapeHtml(addr.slice(0, 60))}${addr.length > 60 ? '…' : ''}</p>` : ''}
          <p style="color:var(--white-muted);font-size:0.72rem;margin:0;">${ref}${b.vanCount > 1 ? ` · ${b.vanCount} vans` : ''}</p>
        </div>
      </a>`;
  }

  function renderDay(date) {
    const ymd = toYMD(date);
    const entries = bookingsForDate(ymd);
    const dayLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    root.querySelector('#cal-title').textContent = dayLabel;

    const content = root.querySelector('#cal-content');
    if (!entries.length) {
      content.innerHTML = `
        <div class="admin-card" style="text-align:center;padding:3.5rem;color:var(--white-muted);">
          <i data-lucide="calendar-x" class="icon-xl" style="display:block;margin:0 auto 1rem;opacity:0.4;"></i>
          <p>No bookings on this date.</p>
        </div>`;
    } else {
      content.innerHTML = `
        <div class="admin-card" style="padding:1.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
            <p style="color:var(--white-muted);font-size:0.85rem;">${entries.length} booking${entries.length !== 1 ? 's' : ''}</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.75rem;">
            ${entries.map(b => bookingCard(b)).join('')}
          </div>
        </div>`;
    }

    if (window.lucide) window.lucide.createIcons();
  }

  function renderWeek(date) {
    const weekStart = startOfWeek(date);
    const weekEnd   = addDays(weekStart, 6);

    const startLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel   = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    root.querySelector('#cal-title').textContent = `${startLabel} – ${endLabel}`;

    const days = Array.from({length: 7}, (_, i) => addDays(weekStart, i));
    const today = toYMD(new Date());

    const content = root.querySelector('#cal-content');
    content.innerHTML = `
      <div class="cal-week-grid">
        ${days.map(day => {
          const ymd   = toYMD(day);
          const isToday = ymd === today;
          const entries = bookingsForDate(ymd);
          return `
            <div class="cal-week-day${isToday ? ' cal-today' : ''}">
              <div class="cal-week-day-header">
                <span style="font-size:0.7rem;color:var(--white-muted);">${DAY_NAMES[day.getDay()]}</span>
                <span style="font-size:1rem;font-weight:700;color:${isToday ? 'var(--gold)' : 'var(--white)'};">${day.getDate()}</span>
              </div>
              <div class="cal-week-day-events">
                ${entries.length === 0
                  ? `<p style="font-size:0.7rem;color:var(--white-muted);text-align:center;padding:0.5rem 0;">—</p>`
                  : entries.map(b => bookingCard(b, true)).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;

    if (window.lucide) window.lucide.createIcons();
  }

  function render() {
    if (view === 'day') renderDay(currentDate);
    else renderWeek(currentDate);
  }

  function advance(dir) {
    if (view === 'day') currentDate = addDays(currentDate, dir);
    else currentDate = addDays(currentDate, dir * 7);
    render();
  }

  // Wire toolbar buttons
  root.querySelector('#cal-prev').addEventListener('click', () => advance(-1));
  root.querySelector('#cal-next').addEventListener('click', () => advance(1));
  root.querySelector('#cal-today').addEventListener('click', () => {
    currentDate = new Date();
    currentDate.setHours(0,0,0,0);
    render();
  });

  root.querySelectorAll('.cal-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      view = btn.dataset.view;
      root.querySelectorAll('.cal-view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });

  await loadBookings();
}
