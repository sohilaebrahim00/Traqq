import { api } from '../services/api.js';
import { navigate } from '../router/router.js';

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

function getDateError(dateStr) {
  if (!dateStr) return 'Please select a pickup date.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'Please enter a valid pickup date.';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (String(y).length !== 4) return 'Please enter a valid 4-digit year.';
  if (m < 1 || m > 12) return 'Month must be between 1 and 12.';
  if (d < 1 || d > 31) return 'Day must be between 1 and 31.';
  const selected = new Date(y, m - 1, d);
  if (selected.getFullYear() !== y || selected.getMonth() !== m - 1 || selected.getDate() !== d) {
    return 'Please enter a valid pickup date.';
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selected < today) return 'Please select a future pickup date.';
  return null;
}

function directionLabel(d) {
  return d === 'FROM_DFW' ? 'From DFW Airport' : 'To DFW Airport';
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
        <p class="hint">Select today or any future date. Past dates are not available.</p>
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
        <h2>Your pickup address</h2>
        <input type="text" class="form-input" id="pickupAddress"
          placeholder="Start typing your address..."
          value="${data.pickupAddress || ''}" />
        <p class="hint">We'll come directly to your door.</p>
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
          ${data.pickupAddress ? `<p><strong>From:</strong> ${data.pickupAddress}</p>` : ''}
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
  }

  function collectStep() {
    switch (step) {
      case 1: data.pickupDate = root.querySelector('#pickupDate')?.value; break;
      case 3: data.pickupAddress = root.querySelector('#pickupAddress')?.value; break;
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
    if (step === 3 && !data.pickupAddress?.trim()) return 'Please enter your pickup address.';
    if (step === 4 && (!data.passengerCount || data.passengerCount < 1)) return 'At least 1 passenger required.';
    if (step === 6 && !data.dropoffTerminal) return 'Please select a terminal.';
    if (step === 8 && !data.phoneNumber?.trim()) return 'Phone number is required.';
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
      // Fetch availability before showing time step
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
      const booking = await api.post('/bookings/create', {
        ...data,
        passengerCount: parseInt(data.passengerCount),
        carryOnCount: parseInt(data.carryOnCount || 0),
        checkedLuggageCount: parseInt(data.checkedLuggageCount || 0)
      });
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

    root.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        data.tripDirection = btn.dataset.direction;
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
