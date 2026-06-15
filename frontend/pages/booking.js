import { api } from '../services/api.js';
import { navigate } from '../router/router.js';
import { escapeHtml } from '../utils/auth.js';

const STEPS = [
  'Trip Direction', 'Pickup Date', 'Pickup Time', 'Pickup Address',
  'Passengers', 'Luggage', 'Terminal', 'Flight Details', 'Contact'
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

function todayISO() {
  const d = new Date();
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

  // Catch impossible combinations: Feb 30/31, Apr/Jun/Sep/Nov 31, etc.
  const selected = new Date(y, m - 1, d);
  if (selected.getFullYear() !== y || selected.getMonth() !== m - 1 || selected.getDate() !== d) {
    return `${MONTH_NAMES[m - 1]} ${y} does not have ${d} days.`;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selected < today) return 'Please select today or a future pickup date.';

  return null;
}

function directionLabel(d) {
  return d === 'FROM_DFW' ? 'From DFW Airport' : 'To DFW Airport';
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
        <h2>Where are you going?</h2>
        <p class="hint">Choose your trip direction to get started.</p>
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
        </div>
      </div>`;

    case 1: return `
      <div class="step-content">
        <h2>When do you need pickup?</h2>
        <input type="date" class="form-input" id="pickupDate"
          min="${todayISO()}"
          value="${data.pickupDate || ''}" />
        <p id="date-inline-error" class="form-error" style="margin-top:0.5rem;min-height:1.2rem;">${data.pickupDate ? (getDateError(data.pickupDate) || '') : ''}</p>
        <p class="hint">Select today or any future date.</p>
      </div>`;

    case 2: {
      const slots = generateTimeSlots();
      const booked = data._bookedSlots || [];
      return `
        <div class="step-content">
          <h2>What time?</h2>
          ${data._availLoading ? `<p class="availability-loading"><i data-lucide="loader-circle" class="icon-sm spin"></i> Checking availability...</p>` : ''}
          <div class="time-grid">
            ${slots.map(s => {
              const isBooked = booked.includes(s);
              return `<button
                class="time-slot${data.pickupTime === s ? ' selected' : ''}${isBooked ? ' booked' : ''}"
                data-time="${s}"${isBooked ? ' disabled' : ''}>
                <span>${formatTime(s)}</span>
                ${isBooked ? '<span class="time-slot-label">Booked</span>' : ''}
              </button>`;
            }).join('')}
          </div>
        </div>`;
    }

    case 3: return `
      <div class="step-content">
        <h2>${addressStepLabel(data.tripDirection)}</h2>
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
        <p class="hint">${addressStepHint(data.tripDirection)}</p>
      </div>`;

    case 4: return `
      <div class="step-content">
        <h2>How many passengers?</h2>
        <div class="counter-group">
          <button class="counter-btn" id="dec">−</button>
          <span class="counter-value" id="passengerCount">${data.passengerCount || 1}</span>
          <button class="counter-btn" id="inc">+</button>
        </div>
        <p class="hint">Maximum 6 passengers per ride.</p>
      </div>`;

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
        <h2>Which terminal?</h2>
        <div class="terminal-grid">
          ${TERMINALS.map(t => `
            <button class="terminal-btn ${data.dropoffTerminal === t ? 'selected' : ''}" data-terminal="${t}">
              DFW Terminal ${t}
            </button>`).join('')}
        </div>
      </div>`;

    case 7: return `
      <div class="step-content">
        <h2>Flight details <span class="optional">(optional)</span></h2>
        <label class="form-label">Airline</label>
        <input type="text" class="form-input" id="airline" placeholder="e.g. American Airlines" value="${data.airline || ''}" />
        <label class="form-label">Departure Time</label>
        <input type="time" class="form-input" id="departureTime" value="${data.departureTime || ''}" />
      </div>`;

    case 8: return `
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
let _googleMapsKeyFetched = false;
let _pendingCallbacks = [];

async function ensureGoogleMaps() {
  if (_googleMapsLoaded && window.google?.maps?.places) return true;

  if (!_googleMapsKeyFetched) {
    _googleMapsKeyFetched = true;
    try {
      const config = await api.get('/config');
      _googleMapsKey = config.googleMapsApiKey || '';
      if (!_googleMapsKey) {
        console.warn('[TRAQQ Maps] GOOGLE_MAPS_API_KEY is not set — address autocomplete disabled, free-text fallback active.');
      } else {
        console.log('[TRAQQ Maps] API key loaded from /api/config.');
      }
    } catch (err) {
      _googleMapsKey = '';
      console.error('[TRAQQ Maps] Failed to fetch /api/config:', err.message);
    }
  }

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
      console.log('[TRAQQ Maps] Google Maps Places loaded successfully.');
      _pendingCallbacks.forEach(cb => cb(true));
      _pendingCallbacks = [];
    };

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${_googleMapsKey}&libraries=places&callback=_traqq_gmaps_ready`;
    script.async = true;
    script.onerror = () => {
      console.error('[TRAQQ Maps] Google Maps script failed to load. Verify your API key is valid and the Maps JavaScript API + Places API are enabled in Google Cloud Console.');
      document.getElementById('google-maps-script')?.remove();
      _pendingCallbacks.forEach(cb => cb(false));
      _pendingCallbacks = [];
    };
    document.head.appendChild(script);
    console.log('[TRAQQ Maps] Loading Google Maps script…');
  });
}

