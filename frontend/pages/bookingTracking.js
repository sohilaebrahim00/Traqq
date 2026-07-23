import { api } from '../services/api.js';
import { navigate } from '../router/router.js';
import { escapeHtml } from '../utils/auth.js';

let mapInstance = null;
let driverMarker = null;

async function loadLeaflet() {
  if (window.L) return window.L;

  // Load CSS dynamically
  if (!document.querySelector('link[href*="leaflet"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  // Load JS dynamically
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="leaflet"]')) {
      const interval = setInterval(() => {
        if (window.L) {
          clearInterval(interval);
          resolve(window.L);
        }
      }, 50);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Failed to load Leaflet library.'));
    document.head.appendChild(script);
  });
}

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

function fmtTs(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function rideStatusLabel(s) {
  const map = {
    UNASSIGNED:          'Unassigned',
    ASSIGNED:            'Driver Assigned',
    DRIVER_ON_THE_WAY:   'Driver En Route',
    DRIVER_ARRIVED:      'Driver Arrived',
    PASSENGER_PICKED_UP: 'Passenger On Board',
    IN_TRANSIT:          'In Transit',
    DROPPED_OFF:         'Dropped Off',
    COMPLETED:           'Completed',
    CANCELLED:           'Cancelled'
  };
  return map[s] || s;
}

function rideStatusClass(s) {
  if (['COMPLETED'].includes(s)) return 'ds-badge ds-badge--green';
  if (['CANCELLED'].includes(s)) return 'ds-badge ds-badge--red';
  if (['UNASSIGNED'].includes(s)) return 'ds-badge ds-badge--muted';
  return 'ds-badge ds-badge--gold';
}

function buildTimeline(b) {
  const steps = [
    { label: 'Booking Confirmed',     ts: b.timeline.createdAt,           done: true },
    { label: 'Driver Assigned',       ts: b.timeline.assignedAt,          done: !!b.timeline.assignedAt },
    { label: 'Driver On The Way',     ts: b.timeline.driverStartedAt,     done: !!b.timeline.driverStartedAt },
    { label: 'Driver Arrived',        ts: b.timeline.driverArrivedAt,     done: !!b.timeline.driverArrivedAt },
    { label: 'Passenger Picked Up',   ts: b.timeline.passengerPickedUpAt, done: !!b.timeline.passengerPickedUpAt },
    { label: 'Completed',             ts: b.timeline.completedAt,         done: !!b.timeline.completedAt }
  ];

  return steps.map(s => `
    <div class="ds-timeline-step ${s.done ? 'ds-timeline-step--done' : ''}">
      <div class="ds-timeline-dot">
        ${s.done ? '<i data-lucide="check" class="icon-xs"></i>' : ''}
      </div>
      <div class="ds-timeline-info">
        <span class="ds-timeline-label">${s.label}</span>
        ${s.done && s.ts ? `<span class="ds-timeline-time">${fmtTs(s.ts)}</span>` : ''}
      </div>
    </div>`).join('');
}

export default async function bookingTracking(root, { params = {}, isActive } = {}) {
  const ref = params.ref;
  if (!ref || !/^TRQ-[0-9A-F]{8}$/i.test(ref)) {
    root.innerHTML = `
      <div class="ds-layout" style="min-height: 80vh; display: flex; align-items: center; justify-content: center;">
        <div class="ds-card" style="max-width: 420px; width: 90%; text-align: center;">
          <h2 style="margin-bottom: 0.75rem; color: var(--white);">Invalid Link</h2>
          <p style="color: var(--white-muted); margin-bottom: 1.5rem;">The booking reference provided is invalid.</p>
          <a class="btn btn-primary btn-full" data-link="/" href="/">Go to Homepage</a>
        </div>
      </div>`;
    return;
  }

  // Set initial page layout skeleton
  root.innerHTML = `
    <div class="ds-layout">
      <header class="ds-header">
        <div class="ds-header-inner">
          <div class="ds-header-left">
            <span class="ds-logo">TRAQQ</span>
            <span class="ds-role-chip" style="background: var(--gold-dim); color: var(--gold); border-color: var(--gold);">Live Tracking</span>
          </div>
          <div class="ds-header-right">
            <span style="font-size: 0.85rem; color: var(--white-muted);">Ref: <strong style="color: var(--white); font-family: monospace;">${ref.toUpperCase()}</strong></span>
          </div>
        </div>
      </header>

      <main class="ds-main">
        <div class="tr-grid">
          <!-- Left Column: Map or Empty State -->
          <div class="tr-map-section">
            <div id="tr-map-wrapper" class="tr-map-wrapper">
              <div class="ds-skeleton-card" style="height: 400px;"></div>
            </div>
          </div>

          <!-- Right Column: Status & Information -->
          <div class="tr-info-section">
            <div id="tr-status-card" class="ds-card">
              <div class="ds-skeleton-card" style="height: 100px; margin-bottom: 1rem;"></div>
              <div class="ds-skeleton-card" style="height: 120px;"></div>
            </div>

            <div id="tr-driver-card"></div>

            <div id="tr-timeline-card" class="ds-card">
              <div class="ds-skeleton-card" style="height: 200px;"></div>
            </div>
          </div>
        </div>
      </main>
    </div>`;

  if (window.lucide) window.lucide.createIcons();

  let pollingInterval = null;
  let consecutiveErrors = 0;

  async function updateMap(lat, lng) {
    try {
      const L = await loadLeaflet();
      if (isActive && !isActive()) return;

      const mapEl = document.getElementById('tr-map-container');
      if (!mapEl) return;

      if (!mapInstance) {
        mapInstance = L.map('tr-map-container', {
          zoomControl: false,
          attributionControl: false
        }).setView([lat, lng], 14);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 20
        }).addTo(mapInstance);

        L.control.zoom({ position: 'topright' }).addTo(mapInstance);
      } else {
        mapInstance.setView([lat, lng]);
      }

      const driverIcon = L.divIcon({
        className: 'tr-map-marker-driver',
        html: `
          <div class="tr-marker-pulse"></div>
          <div class="tr-marker-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 11.5v8c0 .83.67 1.5 1.5 1.5h1c.83 0 1.5-.67 1.5-1.5V18h10v1.5c0 .83.67 1.5 1.5 1.5h1c.82 0 1.5-.67 1.5-1.5v-8l-2.08-5.49zM6.85 7h10.29l1.04 3H5.81l1.04-3zM5.5 16c-.83 0-1.5-.67-1.5-1.5S4.67 13 5.5 13s1.5.67 1.5 1.5S6.33 16 5.5 16zm13 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      if (!driverMarker) {
        driverMarker = L.marker([lat, lng], { icon: driverIcon }).addTo(mapInstance);
      } else {
        driverMarker.setLatLng([lat, lng]);
      }
    } catch (err) {
      console.error('Error initializing Leaflet map:', err);
    }
  }

  function renderErrorState(message) {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    root.innerHTML = `
      <div class="ds-layout" style="min-height: 80vh; display: flex; align-items: center; justify-content: center;">
        <div class="ds-card" style="max-width: 420px; width: 90%; text-align: center;">
          <div style="margin-bottom: 1rem;">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="48" height="48" style="margin: 0 auto;">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2 style="margin-bottom: 0.75rem; color: var(--white);">${message.title}</h2>
          <p style="color: var(--white-muted); margin-bottom: 1.5rem;">${message.body}</p>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <button id="tr-retry-btn" class="btn btn-primary btn-full">${message.primaryAction}</button>
            <a class="btn btn-ghost btn-full" data-link="${message.secondaryLink}" href="${message.secondaryLink}">${message.secondaryLabel}</a>
          </div>
        </div>
      </div>`;
    const retryBtn = document.getElementById('tr-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        consecutiveErrors = 0;
        root.innerHTML = '';
        bookingTracking(root, { params: { ref }, isActive });
      });
    }
  }

  async function fetchTrackingData() {
    try {
      const data = await api.get(`/customer/bookings/${ref}/tracking`);
      if (isActive && !isActive()) return;

      // Reset error counter on success
      consecutiveErrors = 0;

      // 1. Render Status Card
      const statusCard = document.getElementById('tr-status-card');
      if (statusCard) {
        statusCard.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
            <div>
              <p class="ds-card-title" style="margin-bottom: 0.25rem;">Ride Status</p>
              <h2 style="color: var(--white); font-size: 1.5rem; font-weight: 700; margin-top: 0.25rem;">
                ${rideStatusLabel(data.rideStatus)}
              </h2>
            </div>
            <span class="${rideStatusClass(data.rideStatus)}">${data.bookingStatus}</span>
          </div>
          <div class="ds-info-row">
            <span class="ds-info-label"><i data-lucide="calendar" class="icon-xs"></i> Schedule</span>
            <span class="ds-info-value">${fmtDate(data.pickupDate)} at ${fmtTime(data.pickupTime)}</span>
          </div>
          <div class="ds-info-row">
            <span class="ds-info-label"><i data-lucide="map-pin" class="icon-xs"></i> Pickup Address</span>
            <span class="ds-info-value">${escapeHtml(data.pickupAddress)}</span>
          </div>
          <div class="ds-info-row">
            <span class="ds-info-label"><i data-lucide="compass" class="icon-xs"></i> Direction / Destination</span>
            <span class="ds-info-value">${data.tripDirection === 'POINT_TO_POINT' ? escapeHtml(data.destinationAddress || (data.bookingType ? data.bookingType.replace('_', ' ') : 'Point-to-Point')) : (data.dropoffTerminal ? `DFW Terminal ${escapeHtml(data.dropoffTerminal)}` : 'DFW Airport')}</span>
          </div>
        `;
      }

      // 2. Render Driver Card
      const driverCard = document.getElementById('tr-driver-card');
      if (driverCard) {
        if (data.driver) {
          driverCard.className = 'ds-card';
          driverCard.style.display = 'block';
          driverCard.innerHTML = `
            <p class="ds-card-title">Your Driver & Vehicle</p>
            <div class="tr-driver-profile">
              <div class="tr-driver-avatar">
                ${data.driver.profilePhoto
                  ? `<img src="${escapeHtml(data.driver.profilePhoto)}" alt="${escapeHtml(data.driver.fullName)}" />`
                  : `<i data-lucide="user" class="icon-sm" style="color: var(--gold);"></i>`
                }
              </div>
              <div class="tr-driver-info-details">
                <h3 style="color: var(--white); font-size: 1.05rem; font-weight: 600; margin-bottom: 0.2rem;">${escapeHtml(data.driver.fullName)}</h3>
                <p style="color: var(--white-muted); font-size: 0.82rem; margin-bottom: 0.5rem;">Professional Chauffeur</p>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                  <span class="tr-vehicle-tag">${escapeHtml(data.driver.vehicle.color)} ${escapeHtml(data.driver.vehicle.make)} ${escapeHtml(data.driver.vehicle.model)}</span>
                  <span class="tr-vehicle-tag" style="background: var(--gold-dim); color: var(--gold); border-color: var(--gold);">${escapeHtml(data.driver.vehicle.plate)}</span>
                </div>
              </div>
            </div>
            <div style="margin-top: 1.25rem; display: flex; gap: 0.75rem;">
              <a href="tel:${escapeHtml(data.driver.phoneNumber)}" class="btn btn-ghost btn-sm" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
                <i data-lucide="phone" class="icon-xs"></i> Call Driver
              </a>
              <div class="btn btn-ghost btn-sm" style="flex: 1; pointer-events: none; border-color: transparent; text-align: right; display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem; color: var(--gold);">
                <i data-lucide="clock" class="icon-xs"></i> ETA: ${data.eta || '10-15 mins'}
              </div>
            </div>
          `;
        } else {
          driverCard.style.display = 'none';
        }
      }

      // 3. Render Timeline Card
      const timelineCard = document.getElementById('tr-timeline-card');
      if (timelineCard) {
        timelineCard.innerHTML = `
          <p class="ds-card-title">Trip Progress</p>
          <div class="ds-timeline">
            ${buildTimeline(data)}
          </div>
        `;
      }

      // 4. Update Map or Empty State
      const mapWrapper = document.getElementById('tr-map-wrapper');
      if (mapWrapper) {
        if (data.driver && data.driver.location && data.driver.location.latitude && data.driver.location.longitude) {
          if (!document.getElementById('tr-map-container')) {
            mapWrapper.innerHTML = `<div id="tr-map-container" class="tr-map"></div>`;
          }
          await updateMap(data.driver.location.latitude, data.driver.location.longitude);
        } else {
          // Tear down map if coordinates are removed
          if (mapInstance) {
            mapInstance.remove();
            mapInstance = null;
            driverMarker = null;
          }
          mapWrapper.innerHTML = `
            <div class="tr-map-empty">
              <div class="tr-map-empty-inner">
                <div class="tr-map-empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon-lg">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                    <path d="M2 12h20"/>
                  </svg>
                </div>
                <h3>Map Location Unavailable</h3>
                <p>
                  ${data.driver 
                    ? 'Your chauffeur is assigned. Live map tracking will begin as soon as the ride starts.' 
                    : 'Your ride is confirmed. Once a professional chauffeur is assigned and the ride starts, live map location tracking will become available.'}
                </p>
              </div>
            </div>
          `;
        }
      }

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error('Error fetching tracking data:', err);

      // 404 — booking not found: stop polling, show dedicated state
      if (err.status === 404) {
        renderErrorState({
          title: 'Booking Not Found',
          body: `We could not locate a booking with reference ${ref.toUpperCase()}.`,
          primaryAction: 'Try Again',
          secondaryLink: '/booking-details',
          secondaryLabel: 'Search Booking'
        });
        return;
      }

      // All other errors (500, network, etc): track consecutive failures
      consecutiveErrors++;
      if (consecutiveErrors >= 3) {
        renderErrorState({
          title: 'Something Went Wrong',
          body: 'We\'re having trouble loading your tracking data. This may be a temporary issue.',
          primaryAction: 'Retry',
          secondaryLink: '/',
          secondaryLabel: 'Go to Homepage'
        });
      }
    }
  }

  // Load first update immediately
  await fetchTrackingData();

  // Only start polling if initial fetch didn't render a terminal error state
  if (consecutiveErrors < 3) {
    pollingInterval = setInterval(fetchTrackingData, 12000);
  }

  // Return cleanup function to stop timer and destroy map reference
  return () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
      driverMarker = null;
    }
  };
}
