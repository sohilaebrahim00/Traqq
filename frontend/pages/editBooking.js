import { api } from '../services/api.js';
import { showToast, escapeHtml } from '../utils/auth.js';

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${m === 0 ? '00' : m} ${ampm}`;
}

function isoDate(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function maskPhone(p) {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  return `***-***-${digits.slice(-4)}`;
}

export default function editBooking(root) {
  root.innerHTML = `
    <div class="static-page">
      <div class="inner-hero">
        <div class="container">
          <p class="hero-eyebrow">Manage Your Booking</p>
          <h1 class="inner-hero-title">Edit Your Booking</h1>
          <p class="inner-hero-sub">Look up your booking by reference number to view and update your details.</p>
        </div>
      </div>

      <div class="container" style="max-width:640px;padding:3rem 1.5rem;">

        <!-- Step 1: Lookup -->
        <div id="lookup-section">
          <div class="booking-container" style="padding:2rem;">
            <h2 style="margin-bottom:0.5rem;color:var(--white);">Find Your Booking</h2>
            <p style="color:var(--white-muted);font-size:0.9rem;margin-bottom:1.5rem;">
              Enter your booking reference number (e.g. TRQ-AB12CD34) and your phone number to verify your identity.
            </p>
            <label class="form-label">Booking Reference <span class="required">*</span></label>
            <input type="text" class="form-input" id="lookup-ref" placeholder="TRQ-AB12CD34 or AB12CD34"
                   autocomplete="off" style="text-transform:uppercase;letter-spacing:0.05em;" />
            <label class="form-label" style="margin-top:1rem;">Phone Number <span class="required">*</span></label>
            <input type="tel" class="form-input" id="lookup-phone" placeholder="Last 4 digits or full number" />
            <p id="lookup-error" class="form-error" style="display:none;margin-top:0.75rem;"></p>
            <button class="btn btn-primary" id="btn-lookup" style="margin-top:1.5rem;width:100%;" type="button">
              Find Booking
            </button>
            <p style="margin-top:1.25rem;text-align:center;font-size:0.8rem;color:var(--white-muted);">
              Your reference number was emailed after booking. Can't find it?
              <a data-link="/contact" href="/contact" style="color:var(--gold);">Contact us</a>
            </p>
          </div>
        </div>

        <!-- Step 2: Edit form (hidden until lookup succeeds) -->
        <div id="edit-section" style="display:none;">
          <div class="booking-container" style="padding:2rem;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;">
              <div>
                <h2 style="color:var(--white);margin-bottom:0.25rem;">Update Your Booking</h2>
                <p id="edit-ref-label" style="color:var(--gold);font-size:0.85rem;font-weight:600;font-family:monospace;"></p>
              </div>
              <button class="btn btn-ghost btn-sm" id="btn-back-lookup" type="button">← Back</button>
            </div>

            <div style="padding:1rem;background:var(--bg-card);border-radius:6px;border:1px solid var(--border);margin-bottom:1.5rem;" id="current-booking-summary">
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div>
                <label class="form-label">Pickup Date</label>
                <input type="date" class="form-input" id="edit-date" min="${tomorrowISO()}" />
              </div>
              <div>
                <label class="form-label">Pickup Time</label>
                <select class="form-input" id="edit-time">
                  ${Array.from({length: 48}, (_, i) => {
                    const h = Math.floor(i / 2);
                    const m = i % 2 === 0 ? '00' : '30';
                    const val = `${h}:${m}`;
                    const label = (() => {
                      const ampm = h < 12 ? 'AM' : 'PM';
                      const hr = h % 12 || 12;
                      return `${hr}:${m} ${ampm}`;
                    })();
                    return `<option value="${val}">${label}</option>`;
                  }).join('')}
                </select>
              </div>
              <div>
                <label class="form-label">Passengers</label>
                <input type="number" class="form-input" id="edit-passengers" min="1" max="6" />
              </div>
              <div>
                <label class="form-label">Carry-on Bags</label>
                <input type="number" class="form-input" id="edit-carryon" min="0" />
              </div>
              <div>
                <label class="form-label">Checked Bags</label>
                <input type="number" class="form-input" id="edit-checked" min="0" />
              </div>
              <div>
                <label class="form-label">Phone Number</label>
                <input type="tel" class="form-input" id="edit-phone" />
              </div>
              <div style="grid-column:1/-1;">
                <label class="form-label">Email (optional)</label>
                <input type="email" class="form-input" id="edit-email" />
              </div>
            </div>

            <div style="padding:0.85rem 1rem;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25);border-radius:6px;margin-top:1.5rem;">
              <p style="font-size:0.8rem;color:var(--gold);margin:0;">
                <i data-lucide="info" class="icon-xs" style="vertical-align:-2px;margin-right:4px;"></i>
                Changes must be made at least <strong>24 hours before pickup</strong>.
                To change your pickup address or terminal, please <a data-link="/contact" href="/contact" style="color:var(--gold);text-decoration:underline;">contact support</a>.
              </p>
            </div>

            <p id="edit-error" class="form-error" style="display:none;margin-top:1rem;"></p>

            <button class="btn btn-primary" id="btn-save" style="margin-top:1.5rem;width:100%;" type="button">
              Save Changes
            </button>
          </div>
        </div>

        <!-- Step 3: Success -->
        <div id="success-section" style="display:none;">
          <div class="booking-container" style="padding:2.5rem;text-align:center;">
            <div style="width:64px;height:64px;background:rgba(76,175,80,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;">
              <i data-lucide="check-circle" style="color:#4caf50;" class="icon-xl"></i>
            </div>
            <h2 style="color:var(--white);margin-bottom:0.5rem;">Booking Updated!</h2>
            <p style="color:var(--white-muted);margin-bottom:2rem;line-height:1.7;">
              Your booking has been updated successfully. A confirmation email has been sent if you provided one.
            </p>
            <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
              <a class="btn btn-primary" data-link="/history" href="/history">View My Bookings</a>
              <a class="btn btn-ghost" data-link="/" href="/">Back to Home</a>
            </div>
          </div>
        </div>

      </div>
    </div>`;

  if (window.lucide) window.lucide.createIcons();

  let currentBooking = null;
  let verifyPhone = null;

  const lookupSection = root.querySelector('#lookup-section');
  const editSection   = root.querySelector('#edit-section');
  const successSection = root.querySelector('#success-section');

  // Lookup
  root.querySelector('#btn-lookup').addEventListener('click', async () => {
    const refRaw = root.querySelector('#lookup-ref').value.trim().toUpperCase();
    const phone  = root.querySelector('#lookup-phone').value.trim();
    const errEl  = root.querySelector('#lookup-error');
    const btn    = root.querySelector('#btn-lookup');

    errEl.style.display = 'none';

    const ref = refRaw.startsWith('TRQ-') ? refRaw.slice(4) : refRaw;
    if (!ref || ref.length < 6) {
      errEl.textContent = 'Please enter a valid booking reference number.';
      errEl.style.display = 'block';
      return;
    }
    if (!phone) {
      errEl.textContent = 'Please enter your phone number for verification.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Looking up...';

    try {
      const res = await api.get(`/bookings/by-ref/${ref}`);
      currentBooking = res;
      verifyPhone = phone;

      // Populate the edit form
      root.querySelector('#edit-ref-label').textContent = `Ref: TRQ-${ref}`;

      const pickupDate = isoDate(res.pickupDate);
      root.querySelector('#edit-date').value = pickupDate;

      // Set time select
      const timeSelect = root.querySelector('#edit-time');
      const opts = timeSelect.options;
      for (let i = 0; i < opts.length; i++) {
        if (opts[i].value === res.pickupTime) {
          timeSelect.selectedIndex = i;
          break;
        }
      }

      root.querySelector('#edit-passengers').value = res.passengerCount || 1;
      root.querySelector('#edit-carryon').value = res.carryOnCount ?? 0;
      root.querySelector('#edit-checked').value = res.checkedLuggageCount ?? 0;
      root.querySelector('#edit-phone').value = '';
      root.querySelector('#edit-email').value = res.email || '';

      // Summary card
      root.querySelector('#current-booking-summary').innerHTML = `
        <p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--white-muted);margin-bottom:0.75rem;">Current Booking</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;font-size:0.85rem;">
          <span style="color:var(--white-muted);">Date:</span><span style="color:var(--white);">${pickupDate}</span>
          <span style="color:var(--white-muted);">Time:</span><span style="color:var(--white);">${formatTime(res.pickupTime)}</span>
          <span style="color:var(--white-muted);">Passengers:</span><span style="color:var(--white);">${res.passengerCount}</span>
          <span style="color:var(--white-muted);">Status:</span><span style="color:var(--gold);">${res.bookingStatus}</span>
          <span style="color:var(--white-muted);">Phone on file:</span><span style="color:var(--white);">${escapeHtml(res.phoneMasked || '****')}</span>
        </div>`;

      lookupSection.style.display = 'none';
      editSection.style.display = 'block';
      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      errEl.textContent = e.message || 'Booking not found. Please check your reference number and try again.';
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Find Booking';
    }
  });

  root.querySelector('#btn-back-lookup').addEventListener('click', () => {
    editSection.style.display = 'none';
    lookupSection.style.display = 'block';
    currentBooking = null;
    verifyPhone = null;
  });

  // Save edits
  root.querySelector('#btn-save').addEventListener('click', async () => {
    const errEl = root.querySelector('#edit-error');
    const btn   = root.querySelector('#btn-save');
    errEl.style.display = 'none';

    if (!currentBooking) return;

    const ref = currentBooking.bookingRef || currentBooking.id.slice(-8).toUpperCase();

    const payload = {
      _verifyPhone:       verifyPhone,
      pickupDate:         root.querySelector('#edit-date').value || undefined,
      pickupTime:         root.querySelector('#edit-time').value || undefined,
      passengerCount:     parseInt(root.querySelector('#edit-passengers').value) || undefined,
      carryOnCount:       parseInt(root.querySelector('#edit-carryon').value),
      checkedLuggageCount: parseInt(root.querySelector('#edit-checked').value),
      phoneNumber:        root.querySelector('#edit-phone').value.trim() || undefined,
      email:              root.querySelector('#edit-email').value.trim() || null
    };

    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      await api.patch(`/bookings/by-ref/${ref}`, payload);
      editSection.style.display = 'none';
      successSection.style.display = 'block';
      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      errEl.textContent = e.message || 'Failed to save changes. Please try again.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });
}
