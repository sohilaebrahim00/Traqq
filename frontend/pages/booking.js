import { api } from '../services/api.js';
import { navigate } from '../router/router.js';
import { escapeHtml } from '../utils/auth.js';

const STEPS = [
  'Trip Direction', 'Pickup Date', 'Pickup Time', 'Pickup Details',
  'Passengers & Vans', 'Luggage', 'Accessibility', 'Terminal', 'Flight Details', 'Contact'
];

const TERMINALS = ['A', 'B', 'C', 'D', 'E'];

function generateTimeSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    slots.push(`${h}:00`);
    slots.push(`${h}:30`);
  }
  return slots;
}

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${m === 0 ? '00' : m} ${ampm}`;
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function getDateError(dateStr) {
  if (!dateStr) return 'Please select a pickup date.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'Please enter a valid date.';

  const [y, m, d] = dateStr.split('-').map(Number);
  const currentYear = new Date().getFullYear();

  if (y < currentYear) return `Year ${y} is in the past. Please select ${currentYear} or a later year.`;
  if (y > currentYear + 10) return `Please select a date within the next 10 years.`;
  if (m < 1 || m > 12) return `"${m}" is not a valid month. Month must be between 1 and 12.`;
  if (d < 1 || d > 31) return `"${d}" is not a valid day. Day must be between 1 and 31.`;

  const selected = new Date(y, m - 1, d);
  if (selected.getFullYear() !== y || selected.getMonth() !== m - 1 || selected.getDate() !== d) {
    return `${MONTH_NAMES[m - 1]} ${y} does not have ${d} days.`;
  }

  // 24-hour advance booking rule on the frontend
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  if (selected < tomorrow) {
    return 'Bookings must be made at least 24 hours in advance. Please select tomorrow or later.';
  }

  return null;
}

// Returns which slots from a date string are within 24h of now
function slotsWithin24h(dateStr) {
  const cutoffMs = Date.now() + 24 * 60 * 60 * 1000;
  const [y, mo, d] = dateStr.split('-').map(Number);
  const within = [];
  for (let h = 0; h < 24; h++) {
    for (const min of [0, 30]) {
      const slotMs = new Date(y, mo - 1, d, h, min).getTime();
      if (slotMs < cutoffMs) within.push(`${h}:${min === 0 ? '00' : '30'}`);
    }
  }
  return within;
}

function directionLabel(d) {
  if (d === 'FROM_DFW') return 'From DFW Airport';
  if (d === 'POINT_TO_POINT') return 'Point-to-Point';
  return 'To DFW Airport';
}

const BOOKING_TYPE_LABELS = {
  AIRPORT: 'Airport',
  CONCERT: 'Concert / Event',
  HOTEL: 'Hotel',
  RESTAURANT: 'Restaurant',
  WEDDING: 'Wedding',
  PRIVATE_EVENT: 'Private Event',
  POINT_TO_POINT: 'Point-to-Point'
};

function isAirportBooking(data) {
  return data.tripDirection === 'TO_DFW' || data.tripDirection === 'FROM_DFW';
}

function addressStepLabel(tripDirection) {
  return tripDirection === 'FROM_DFW'
    ? 'Your destination address'
    : 'Your pickup address';
}

function addressStepHint(tripDirection) {
  return tripDirection === 'FROM_DFW'
    ? "Where should we drop you off? We'll navigate to your door."
    : "Where should we pick you up? We'll come directly to your door.";
}

function stepHTML(step, data) {
  switch (step) {
    case 0: return `
      <div class="step-content">
        <h2>How can we help you?</h2>
        <p class="hint">Choose your trip type to get started.</p>
        <div class="direction-grid">
          <button class="direction-btn${data.tripDirection === 'TO_DFW' ? ' selected' : ''}" data-direction="TO_DFW">
            <i data-lucide="plane-landing" class="icon-md"></i>
            <span class="direction-label">To DFW Airport</span>
            <span class="direction-sub">Pickup from your address</span>
          </button>
          <button class="direction-btn${data.tripDirection === 'FROM_DFW' ? ' selected' : ''}" data-direction="FROM_DFW">
            <i data-lucide="plane-takeoff" class="icon-md"></i>
            <span class="direction-label">From DFW Airport</span>
            <span class="direction-sub">Pickup from DFW terminal</span>
          </button>
          <button class="direction-btn${data.tripDirection === 'POINT_TO_POINT' ? ' selected' : ''}" data-direction="POINT_TO_POINT">
            <i data-lucide="map" class="icon-md"></i>
            <span class="direction-label">Other Destination</span>
            <span class="direction-sub">Concert, Hotel, Wedding &amp; more</span>
          </button>
        </div>
        ${data.tripDirection === 'POINT_TO_POINT' ? `
        <div style="margin-top:1.5rem;">
          <label class="form-label">Booking Type</label>
          <div class="booking-type-grid">
            ${Object.entries(BOOKING_TYPE_LABELS).filter(([k]) => k !== 'AIRPORT').map(([k, v]) =>
              `<button class="booking-type-btn${data.bookingType === k ? ' selected' : ''}" data-btype="${k}">${v}</button>`
            ).join('')}
          </div>
        </div>` : ''}
      </div>`;

    case 1: return `
      <div class="step-content">
        <h2>When do you need pickup?</h2>
        <input type="date" class="form-input" id="pickupDate"
          min="${tomorrowISO()}"
          value="${data.pickupDate || ''}" />
        <p id="date-inline-error" class="form-error" style="margin-top:0.5rem;min-height:1.2rem;">${data.pickupDate ? (getDateError(data.pickupDate) || '') : ''}</p>
        <p class="hint"><i data-lucide="clock" class="icon-xs" style="vertical-align:-2px;margin-right:4px;"></i>Bookings must be made at least <strong>24 hours in advance</strong>.</p>
      </div>`;

    case 2: {
      const allSlots = generateTimeSlots();
      const booked = data._bookedSlots || [];
      const within24h = data.pickupDate ? slotsWithin24h(data.pickupDate) : [];
      const slotDetails = data._slotDetails || {};

      return `
        <div class="step-content">
          <h2>What time?</h2>
          ${data._availLoading ? `<p class="availability-loading"><i data-lucide="loader-circle" class="icon-sm spin"></i> Checking availability...</p>` : ''}
          <div class="time-grid">
            ${allSlots.map(s => {
              const isWithin24h = within24h.includes(s);
              const isBooked = booked.includes(s);
              const detail = slotDetails[s] || {};
              const remaining = detail.remaining ?? 3;
              const isDisabled = isBooked || isWithin24h;
              let label = '';
              if (isWithin24h) label = '<span class="time-slot-label">Too soon</span>';
              else if (isBooked) label = '<span class="time-slot-label">Full</span>';
              else if (remaining === 2) label = '<span class="time-slot-label" style="color:var(--gold);">2 left</span>';
              else if (remaining === 1) label = '<span class="time-slot-label" style="color:#ff9f43;">1 left</span>';

              return `<button
                class="time-slot${data.pickupTime === s ? ' selected' : ''}${isDisabled ? ' booked' : ''}"
                data-time="${s}"${isDisabled ? ' disabled' : ''}>
                <span>${formatTime(s)}</span>
                ${label}
              </button>`;
            }).join('')}
          </div>
        </div>`;
    }

    case 3: {
      const isP2P = data.tripDirection === 'POINT_TO_POINT';
      const pickupLabel = isP2P ? 'Pickup address' : (data.tripDirection === 'FROM_DFW' ? 'Your destination address' : 'Your pickup address');
      const pickupHint = isP2P ? 'Where should we pick you up?' : (data.tripDirection === 'FROM_DFW' ? "Where should we drop you off? We'll navigate to your door." : "Where should we pick you up? We'll come directly to your door.");
      return `
      <div class="step-content">
        <h2>${pickupLabel}</h2>
        <div class="address-autocomplete-wrap" id="address-wrap">
          <div class="address-input-row">
            <i data-lucide="map-pin" class="address-input-icon icon-sm"></i>
            <input
              type="text"
              class="form-input address-input"
              id="pickupAddress"
              placeholder="Start typing your address..."
              value="${data.pickupAddress || ''}"
              autocomplete="off"
            />
            ${data._addressValidated ? `<span class="address-validated-icon" title="Address verified">✓</span>` : ''}
          </div>
          <div id="address-suggestions" class="address-suggestions" role="listbox" aria-label="Address suggestions"></div>
          <div id="address-loading" class="address-loading" style="display:none;">
            <i data-lucide="loader-circle" class="icon-xs spin"></i> Finding addresses…
          </div>
          ${!data._addressValidated && data.pickupAddress ? `
            <p class="address-warning">
              <i data-lucide="alert-triangle" class="icon-xs"></i>
              Please select an address from the suggestions.
            </p>` : ''}
        </div>
        <p class="hint">${pickupHint}</p>

        ${isP2P ? `
        <div style="margin-top:1.75rem;">
          <h2 style="margin-bottom:0.5rem;">Destination address</h2>
          <div class="address-autocomplete-wrap" id="dest-wrap">
            <div class="address-input-row">
              <i data-lucide="map-pin" class="address-input-icon icon-sm" style="color:var(--gold);"></i>
              <input
                type="text"
                class="form-input address-input"
                id="destinationAddress"
                placeholder="Where are we taking you?"
                value="${data.destinationAddress || ''}"
                autocomplete="off"
              />
              ${data._destValidated ? `<span class="address-validated-icon" title="Address verified">✓</span>` : ''}
            </div>
            <div id="dest-suggestions" class="address-suggestions" role="listbox"></div>
            <div id="dest-loading" class="address-loading" style="display:none;">
              <i data-lucide="loader-circle" class="icon-xs spin"></i> Finding addresses…
            </div>
            ${!data._destValidated && data.destinationAddress ? `
              <p class="address-warning">
                <i data-lucide="alert-triangle" class="icon-xs"></i>
                Please select a destination from the suggestions.
              </p>` : ''}
          </div>
          <p class="hint">Where should we drop you off?</p>
        </div>` : ''}
      </div>`;
    }

    case 4: {
      const vanCount = data.vanCount || 1;
      return `
        <div class="step-content">
          <h2>Passengers &amp; Vans</h2>

          <label class="form-label" style="margin-top:0;">Passengers</label>
          <div class="counter-group">
            <button class="counter-btn" id="dec-pax">−</button>
            <span class="counter-value" id="passengerCount">${data.passengerCount || 1}</span>
            <button class="counter-btn" id="inc-pax">+</button>
          </div>
          <p class="hint">Maximum 6 passengers per van.</p>

          <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border);">
            <label class="form-label">Number of Vans</label>
            <p class="hint" style="margin-bottom:0.75rem;margin-top:-0.25rem;">TRAQQ operates up to 3 vans simultaneously. Request multiple vans for larger groups.</p>
            <div class="counter-group">
              <button class="counter-btn" id="dec-van">−</button>
              <span class="counter-value" id="vanCount">${vanCount}</span>
              <button class="counter-btn" id="inc-van">+</button>
            </div>
            <p class="hint">Maximum 3 vans per booking.</p>
          </div>
        </div>`;
    }

    case 5: return `
      <div class="step-content">
        <h2>Luggage details</h2>
        <label class="form-label">Carry-on Bags</label>
        <input type="number" class="form-input" id="carryOnCount" min="0" value="${data.carryOnCount || 0}" />
        <label class="form-label">Checked Bags</label>
        <input type="number" class="form-input" id="checkedLuggageCount" min="0" value="${data.checkedLuggageCount || 0}" />
      </div>`;

    case 6: return `
      <div class="step-content">
        <h2>Accessibility</h2>
        <p class="hint">Do you or anyone in your party require wheelchair-accessible transportation?</p>

        <div class="direction-grid" style="grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem;">
          <button class="direction-btn${data.wheelchair === false ? ' selected' : ''}" id="wheelchair-no">
            <i data-lucide="check-circle" class="icon-md"></i>
            <span class="direction-label">No</span>
            <span class="direction-sub">Standard van seating</span>
          </button>
          <button class="direction-btn${data.wheelchair === true ? ' selected' : ''}" id="wheelchair-yes">
            <i data-lucide="accessibility" class="icon-md"></i>
            <span class="direction-label">Yes</span>
            <span class="direction-sub">Wheelchair accessible</span>
          </button>
        </div>

        ${data.wheelchair === true ? `
          <div class="wheelchair-notice" style="margin-top:1.5rem;padding:1.25rem 1.5rem;background:#1a1a2a;border:1px solid #4040aa;border-left:4px solid #6060ff;border-radius:8px;">
            <p style="margin:0 0 0.5rem;color:#9090ff;font-weight:700;font-size:0.95rem;">
              <i data-lucide="info" class="icon-xs" style="vertical-align:-2px;margin-right:6px;"></i>
              Wheelchair Service Not Available
            </p>
            <p style="margin:0 0 1rem;color:#aaaacc;font-size:0.9rem;line-height:1.7;">
              TRAQQ's current fleet does not include wheelchair-accessible vehicles.
              We're working to add this service in the future.
            </p>
            <p style="margin:0 0 0.75rem;color:#aaaacc;font-size:0.9rem;font-weight:600;">We recommend:</p>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
              <a href="https://www.uber.com/us/en/ride/uber-assist/" target="_blank" rel="noopener noreferrer"
                 class="btn btn-ghost btn-sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:0.4rem;">
                <i data-lucide="external-link" class="icon-xs"></i> Uber Assist
              </a>
              <a href="https://www.lyft.com/accessibility" target="_blank" rel="noopener noreferrer"
                 class="btn btn-ghost btn-sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:0.4rem;">
                <i data-lucide="external-link" class="icon-xs"></i> Lyft Access
              </a>
            </div>
          </div>` : ''}
      </div>`;

    case 7: {
      if (data.tripDirection === 'POINT_TO_POINT') {
        return `
          <div class="step-content">
            <h2>Almost there!</h2>
            <p class="hint">No airport terminal needed for this trip type.</p>
            <div style="margin-top:1.5rem;padding:1.25rem 1.5rem;background:#1a241a;border:1px solid #2d4a2d;border-left:4px solid #4ade80;border-radius:8px;">
              <p style="margin:0;color:#4ade80;font-size:0.95rem;font-weight:600;">✓ Point-to-Point Transfer</p>
              <p style="margin:0.5rem 0 0;color:#aaaacc;font-size:0.875rem;">Your driver will go directly from pickup to your destination.</p>
            </div>
          </div>`;
      }
      return `
        <div class="step-content">
          <h2>Which DFW terminal?</h2>
          <div class="terminal-grid">
            ${TERMINALS.map(t => `
              <button class="terminal-btn ${data.dropoffTerminal === t ? 'selected' : ''}" data-terminal="${t}">
                DFW Terminal ${t}
              </button>`).join('')}
          </div>
        </div>`;
    }

    case 8: {
      const isP2P = data.tripDirection === 'POINT_TO_POINT';
      return `
        <div class="step-content">
          <h2>${isP2P ? 'Additional details' : 'Flight details'} <span class="optional">(optional)</span></h2>
          ${isP2P ? `
          <label class="form-label">Event / Venue Name</label>
          <input type="text" class="form-input" id="airline" placeholder="e.g. American Airlines Center, Marriott Downtown" value="${data.airline || ''}" />
          <label class="form-label">Event Time</label>
          <input type="time" class="form-input" id="departureTime" value="${data.departureTime || ''}" />
          <label class="form-label">Notes for driver</label>
          <input type="text" class="form-input" id="bookingNotes" placeholder="Any special instructions..." value="${data.notes || ''}" />` : `
          <label class="form-label">Airline</label>
          <input type="text" class="form-input" id="airline" placeholder="e.g. American Airlines" value="${data.airline || ''}" />
          <label class="form-label">Departure Time</label>
          <input type="time" class="form-input" id="departureTime" value="${data.departureTime || ''}" />`}
        </div>`;
    }

    case 9: return `
      <div class="step-content">
        <h2>Contact information</h2>
        <label class="form-label">Phone Number <span class="required">*</span></label>
        <input type="tel" class="form-input" id="phoneNumber" placeholder="+1 (555) 000-0000" value="${data.phoneNumber || ''}" />
        <label class="form-label">Email <span class="optional">(optional)</span></label>
        <input type="email" class="form-input" id="email" placeholder="you@example.com" value="${data.email || ''}" />
      </div>`;

    default: return '';
  }
}

// ── Google Places Autocomplete ────────────────────────────────────────────────

let _googleMapsLoaded = false;
let _googleMapsKey = null;
let _googleMapsFetchPromise = null;
let _pendingCallbacks = [];

async function ensureGoogleMaps() {
  if (_googleMapsLoaded && window.google?.maps?.places) return true;

  if (!_googleMapsFetchPromise) {
    _googleMapsFetchPromise = (async () => {
      try {
        const config = await api.get('/config');
        _googleMapsKey = config.googleMapsApiKey || '';
        if (!_googleMapsKey) {
          console.warn('[TRAQQ Maps] GOOGLE_MAPS_API_KEY is not set — address autocomplete disabled, free-text fallback active.');
        }
      } catch (err) {
        _googleMapsKey = '';
        console.error('[TRAQQ Maps] Failed to fetch /api/config:', err.message);
      }
    })();
  }
  await _googleMapsFetchPromise;

  if (!_googleMapsKey) return false;

  if (window.google?.maps?.places) {
    _googleMapsLoaded = true;
    return true;
  }

  return new Promise((resolve) => {
    if (document.getElementById('google-maps-script')) {
      _pendingCallbacks.push(resolve);
      return;
    }
    _pendingCallbacks.push(resolve);

    window._traqq_gmaps_ready = () => {
      _googleMapsLoaded = true;
      _pendingCallbacks.forEach(cb => cb(true));
      _pendingCallbacks = [];
    };

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${_googleMapsKey}&libraries=places&callback=_traqq_gmaps_ready`;
    script.async = true;
    script.onerror = () => {
      document.getElementById('google-maps-script')?.remove();
      _pendingCallbacks.forEach(cb => cb(false));
      _pendingCallbacks = [];
    };
    document.head.appendChild(script);
  });
}

