import { api } from '../services/api.js';
import { navigate } from '../router/router.js';
import { showToast } from '../utils/auth.js';

export default function register(root) {
  root.innerHTML = `
    <div class="auth-page">
      <div class="auth-card reveal-scale">
        <div class="auth-brand">
          <span class="auth-logo">TRAQQ</span>
          <p class="auth-tagline">Premium Private Transportation</p>
        </div>
        <h1 class="auth-title">Create your account</h1>
        <p class="auth-sub">Save your bookings, view ride history, and check in faster.</p>

        <form id="register-form" class="auth-form" novalidate autocomplete="on">

          <div class="form-field">
            <label class="form-label" for="fullName">Full Name <span class="required">*</span></label>
            <input type="text" class="form-input" id="fullName"
                   autocomplete="name" placeholder="Jane Smith" required />
            <p class="auth-field-error" id="err-fullName"></p>
          </div>

          <div class="form-field">
            <label class="form-label" for="phoneNumber">Phone Number <span class="required">*</span></label>
            <input type="tel" class="form-input" id="phoneNumber"
                   inputmode="tel" autocomplete="tel"
                   placeholder="2145550000" maxlength="15" required />
            <p class="auth-field-hint">Enter at least 10 digits, numbers only.</p>
            <p class="auth-field-error" id="err-phoneNumber"></p>
          </div>

          <div class="form-field">
            <label class="form-label" for="email">Email Address <span class="optional">(optional)</span></label>
            <input type="email" class="form-input" id="email"
                   autocomplete="email" placeholder="you@example.com" />
            <p class="auth-field-error" id="err-email"></p>
          </div>

          <div class="form-field">
            <label class="form-label" for="password">Password <span class="required">*</span></label>
            <div class="input-password-wrap">
              <input type="password" class="form-input" id="password"
                     autocomplete="new-password" placeholder="At least 8 characters" required />
              <button type="button" class="toggle-password" id="toggle-pw">Show</button>
            </div>
            <p class="hint">Must be at least 8 characters.</p>
            <p class="auth-field-error" id="err-password"></p>
          </div>

          <p id="register-error" class="form-error" style="display:none;"></p>

          <button type="submit" class="btn btn-primary btn-full" id="submit-btn">
            Create Account
          </button>
        </form>

        <p class="auth-terms-note">
          By creating an account you agree to our
          <a data-link="/terms" href="/terms" class="auth-switch-link">Terms of Service</a> and
          <a data-link="/privacy" href="/privacy" class="auth-switch-link">Privacy Policy</a>.
        </p>

        <div class="auth-divider"><span>or</span></div>

        <p class="auth-switch">
          Already have an account?
          <a data-link="/login" href="/login" class="auth-switch-link">Sign in</a>
        </p>

        <p class="auth-switch" style="margin-top:0.5rem;">
          <a data-link="/booking" href="/booking" class="auth-switch-link">Continue as guest →</a>
        </p>
      </div>
    </div>`;

  const form      = root.querySelector('#register-form');
  const formErrEl = root.querySelector('#register-error');
  const submitBtn = root.querySelector('#submit-btn');

  // ── Helpers ──────────────────────────────────────────────────────────────

  function setError(field, msg) {
    const el    = root.querySelector(`#err-${field}`);
    const input = root.querySelector(`#${field}`);
    if (el) { el.textContent = msg; el.classList.add('visible'); }
    if (input) input.classList.add('input-error');
  }

  function clearError(field) {
    const el    = root.querySelector(`#err-${field}`);
    const input = root.querySelector(`#${field}`);
    if (el) { el.textContent = ''; el.classList.remove('visible'); }
    if (input) input.classList.remove('input-error');
  }

  function clearAllErrors() {
    ['fullName', 'phoneNumber', 'email', 'password'].forEach(clearError);
    formErrEl.textContent = '';
    formErrEl.style.display = 'none';
  }

  // ── Phone number: strip non-digits in real time ───────────────────────────

  const phoneInput = root.querySelector('#phoneNumber');
  phoneInput.addEventListener('input', () => {
    const digits = phoneInput.value.replace(/\D/g, '');
    phoneInput.value = digits.slice(0, 15);
    if (digits !== phoneInput.value.replace(/\D/g, '')) {
      setError('phoneNumber', 'Phone number must contain digits only.');
    } else if (phoneInput.value) {
      clearError('phoneNumber');
    }
  });

  // Clear field errors when user starts typing in any field
  ['fullName', 'email', 'password'].forEach(id => {
    root.querySelector(`#${id}`)?.addEventListener('input', () => clearError(id));
  });

  // ── Password show/hide ───────────────────────────────────────────────────

  root.querySelector('#toggle-pw').addEventListener('click', function() {
    const pw      = root.querySelector('#password');
    const showing = pw.type === 'text';
    pw.type       = showing ? 'password' : 'text';
    this.textContent = showing ? 'Show' : 'Hide';
  });

  // ── Client-side validation ───────────────────────────────────────────────

  function validateFields(fullName, phoneNumber, email, password) {
    let firstInvalid = null;
    let valid = true;

    if (!fullName) {
      setError('fullName', 'Please enter your full name.');
      if (!firstInvalid) firstInvalid = 'fullName';
      valid = false;
    } else if (fullName.length < 2) {
      setError('fullName', 'Full name must be at least 2 characters.');
      if (!firstInvalid) firstInvalid = 'fullName';
      valid = false;
    }

    if (!phoneNumber) {
      setError('phoneNumber', 'Please enter your phone number.');
      if (!firstInvalid) firstInvalid = 'phoneNumber';
      valid = false;
    } else if (!/^\d+$/.test(phoneNumber)) {
      setError('phoneNumber', 'Phone number must contain digits only.');
      if (!firstInvalid) firstInvalid = 'phoneNumber';
      valid = false;
    } else if (phoneNumber.length < 10) {
      setError('phoneNumber', 'Phone number must be at least 10 digits.');
      if (!firstInvalid) firstInvalid = 'phoneNumber';
      valid = false;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('email', 'Please enter a valid email address.');
      if (!firstInvalid) firstInvalid = 'email';
      valid = false;
    }

    if (!password) {
      setError('password', 'Please enter a password.');
      if (!firstInvalid) firstInvalid = 'password';
      valid = false;
    } else if (password.length < 8) {
      setError('password', 'Password must be at least 8 characters.');
      if (!firstInvalid) firstInvalid = 'password';
      valid = false;
    }

    if (firstInvalid) {
      root.querySelector(`#${firstInvalid}`)?.focus();
    }
    return valid;
  }

  // ── Form submit ──────────────────────────────────────────────────────────

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const fullName    = root.querySelector('#fullName').value.trim();
    const phoneNumber = root.querySelector('#phoneNumber').value.trim();
    const email       = root.querySelector('#email').value.trim() || undefined;
    const password    = root.querySelector('#password').value;

    if (!validateFields(fullName, phoneNumber, email, password)) return;

    submitBtn.disabled     = true;
    submitBtn.textContent  = 'Creating account…';

    try {
      const body = { fullName, phoneNumber, password };
      if (email) body.email = email;

      const res = await api.post('/auth/register', body);
      localStorage.setItem('traqq_access_token', res.accessToken);
      localStorage.setItem('traqq_refresh_token', res.refreshToken);
      localStorage.setItem('traqq_user', JSON.stringify(res.user));
      showToast(`Welcome to TRAQQ, ${res.user.fullName.split(' ')[0]}!`, 'success');
      navigate('/booking');

    } catch (err) {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Create Account';

      // Backend returned structured field errors
      const fieldErrors = err.response?.errors;
      if (fieldErrors && typeof fieldErrors === 'object') {
        let firstInvalid = null;
        for (const [field, msg] of Object.entries(fieldErrors)) {
          setError(field, msg);
          if (!firstInvalid) firstInvalid = field;
        }
        if (firstInvalid) root.querySelector(`#${firstInvalid}`)?.focus();
        // Show a brief summary above the submit button too
        formErrEl.textContent = err.message || 'Please fix the highlighted fields.';
        formErrEl.style.display = 'block';
        return;
      }

      // Generic / network error
      const message = err.message || 'Something went wrong. Please try again.';
      formErrEl.textContent = message;
      formErrEl.style.display = 'block';
    }
  });
}
