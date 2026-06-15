import { adminLayout } from '../utils/adminLayout.js';
import { api } from '../services/api.js';
import { getUser, escapeHtml } from '../utils/auth.js';

function settingsRow(key, value) {
  return `
    <div class="admin-settings-row">
      <span class="admin-settings-key">${key}</span>
      <span class="admin-settings-val">${value}</span>
    </div>`;
}

function indicator(state) {
  const dot = state === 'ok'
    ? '<span class="status-indicator-dot status-indicator-dot--green"></span>'
    : state === 'warn'
    ? '<span class="status-indicator-dot status-indicator-dot--yellow"></span>'
    : '<span class="status-indicator-dot status-indicator-dot--red"></span>';
  const label = state === 'ok' ? 'Configured' : state === 'warn' ? 'Placeholder' : 'Not Configured';
  return `<span class="status-indicator">${dot} ${label}</span>`;
}

export default async function adminSettings(root, { isActive } = {}) {
  const user = getUser();

  const rendered = adminLayout(root, {
    title: 'Settings',
    active: '/admin/settings',
    bodyHTML: `
      <div class="admin-settings-grid" id="settings-grid">
        <!-- Loading skeletons -->
        ${[1,2,3,4].map(() => `
          <div class="admin-settings-card">
            <div class="skeleton" style="height:12px;width:40%;margin-bottom:1.25rem;border-radius:4px;"></div>
            ${[1,2,3].map(() => `<div class="skeleton" style="height:36px;margin-bottom:0.5rem;border-radius:4px;"></div>`).join('')}
          </div>`).join('')}
      </div>`
  });

  if (!rendered) return;

  // Use /api/config to check both backend reachability and Stripe key status.
  // The old /health check used a relative URL that resolved to the frontend server
  // (localhost:3000/health) instead of the backend — giving a false "ok" result.
  let stripeStatus = 'not-set';
  let stripeKeyPreview = 'Not configured';
  let backendStatus = 'error';
  try {
    const cfg = await api.get('/config');
    if (isActive && !isActive()) return;
    backendStatus = 'ok';
    if (cfg?.stripePublishableKey && cfg.stripePublishableKey.startsWith('pk_')) {
      stripeStatus = cfg.stripePublishableKey.includes('test') ? 'warn' : 'ok';
      stripeKeyPreview = cfg.stripePublishableKey.slice(0, 12) + '…';
    }
  } catch {}

  if (isActive && !isActive()) return;

  root.querySelector('#settings-grid').innerHTML = `
    <!-- Business Info -->
    <div class="admin-settings-card">
      <p class="admin-settings-card-title">
        <i data-lucide="building-2" class="icon-xs"></i>
        Business Information
      </p>
      ${settingsRow('Company Name', 'TRAQQ')}
      ${settingsRow('Service Type', 'VIP Airport Shuttle')}
      ${settingsRow('Coverage Area', 'Dallas Fort Worth, TX')}
      ${settingsRow('Airport', 'DFW International Airport')}
      ${settingsRow('Business Address', '5860 Collin McKinney Pkwy, Suite 605')}
      ${settingsRow('City / State / ZIP', 'McKinney, TX 75070')}
    </div>

    <!-- Pricing & Rules -->
    <div class="admin-settings-card">
      <p class="admin-settings-card-title">
        <i data-lucide="settings-2" class="icon-xs"></i>
        Platform Configuration
      </p>
      ${settingsRow('Flat Rate', '<span style="color:var(--gold);font-weight:700;">$99.00 USD</span>')}
      ${settingsRow('Max Passengers', '6 per booking')}
      ${settingsRow('Time Slots', 'Every 30 minutes (00 and 30)')}
      ${settingsRow('Terminals Served', 'DFW A · B · C · D · E')}
      ${settingsRow('QR Code', 'Generated after Stripe payment confirmed')}
      ${settingsRow('Price Changes', '<span style="color:#ff5f5f;font-size:0.78rem;">Requires backend code update</span>')}
    </div>

    <!-- Integrations -->
    <div class="admin-settings-card">
      <p class="admin-settings-card-title">
        <i data-lucide="plug" class="icon-xs"></i>
        Integrations
      </p>
      ${settingsRow('Backend API',   indicator(backendStatus === 'ok' ? 'ok' : 'error'))}
      ${settingsRow('Stripe (pk)',   indicator(stripeStatus === 'ok' ? 'ok' : stripeStatus === 'warn' ? 'warn' : 'error'))}
      ${settingsRow('Stripe Key Preview', `<code style="font-size:0.75rem;color:var(--white-muted);">${stripeKeyPreview}</code>`)}
      ${settingsRow('Webhook', '<span style="color:var(--white-muted);font-size:0.78rem;">Set STRIPE_WEBHOOK_SECRET in .env</span>')}
      ${settingsRow('Google Maps', '<span style="color:var(--white-muted);font-size:0.78rem;">Set GOOGLE_MAPS_API_KEY in .env</span>')}
      ${settingsRow('Email (SendGrid)', '<span style="color:var(--white-muted);font-size:0.78rem;">Not yet configured</span>')}
    </div>

    <!-- Admin Account -->
    <div class="admin-settings-card">
      <p class="admin-settings-card-title">
        <i data-lucide="user-cog" class="icon-xs"></i>
        Admin Account
      </p>
      ${settingsRow('Logged in as', escapeHtml(user?.fullName || '—'))}
      ${settingsRow('Email', escapeHtml(user?.email || '—'))}
      ${settingsRow('Role', '<span class="status-badge status-confirmed">ADMIN</span>')}
      ${settingsRow('Auth Method', 'JWT (access 15 min · refresh 7 days)')}
      ${settingsRow('Token Storage', 'localStorage (traqq_access_token)')}
      <div class="admin-settings-row">
        <span class="admin-settings-key">Actions</span>
        <button class="btn btn-ghost btn-sm" id="settings-logout" type="button" style="color:#ff5f5f;border-color:rgba(255,95,95,0.3);">
          <i data-lucide="log-out" class="icon-xs"></i> Sign Out
        </button>
      </div>
    </div>`;

  if (window.lucide) window.lucide.createIcons();

  root.querySelector('#settings-logout')?.addEventListener('click', () => {
    localStorage.removeItem('traqq_access_token');
    localStorage.removeItem('traqq_refresh_token');
    localStorage.removeItem('traqq_user');
    window.location.href = '/';
  });
}
