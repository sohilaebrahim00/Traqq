import { api } from '../services/api.js';
import { navigate } from '../router/router.js';
import { showToast } from '../utils/auth.js';

export default function login(root) {
  root.innerHTML = `
    <div class="auth-page">
      <div class="auth-card reveal-scale">
        <div class="auth-brand">
          <span class="auth-logo">TRAQQ</span>
          <p class="auth-tagline">Premium Private Transportation</p>
        </div>
        <h1 class="auth-title">Welcome back</h1>
        <p class="auth-sub">Sign in to manage your bookings and ride history.</p>

        <form id="login-form" class="auth-form" novalidate>
          <label class="form-label">Email address</label>
          <input type="email" class="form-input" id="email" placeholder="you@example.com" required />

          <label class="form-label">Password</label>
          <div class="input-password-wrap">
            <input type="password" class="form-input" id="password" placeholder="Your password" required />
            <button type="button" class="toggle-password" id="toggle-pw">Show</button>
          </div>

          <p id="login-error" class="form-error" style="display:none;"></p>

          <button type="submit" class="btn btn-primary btn-full" id="submit-btn">Sign In</button>
        </form>

        <div class="auth-divider"><span>or</span></div>

        <p class="auth-switch">
          Don't have an account?
          <a data-link="/register" href="/register" class="auth-switch-link">Create one free</a>
        </p>

        <p class="auth-switch" style="margin-top:0.5rem;">
          <a data-link="/booking" href="/booking" class="auth-switch-link">Continue as guest →</a>
        </p>
      </div>
    </div>`;

  const form    = root.querySelector('#login-form');
  const errEl   = root.querySelector('#login-error');
  const submitBtn = root.querySelector('#submit-btn');

  root.querySelector('#toggle-pw').addEventListener('click', function() {
    const pw = root.querySelector('#password');
    const showing = pw.type === 'text';
    pw.type = showing ? 'password' : 'text';
    this.textContent = showing ? 'Show' : 'Hide';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.style.display = 'none';

    const email    = root.querySelector('#email').value.trim();
    const password = root.querySelector('#password').value;

    if (!email || !password) {
      errEl.textContent = 'Please fill in all fields.';
      errEl.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      const res = await api.post('/auth/login', { email, password });

      localStorage.setItem('traqq_access_token', res.accessToken);
      localStorage.setItem('traqq_refresh_token', res.refreshToken);
      localStorage.setItem('traqq_user', JSON.stringify(res.user));

      showToast(`Welcome back, ${res.user.fullName.split(' ')[0]}!`, 'success');
      navigate(res.user.role === 'ADMIN' ? '/admin/bookings' : '/history');
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';

      // 401 → wrong credentials
      // no status → network error (backend not running / CORS / timeout)
      // other → unexpected server error
      if (err.status === 401) {
        errEl.textContent = 'Invalid email or password.';
      } else if (!err.status) {
        errEl.textContent = 'Unable to connect to the server. Please check your network connection and try again.';
      } else {
        errEl.textContent = err.message || 'Something went wrong. Please try again.';
      }
      errEl.style.display = 'block';
    }
  });
}
