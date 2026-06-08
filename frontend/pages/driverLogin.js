import { api } from '../services/api.js';
import { navigate } from '../router/router.js';
import { showToast } from '../utils/auth.js';

export default function driverLogin(root) {
  root.innerHTML = `
    <div class="auth-page">
      <div class="auth-card reveal-scale">
        <div class="auth-brand">
          <span class="auth-logo">TRAQQ</span>
          <p class="auth-tagline">Driver Portal</p>
        </div>
        <h1 class="auth-title">Driver Sign In</h1>
        <p class="auth-sub">Access your assigned rides and update ride status.</p>

        <form id="driver-login-form" class="auth-form" novalidate>
          <label class="form-label">Email or Phone Number</label>
          <input
            type="text"
            class="form-input"
            id="identifier"
            placeholder="you@example.com or +1 555 000 0000"
            autocomplete="username"
            required
          />

          <label class="form-label">Password</label>
          <div class="input-password-wrap">
            <input
              type="password"
              class="form-input"
              id="password"
              placeholder="Your password"
              autocomplete="current-password"
              required
            />
            <button type="button" class="toggle-password" id="toggle-pw">Show</button>
          </div>

          <p id="login-error" class="form-error" style="display:none;"></p>

          <button type="submit" class="btn btn-primary btn-full" id="submit-btn">
            Sign In as Driver
          </button>
        </form>

        <p class="auth-switch" style="margin-top:1.5rem;">
          Not a driver?
          <a data-link="/login" href="/login" class="auth-switch-link">Customer login →</a>
        </p>
      </div>
    </div>`;

  const form      = root.querySelector('#driver-login-form');
  const errEl     = root.querySelector('#login-error');
  const submitBtn = root.querySelector('#submit-btn');

  root.querySelector('#toggle-pw').addEventListener('click', function () {
    const pw      = root.querySelector('#password');
    const showing = pw.type === 'text';
    pw.type       = showing ? 'password' : 'text';
    this.textContent = showing ? 'Show' : 'Hide';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.style.display = 'none';

    const identifier = root.querySelector('#identifier').value.trim();
    const password   = root.querySelector('#password').value;

    if (!identifier || !password) {
      errEl.textContent = 'Please fill in all fields.';
      errEl.style.display = 'block';
      return;
    }

    submitBtn.disabled     = true;
    submitBtn.textContent  = 'Signing in…';

    try {
      const res = await api.post('/driver/login', { identifier, password });

      localStorage.setItem('traqq_access_token', res.accessToken);
      localStorage.setItem('traqq_refresh_token', res.refreshToken);
      localStorage.setItem('traqq_user', JSON.stringify(res.user));

      showToast(`Welcome, ${res.user.fullName.split(' ')[0]}!`, 'success');
      navigate('/driver/dashboard');
    } catch (err) {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Sign In as Driver';

      if (err.status === 401) {
        errEl.textContent = 'Invalid email/phone or password.';
      } else if (err.status === 403) {
        errEl.textContent = err.message || 'Access denied. This account is not a driver account.';
      } else if (!err.status) {
        errEl.textContent = 'Unable to connect to the server. Please check that the backend is running.';
      } else {
        errEl.textContent = err.message || 'Something went wrong. Please try again.';
      }
      errEl.style.display = 'block';
    }
  });
}