function attachFallbackSuggestions(inputEl, data, onSelect, root) {
  const suggestionsEl = root.querySelector('#address-suggestions');
  const loadingEl = root.querySelector('#address-loading');
  if (!suggestionsEl || !loadingEl) return;

  let debounceTimer = null;
  let sessionToken = null;
  let currentPredictions = [];

  inputEl.addEventListener('input', () => {
    const query = inputEl.value.trim();
    data._addressValidated = false;
    root.querySelector('.address-validated-icon')?.remove();

    clearTimeout(debounceTimer);
    suggestionsEl.innerHTML = '';
    suggestionsEl.style.display = 'none';

    if (query.length < 3) {
      loadingEl.style.display = 'none';
      return;
    }

    debounceTimer = setTimeout(() => {
      if (!window.google?.maps?.places) {
        console.warn('[TRAQQ Maps] google.maps.places not available when requesting predictions.');
        return;
      }

      loadingEl.style.display = 'flex';

      if (!sessionToken) {
        sessionToken = new window.google.maps.places.AutocompleteSessionToken();
      }

      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: query,
          sessionToken,
          componentRestrictions: { country: 'us' },
          types: ['address']
        },
        (predictions, status) => {
          loadingEl.style.display = 'none';
          const OK = window.google.maps.places.PlacesServiceStatus.OK;
          const ZERO = window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS;

          if (status !== OK || !predictions?.length) {
            if (status !== ZERO) {
              console.warn(
                `[TRAQQ Maps] getPlacePredictions returned "${status}".`,
                status === 'REQUEST_DENIED'
                  ? 'Places API may not be enabled or the key lacks permissions. Check Google Cloud Console → APIs & Services → Places API.'
                  : 'Check your API key and billing status.'
              );
            }
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
                    console.warn(`[TRAQQ Maps] getDetails returned "${detailStatus}" — falling back to description text.`);
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
    if (!root.querySelector('#address-wrap')?.contains(e.target)) {
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
            <button class="btn btn-primary" id="nextBtn">
              ${step === STEPS.length - 1 ? 'Review & Pay' : 'Continue'}
            </button>
          </div>
        </div>

        <div class="booking-summary">
          <h3>Your Booking</h3>
          ${data.tripDirection ? `<p><strong>Direction:</strong> ${directionLabel(data.tripDirection)}</p>` : ''}
          ${data.pickupDate ? `<p><strong>Date:</strong> ${data.pickupDate}</p>` : ''}
          ${data.pickupTime ? `<p><strong>Time:</strong> ${formatTime(data.pickupTime)}</p>` : ''}
          ${data.pickupAddress ? `<p><strong>${data.tripDirection === 'FROM_DFW' ? 'Destination' : 'From'}:</strong> ${escapeHtml(data.pickupAddress)}</p>` : ''}
          ${data.dropoffTerminal ? `<p><strong>Terminal:</strong> DFW ${data.dropoffTerminal}</p>` : ''}
          ${data.passengerCount ? `<p><strong>Passengers:</strong> ${data.passengerCount}</p>` : ''}
          <div class="summary-price">
            <span>Total</span>
            <span class="price-gold">$99.00</span>
          </div>
        </div>
      </div>`;

    attachListeners();
    if (window.lucide) window.lucide.createIcons();

    // Attach address autocomplete on step 3
    if (step === 3) {
      initAddressAutocomplete();
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

      // Update icon and warning in-place — no full re-render needed
      root.querySelector('.address-validated-icon')?.remove();
      const checkEl = document.createElement('span');
      checkEl.className = 'address-validated-icon';
      checkEl.title = 'Address verified';
      checkEl.textContent = '✓';
      root.querySelector('.address-input-row')?.appendChild(checkEl);
      root.querySelector('.address-warning')?.remove();
    };

    attachFallbackSuggestions(inputEl, data, onAddressSelect, root);

    if (data.pickupAddress && !data._addressValidated) {
      inputEl.value = data.pickupAddress;
    }
  }

  function collectStep() {
    switch (step) {
      case 1: data.pickupDate = root.querySelector('#pickupDate')?.value; break;
      case 3:
        // Only collect text if not already set via autocomplete
        if (!data._addressValidated) {
          data.pickupAddress = root.querySelector('#pickupAddress')?.value;
        }
        break;
      case 5:
        data.carryOnCount = parseInt(root.querySelector('#carryOnCount')?.value || 0);
        data.checkedLuggageCount = parseInt(root.querySelector('#checkedLuggageCount')?.value || 0);
        break;
      case 7:
        data.airline = root.querySelector('#airline')?.value;
        data.departureTime = root.querySelector('#departureTime')?.value;
        break;
      case 8:
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
        return 'This time is already booked. Please choose another available time.';
      }
    }
    if (step === 3) {
      const addr = data.pickupAddress?.trim();
      if (!addr) return 'Please enter your address.';
      if (addr.length < 5) return 'Please enter a full address.';
      if (!data._addressValidated) {
        return 'Please select a valid address from the suggestions dropdown.';
      }
    }
    if (step === 4 && (!data.passengerCount || data.passengerCount < 1)) return 'At least 1 passenger required.';
    if (step === 6 && !data.dropoffTerminal) return 'Please select a terminal.';
    if (step === 8) {
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
    let el = root.querySelector('.form-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'form-error';
      root.querySelector('.step-actions').prepend(el);
    }
    el.textContent = msg;
  }

  function clearError() {
    const el = root.querySelector('.form-error');
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
        if (data.pickupTime && data._bookedSlots.includes(data.pickupTime)) {
          data.pickupTime = null;
        }
      } catch {
        data._bookedSlots = [];
      }
      step++;
      render();
      return;
    }

    if (step < STEPS.length - 1) {
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
      const payload = {
        tripDirection: data.tripDirection,
        pickupDate: data.pickupDate,
        pickupTime: data.pickupTime,
        pickupAddress: data.pickupAddress,
        pickupLatitude: data.pickupLatitude || undefined,
        pickupLongitude: data.pickupLongitude || undefined,
        pickupPlaceId: data.pickupPlaceId || undefined,
        destinationAddress: data.destinationAddress || undefined,
        destinationLatitude: data.destinationLatitude || undefined,
        destinationLongitude: data.destinationLongitude || undefined,
        destinationPlaceId: data.destinationPlaceId || undefined,
        passengerCount: parseInt(data.passengerCount),
        carryOnCount: parseInt(data.carryOnCount || 0),
        checkedLuggageCount: parseInt(data.checkedLuggageCount || 0),
        dropoffTerminal: data.dropoffTerminal,
        airline: data.airline || undefined,
        departureTime: data.departureTime || undefined,
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
        data.pickupTime = null;
      }
      step--;
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

    root.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        data.tripDirection = btn.dataset.direction;
        // Clear address data when direction changes
        data.pickupAddress = '';
        data.pickupLatitude = undefined;
        data.pickupLongitude = undefined;
        data.pickupPlaceId = undefined;
        data._addressValidated = false;
        root.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('selected'));
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

    const dec = root.querySelector('#dec');
    const inc = root.querySelector('#inc');
    if (dec && inc) {
      if (!data.passengerCount) data.passengerCount = 1;
      dec.addEventListener('click', () => {
        if (data.passengerCount > 1) {
          data.passengerCount--;
          root.querySelector('#passengerCount').textContent = data.passengerCount;
        }
      });
      inc.addEventListener('click', () => {
        if (data.passengerCount < 6) {
          data.passengerCount++;
          root.querySelector('#passengerCount').textContent = data.passengerCount;
        }
      });
    }
  }

  render();
}