function attachFallbackSuggestions(inputEl, data, onSelect, root, opts = {}) {
  const suggestionsId = opts.suggestionsId || 'address-suggestions';
  const loadingId = opts.loadingId || 'address-loading';
  const wrapId = opts.wrapId || (opts.suggestionsId === 'dest-suggestions' ? 'dest-wrap' : 'address-wrap');
  const validatedProp = opts.fieldKey === 'destinationAddress' ? '_destValidated' : '_addressValidated';

  const suggestionsEl = root.querySelector(`#${suggestionsId}`);
  const loadingEl = root.querySelector(`#${loadingId}`);
  if (!suggestionsEl || !loadingEl) return;

  let debounceTimer = null;
  let sessionToken = null;
  let currentPredictions = [];

  inputEl.addEventListener('input', () => {
    const query = inputEl.value.trim();
    data[validatedProp] = false;

    const inputRow = inputEl.closest('.address-input-row');
    inputRow?.querySelector('.address-validated-icon')?.remove();

    clearTimeout(debounceTimer);
    suggestionsEl.innerHTML = '';
    suggestionsEl.style.display = 'none';

    if (query.length < 3) {
      loadingEl.style.display = 'none';
      return;
    }

    debounceTimer = setTimeout(() => {
      if (!window.google?.maps?.places) return;

      loadingEl.style.display = 'flex';

      if (!sessionToken) {
        sessionToken = new window.google.maps.places.AutocompleteSessionToken();
      }

      const predictionOptions = {
        input: query,
        sessionToken,
        componentRestrictions: { country: 'us' }
      };
      if (opts.types && opts.types.length) {
        predictionOptions.types = opts.types;
      }

      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        predictionOptions,
        (predictions, status) => {
          loadingEl.style.display = 'none';
          const OK = window.google.maps.places.PlacesServiceStatus.OK;

          if (status !== OK || !predictions?.length) {
            suggestionsEl.innerHTML = '<div class="address-no-results">No addresses found. Try a different search.</div>';
            suggestionsEl.style.display = 'block';
            return;
          }

          currentPredictions = predictions;
          suggestionsEl.innerHTML = predictions.map((p, i) => `
            <div class="address-suggestion-item" role="option" tabindex="0" data-index="${i}">
              <i data-lucide="map-pin" class="icon-xs address-suggestion-icon"></i>
              <span class="address-suggestion-text">${p.description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
            </div>`).join('');
          suggestionsEl.style.display = 'block';
          if (window.lucide) window.lucide.createIcons({ nodes: [suggestionsEl] });

          suggestionsEl.querySelectorAll('.address-suggestion-item').forEach(item => {
            const selectItem = () => {
              const idx = parseInt(item.dataset.index, 10);
              const prediction = currentPredictions[idx];
              if (!prediction) return;

              const placeId = prediction.place_id;
              const description = prediction.description;

              suggestionsEl.innerHTML = '';
              suggestionsEl.style.display = 'none';
              loadingEl.style.display = 'flex';
              sessionToken = null;

              const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
              placesService.getDetails(
                { placeId, fields: ['formatted_address', 'geometry', 'place_id'] },
                (place, detailStatus) => {
                  loadingEl.style.display = 'none';
                  if (detailStatus === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry) {
                    inputEl.value = place.formatted_address;
                    onSelect({
                      address: place.formatted_address,
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng(),
                      placeId: place.place_id
                    });
                  } else {
                    inputEl.value = description;
                    onSelect({ address: description, lat: null, lng: null, placeId });
                  }
                }
              );
            };

            item.addEventListener('click', selectItem);
            item.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectItem(); }
            });
          });
        }
      );
    }, 350);
  });

  document.addEventListener('click', (e) => {
    const wrapEl = root.querySelector(`#${wrapId}`);
    if (!wrapEl?.contains(e.target)) {
      suggestionsEl.innerHTML = '';
      suggestionsEl.style.display = 'none';
    }
  });
}

