import { getUser, isAdmin, escapeHtml } from './auth.js';

// Returns true when the full admin layout was rendered.
// Returns false when the auth-guard page was rendered instead.
export function adminLayout(root, { title, active, bodyHTML }) {
  const user = getUser();

  if (!user) {
    root.innerHTML = `
      <div class="admin-access-denied">
        <div class="admin-access-card">
          <i data-lucide="lock" class="icon-xl" style="color:var(--gold);margin-bottom:1.25rem;display:block;"></i>
          <h2 style="color:var(--white);">Sign In Required</h2>
          <p style="color:var(--white-muted);margin-bottom:1.5rem;">Please sign in with an admin account to access the dashboard.</p>
          <a class="btn btn-primary" href="/login" data-link="/login" style="display:inline-flex;gap:0.4rem;align-items:center;">
            <i data-lucide="log-in" class="icon-xs"></i> Sign In
          </a>
        </div>
      </div>`;
    if (window.lucide) window.lucide.createIcons();
    return false;
  }

  if (!isAdmin()) {
    root.innerHTML = `
      <div class="admin-access-denied">
        <div class="admin-access-card">
          <i data-lucide="shield-x" class="icon-xl" style="color:#ff5f5f;margin-bottom:1.25rem;display:block;"></i>
          <h2 style="color:var(--white);">Access Denied</h2>
          <p style="color:var(--white-muted);margin-bottom:0.5rem;">
            Signed in as <strong style="color:var(--white);">${escapeHtml(user.email || user.fullName)}</strong>
          </p>
          <p style="color:var(--white-muted);font-size:0.85rem;margin-bottom:1.75rem;">
            This account does not have admin privileges.<br>
            Sign out and sign in with an admin account.
          </p>
          <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
            <button class="btn btn-primary" id="access-denied-signout" type="button"
                    style="display:inline-flex;gap:0.4rem;align-items:center;">
              <i data-lucide="log-out" class="icon-xs"></i> Sign Out &amp; Switch Account
            </button>
            <a class="btn btn-ghost btn-sm" href="/" data-link="/"
               style="display:inline-flex;gap:0.4rem;align-items:center;">
              <i data-lucide="arrow-left" class="icon-xs"></i> Back to Website
            </a>
          </div>
        </div>
      </div>`;
    if (window.lucide) window.lucide.createIcons();
    root.querySelector('#access-denied-signout')?.addEventListener('click', () => {
      localStorage.removeItem('traqq_access_token');
      localStorage.removeItem('traqq_refresh_token');
      localStorage.removeItem('traqq_user');
      window.location.href = '/login';
    });
    return false;
  }

  const navItems = [
    { path: '/admin',             label: 'Dashboard',  icon: 'layout-dashboard' },
    { path: '/admin/bookings',    label: 'Bookings',   icon: 'calendar-range'   },
    { path: '/admin/drivers',     label: 'Drivers',    icon: 'car'              },
    { path: '/admin/customers',   label: 'Customers',  icon: 'users'            },
    { path: '/admin/payments',    label: 'Payments',   icon: 'credit-card'      },
    { path: '/admin/promos',      label: 'Promo Codes', icon: 'tag'             },
    { path: '/admin/analytics',   label: 'Analytics',  icon: 'bar-chart-2'      },
    { path: '/admin/settings',    label: 'Settings',   icon: 'settings'         },
  ];

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });

  const nameParts = (user.fullName || 'Admin').split(' ');
  const initials = escapeHtml(nameParts.map(n => n[0] || '').join('').slice(0, 2).toUpperCase() || 'A');
  const displayName = escapeHtml(user.fullName || 'Admin');

  root.innerHTML = `
    <div class="admin-layout" id="admin-layout">
      <div class="admin-sidebar-overlay" id="admin-overlay"></div>

      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="admin-sidebar-header">
          <a class="admin-sidebar-logo-wrap" data-link="/" href="/">
            <img src="/assets/images/logo.png" alt="TRAQQ"
                 class="admin-sidebar-logo-img"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
            <span class="admin-sidebar-logo-text" style="display:none;">TRAQQ</span>
          </a>
          <span class="admin-sidebar-tag">Admin Portal</span>
        </div>

        <nav class="admin-nav">
          <p class="admin-nav-section">Main</p>
          ${navItems.map(item => `
            <a class="admin-nav-link ${active === item.path ? 'active' : ''}"
               data-link="${item.path}" href="${item.path}">
              <span class="admin-nav-icon"><i data-lucide="${item.icon}" class="icon-sm"></i></span>
              <span class="admin-nav-label">${item.label}</span>
            </a>`).join('')}

          <hr class="admin-nav-divider">
          <p class="admin-nav-section">Account</p>
          <a class="admin-nav-link admin-nav-link--back" data-link="/" href="/">
            <span class="admin-nav-icon"><i data-lucide="arrow-left" class="icon-sm"></i></span>
            <span class="admin-nav-label">Back to Website</span>
          </a>
          <button class="admin-nav-link admin-nav-link--logout" id="admin-signout" type="button">
            <span class="admin-nav-icon"><i data-lucide="log-out" class="icon-sm"></i></span>
            <span class="admin-nav-label">Sign Out</span>
          </button>
        </nav>
      </aside>

      <div class="admin-body" id="admin-body">
        <header class="admin-topbar">
          <div class="admin-topbar-left">
            <button class="admin-hamburger" id="admin-hamburger" aria-label="Toggle sidebar" type="button">
              <i data-lucide="menu" class="icon-sm"></i>
            </button>
            <h1 class="admin-page-title">${title}</h1>
          </div>
          <div class="admin-topbar-right">
            <span class="admin-date-chip">
              <i data-lucide="calendar" class="icon-xs"></i>
              ${today}
            </span>
            <a class="admin-view-site-btn" data-link="/" href="/">
              <i data-lucide="external-link" class="icon-xs"></i>
              <span>View Site</span>
            </a>
            <div class="admin-user-chip">
              <span class="admin-user-avatar">${initials}</span>
              <span class="admin-user-name">${displayName}</span>
            </div>
          </div>
        </header>

        <main class="admin-content">
          ${bodyHTML}
        </main>
      </div>
    </div>`;

  const hamburger = root.querySelector('#admin-hamburger');
  const sidebar   = root.querySelector('#admin-sidebar');
  const overlay   = root.querySelector('#admin-overlay');

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburger?.addEventListener('click', () =>
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar()
  );
  overlay?.addEventListener('click', closeSidebar);

  root.querySelectorAll('.admin-nav-link[data-link]').forEach(link => {
    link.addEventListener('click', closeSidebar);
  });

  root.querySelector('#admin-signout')?.addEventListener('click', () => {
    closeSidebar();
    localStorage.removeItem('traqq_access_token');
    localStorage.removeItem('traqq_refresh_token');
    localStorage.removeItem('traqq_user');
    window.location.href = '/';
  });

  if (window.lucide) window.lucide.createIcons();
  return true;
}