// ── Main booking function ─────────────────────────────────────────────────────

export default function booking(root) {
  let step = 0;
  const data = {};

  function render() {
    root.innerHTML = `
      <div class="booking-page">
        <div class="booking-container">
          <div class="step-header">
            <div class="step-indicator">Step ${step + 1} of ${STEPS.length}</div>
            <div class="step-bar">
              <div class="step-progress" style="width:${((step + 1) / STEPS.length) * 100}%"></div>
            </div>
            <p class="step-label">${STEPS[step]}</p>
          </div>

          <div class="step-body">
            ${stepHTML(step, data)}
          </div>

          <div class="step-actions">
            ${step > 0 ? `<button class="btn btn-ghost" id="prevBtn">Back</button>` : ''}
            <button class="btn btn-primary" id="nextBtn"${data.wheelchair === true ? ' disabled' : ''}>
              ${step === STEPS.length - 1 ? 'Review & Pay' : 'Continue'}
            </button>
          </div>
        </div>

        <div class="booking-summary">
          <h3>Your Booking</h3>
          ${data.tripDirection ? `<p><strong>Type:</strong> ${directionLabel(data.tripDirection)}</p>` : ''}
          ${data.bookingType && data.bookingType !== 'AIRPORT' ? `<p><strong>For:</strong> ${BOOKING_TYPE_LABELS[data.bookingType] || data.bookingType}</p>` : ''}
          ${data.pickupDate ? `<p><strong>Date:</strong> ${data.pickupDate}</p>` : ''}
          ${data.pickupTime ? `<p><strong>Time:</strong> ${formatTime(data.pickupTime)}</p>` : ''}
          ${(() => {
            if (!data.tripDirection) return '';
            if (data.tripDirection === 'FROM_DFW') {
              return [
                data.dropoffTerminal ? `<p><strong>Pickup:</strong> DFW Terminal ${escapeHtml(data.dropoffTerminal)}</p>` : '',
                data.pickupAddress ? `<p><strong>Drop-off:</strong> ${escapeHtml(data.pickupAddress)}</p>` : ''
              ].join('');
            }
            if (data.tripDirection === 'POINT_TO_POINT') {
              return [
                data.pickupAddress ? `<p><strong>Pickup:</strong> ${escapeHtml(data.pickupAddress)}</p>` : '',
                data.destinationAddress ? `<p><strong>Drop-off:</strong> ${escapeHtml(data.destinationAddress)}</p>` : ''
              ].join('');
            }
            // TO_DFW
            return [
              data.pickupAddress ? `<p><strong>Pickup:</strong> ${escapeHtml(data.pickupAddress)}</p>` : '',
              data.dropoffTerminal ? `<p><strong>Drop-off:</strong> DFW Terminal ${escapeHtml(data.dropoffTerminal)}</p>` : ''
            ].join('');
          })()}
          ${data.passengerCount ? `<p><strong>Passengers:</strong> ${data.passengerCount}</p>` : ''}
          ${(data.vanCount || 1) > 1 ? `<p><strong>Vans:</strong> ${data.vanCount}</p>` : ''}
          <div class="summary-price">
            <span>Total</span>
            <span class="price-gold">$${(99 * (data.vanCount || 1)).toFixed(2)}</span>
          </div>
        </div>
      </div>`;

    attachListeners();
    if (window.lucide) window.lucide.createIcons();

    if (step === 3) {
      initAddressAutocomplete();
      if (data.tripDirection === 'POINT_TO_POINT') {
        initDestinationAutocomplete();
      }
    }
  }

  async function initAddressAutocomplete() {
    const inputEl = root.querySelector('#pickupAddress');
    if (!inputEl) return;

    const mapsAvailable = await ensureGoogleMaps();

    if (!mapsAvailable) {
      const wrap = root.querySelector('#address-wrap');
      if (wrap) {
        const hint = document.createElement('p');
        hint.className = 'hint';
        hint.style.color = 'var(--gold)';
        hint.textContent = 'Type your full street address including city and zip code (min 10 characters).';
        wrap.appendChild(hint);
      }
      inputEl.addEventListener('input', () => {
        data.pickupAddress = inputEl.value;
        data._addressValidated = inputEl.value.trim().length >= 10;
      });
      if (data.pickupAddress) inputEl.value = data.pickupAddress;
      return;
    }

    if (window.lucide) window.lucide.createIcons();

    const onAddressSelect = ({ address, lat, lng, placeId }) => {
      data.pickupAddress = address;
      data.pickupLatitude = lat;
      data.pickupLongitude = lng;
      data.pickupPlaceId = placeId;
      data._addressValidated = true;
      inputEl.value = address;

      const inputRow = inputEl.closest('.address-input-row');
      inputRow?.querySelector('.address-validated-icon')?.remove();
      const checkEl = document.createElement('span');
      checkEl.className = 'address-validated-icon';
      checkEl.title = 'Address verified';
      checkEl.textContent = '✓';
      inputRow?.appendChild(checkEl);
      root.querySelector('#address-wrap .address-warning')?.remove();
    };

    attachFallbackSuggestions(inputEl, data, onAddressSelect, root, {
      suggestionsId: 'address-suggestions',
      loadingId: 'address-loading',
      wrapId: 'address-wrap',
      fieldKey: 'pickupAddress'
    });

    if (data.pickupAddress && !data._addressValidated) {
      inputEl.value = data.pickupAddress;
    }
  }

  async function initDestinationAutocomplete() {
    const inputEl = root.querySelector('#destinationAddress');
    if (!inputEl) return;

    const mapsAvailable = await ensureGoogleMaps();

    if (!mapsAvailable) {
      const wrap = root.querySelector('#dest-wrap');
      if (wrap) {
        const hint = document.createElement('p');
        hint.className = 'hint';
        hint.style.color = 'var(--gold)';
        hint.textContent = 'Type your full street address including city and zip code (min 10 characters).';
        wrap.appendChild(hint);
      }
      inputEl.addEventListener('input', () => {
        data.destinationAddress = inputEl.value;
        data._destValidated = inputEl.value.trim().length >= 10;
      });
      if (data.destinationAddress) inputEl.value = data.destinationAddress;
      return;
    }

    if (window.lucide) window.lucide.createIcons();

    const onDestSelect = ({ address, lat, lng, placeId }) => {
      data.destinationAddress = address;
      data.destinationLatitude = lat;
      data.destinationLongitude = lng;
      data.destinationPlaceId = placeId;
      data._destValidated = true;
      inputEl.value = address;

      const destInputRow = inputEl.closest('.address-input-row');
      destInputRow?.querySelector('.address-validated-icon')?.remove();
      const checkEl = document.createElement('span');
      checkEl.className = 'address-validated-icon';
      checkEl.title = 'Address verified';
      checkEl.textContent = '✓';
      destInputRow?.appendChild(checkEl);
      root.querySelector('#dest-wrap .address-warning')?.remove();
    };

    attachFallbackSuggestions(inputEl, data, onDestSelect, root, {
      suggestionsId: 'dest-suggestions',
      loadingId: 'dest-loading',
      wrapId: 'dest-wrap',
      fieldKey: 'destinationAddress'
    });

    if (data.destinationAddress && !data._destValidated) {
      inputEl.value = data.destinationAddress;
    }
  }

  function collectStep() {
    switch (step) {
      case 1: data.pickupDate = root.querySelector('#pickupDate')?.value; break;
      case 3:
        if (!data._addressValidated) {
          data.pickupAddress = root.querySelector('#pickupAddress')?.value;
        }
        if (data.tripDirection === 'POINT_TO_POINT' && !data._destValidated) {
          data.destinationAddress = root.querySelector('#destinationAddress')?.value;
        }
        break;
      case 5:
        data.carryOnCount = parseInt(root.querySelector('#carryOnCount')?.value || 0);
        data.checkedLuggageCount = parseInt(root.querySelector('#checkedLuggageCount')?.value || 0);
        break;
      case 8:
        data.airline = root.querySelector('#airline')?.value;
        data.departureTime = root.querySelector('#departureTime')?.value;
        if (data.tripDirection === 'POINT_TO_POINT') {
          data.notes = root.querySelector('#bookingNotes')?.value;
        }
        break;
      case 9:
        data.phoneNumber = root.querySelector('#phoneNumber')?.value;
        data.email = root.querySelector('#email')?.value;
        break;
    }
  }

  function validate() {
    if (step === 0 && !data.tripDirection) return 'Please select a trip direction.';
    if (step === 1) {
      const dateErr = getDateError(data.pickupDate);
      if (dateErr) return dateErr;
    }
    if (step === 2) {
      if (!data.pickupTime) return 'Please select a pickup time.';
      if ((data._bookedSlots || []).includes(data.pickupTime)) {
        return 'This time is fully booked. Please choose another available time.';
      }
    }
    if (step === 3) {
      const addr = data.pickupAddress?.trim();
      if (!addr) return 'Please enter your pickup address.';
      if (addr.length < 5) return 'Please enter a full address.';
      if (!data._addressValidated) {
        return 'Please select a valid address from the suggestions dropdown.';
      }
      if (data.tripDirection === 'POINT_TO_POINT') {
        const dest = data.destinationAddress?.trim();
        if (!dest || dest.length < 5) return 'Please enter your destination address.';
        if (!data._destValidated) return 'Please select a valid destination from the suggestions dropdown.';
      }
    }
    if (step === 4 && (!data.passengerCount || data.passengerCount < 1)) return 'At least 1 passenger required.';
    if (step === 6) {
      if (data.wheelchair === undefined) return 'Please answer the accessibility question.';
      if (data.wheelchair === true) return 'Wheelchair-accessible service is currently unavailable. Please use Uber Assist or Lyft Access.';
    }
    if (step === 7 && data.tripDirection !== 'POINT_TO_POINT' && !data.dropoffTerminal) return 'Please select a terminal.';
    if (step === 9) {
      const phone = data.phoneNumber?.trim() || '';
      if (!phone) return 'Phone number is required.';
      if (phone.replace(/\D/g, '').length < 10) return 'Phone number must contain at least 10 digits.';
      const email = data.email?.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'Please enter a valid email address.';
      }
    }
    return null;
  }

  function showError(msg) {
    let el = root.querySelector('.step-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'form-error step-error';
      root.querySelector('.step-actions').prepend(el);
    }
    el.textContent = msg;
  }

  function clearError() {
    const el = root.querySelector('.step-error');
    if (el) el.textContent = '';
  }

  async function next() {
    collectStep();
    const err = validate();
    if (err) { showError(err); return; }
    clearError();

    if (step === 1) {
      const btn = root.querySelector('#nextBtn');
      btn.textContent = 'Checking availability...';
      btn.disabled = true;
      try {
        const result = await api.get(`/bookings/availability?date=${data.pickupDate}`);
        data._bookedSlots = result.unavailableSlots || [];
        data._slotDetails = result.slotDetails || {};
        if (data.pickupTime && data._bookedSlots.includes(data.pickupTime)) {
          data.pickupTime = null;
        }
      } catch {
        data._bookedSlots = [];
        data._slotDetails = {};
      }
      step++;
      render();
      return;
    }

    if (step < STEPS.length - 1) {
      // For POINT_TO_POINT: skip terminal (7) and flight (8) steps
      if (data.tripDirection === 'POINT_TO_POINT' && step === 6) {
        step = 8; // jump directly to additional details (step 8)
        render();
        return;
      }
      step++;
      render();
    } else {
      await submit();
    }
  }

  async function submit() {
    const btn = root.querySelector('#nextBtn');
    btn.textContent = 'Creating booking...';
    btn.disabled = true;
    try {
      const isP2P = data.tripDirection === 'POINT_TO_POINT';
      const payload = {
        tripDirection: data.tripDirection,
        bookingType: data.bookingType || (isP2P ? 'POINT_TO_POINT' : 'AIRPORT'),
        pickupDate: data.pickupDate,
        pickupTime: data.pickupTime,
        pickupAddress: data.pickupAddress,
        pickupLatitude: data.pickupLatitude || undefined,
        pickupLongitude: data.pickupLongitude || undefined,
        pickupPlaceId: data.pickupPlaceId || undefined,
        destinationAddress: isP2P ? (data.destinationAddress || undefined) : undefined,
        destinationLatitude: isP2P ? (data.destinationLatitude || undefined) : undefined,
        destinationLongitude: isP2P ? (data.destinationLongitude || undefined) : undefined,
        destinationPlaceId: isP2P ? (data.destinationPlaceId || undefined) : undefined,
        passengerCount: parseInt(data.passengerCount),
        carryOnCount: parseInt(data.carryOnCount || 0),
        checkedLuggageCount: parseInt(data.checkedLuggageCount || 0),
        vanCount: parseInt(data.vanCount || 1),
        dropoffTerminal: isP2P ? null : (data.dropoffTerminal || undefined),
        airline: data.airline || undefined,
        departureTime: data.departureTime || undefined,
        notes: data.notes || undefined,
        phoneNumber: data.phoneNumber,
        email: data.email || undefined
      };

      const booking = await api.post('/bookings/create', payload);
      sessionStorage.setItem('traqq_booking_id', booking.id);
      sessionStorage.setItem('traqq_booking_data', JSON.stringify(booking));
      navigate('/checkout');
    } catch (e) {
      btn.textContent = 'Review & Pay';
      btn.disabled = false;
      showError(e.message || 'Booking failed. Please try again.');
    }
  }

  function attachListeners() {
    root.querySelector('#nextBtn')?.addEventListener('click', next);

    root.querySelector('#prevBtn')?.addEventListener('click', () => {
      if (step === 2) {
        data._bookedSlots = [];
        data._slotDetails = {};
        data.pickupTime = null;
      }
      // For POINT_TO_POINT going back from step 8: skip step 7
      if (data.tripDirection === 'POINT_TO_POINT' && step === 8) {
        step = 6;
      } else {
        step--;
      }
      render();
    });

    const dateInput = root.querySelector('#pickupDate');
    if (dateInput) {
      const updateDateError = () => {
        const err = getDateError(dateInput.value);
        const errEl = root.querySelector('#date-inline-error');
        if (errEl) errEl.textContent = err || '';
      };
      dateInput.addEventListener('change', updateDateError);
      dateInput.addEventListener('input', updateDateError);
    }

    root.querySelectorAll('.direction-btn[data-direction]').forEach(btn => {
      btn.addEventListener('click', () => {
        const prevDir = data.tripDirection;
        data.tripDirection = btn.dataset.direction;
        if (data.tripDirection !== 'POINT_TO_POINT') {
          // Reset P2P specific fields
          data.destinationAddress = '';
          data.destinationLatitude = undefined;
          data.destinationLongitude = undefined;
          data.destinationPlaceId = undefined;
          data._destValidated = false;
          data.bookingType = 'AIRPORT';
        } else {
          data.bookingType = data.bookingType || 'POINT_TO_POINT';
        }
        data.pickupAddress = '';
        data.pickupLatitude = undefined;
        data.pickupLongitude = undefined;
        data.pickupPlaceId = undefined;
        data._addressValidated = false;
        root.querySelectorAll('.direction-btn[data-direction]').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        clearError();
        // Re-render step 0 to show/hide booking type grid
        if (prevDir !== data.tripDirection) {
          render();
        }
      });
    });

    root.querySelectorAll('.booking-type-btn[data-btype]').forEach(btn => {
      btn.addEventListener('click', () => {
        data.bookingType = btn.dataset.btype;
        root.querySelectorAll('.booking-type-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        clearError();
      });
    });

    root.querySelectorAll('.time-slot:not(.booked)').forEach(btn => {
      btn.addEventListener('click', () => {
        data.pickupTime = btn.dataset.time;
        root.querySelectorAll('.time-slot').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        clearError();
      });
    });

    root.querySelectorAll('.terminal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        data.dropoffTerminal = btn.dataset.terminal;
        root.querySelectorAll('.terminal-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        clearError();
      });
    });

    // Passengers counter
    const decPax = root.querySelector('#dec-pax');
    const incPax = root.querySelector('#inc-pax');
    if (decPax && incPax) {
      if (!data.passengerCount) data.passengerCount = 1;
      decPax.addEventListener('click', () => {
        if (data.passengerCount > 1) {
          data.passengerCount--;
          root.querySelector('#passengerCount').textContent = data.passengerCount;
        }
      });
      incPax.addEventListener('click', () => {
        if (data.passengerCount < 6) {
          data.passengerCount++;
          root.querySelector('#passengerCount').textContent = data.passengerCount;
        }
      });
    }

    // Van count counter
    const decVan = root.querySelector('#dec-van');
    const incVan = root.querySelector('#inc-van');
    if (decVan && incVan) {
      if (!data.vanCount) data.vanCount = 1;
      decVan.addEventListener('click', () => {
        if (data.vanCount > 1) {
          data.vanCount--;
          root.querySelector('#vanCount').textContent = data.vanCount;
          // Update price in summary
          const priceEl = root.querySelector('.price-gold');
          if (priceEl) priceEl.textContent = `$${(99 * data.vanCount).toFixed(2)}`;
          const vansEl = root.querySelector('.booking-summary p strong');
          // Refresh summary van line
        }
      });
      incVan.addEventListener('click', () => {
        if (data.vanCount < 3) {
          data.vanCount++;
          root.querySelector('#vanCount').textContent = data.vanCount;
          const priceEl = root.querySelector('.price-gold');
          if (priceEl) priceEl.textContent = `$${(99 * data.vanCount).toFixed(2)}`;
        }
      });
    }

    // Wheelchair buttons
    const wheelchairNo = root.querySelector('#wheelchair-no');
    const wheelchairYes = root.querySelector('#wheelchair-yes');
    if (wheelchairNo) {
      wheelchairNo.addEventListener('click', () => {
        data.wheelchair = false;
        render();
      });
    }
    if (wheelchairYes) {
      wheelchairYes.addEventListener('click', () => {
        data.wheelchair = true;
        render();
      });
    }
  }

  render();
}
