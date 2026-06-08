function getAuthState() {
  try {
    const user = JSON.parse(localStorage.getItem('traqq_user') || 'null');
    const token = localStorage.getItem('traqq_access_token');
    return { user, token, isAdmin: user?.role === 'ADMIN' };
  } catch {
    return { user: null, token: null, isAdmin: false };
  }
}

export function renderNavbar(root, navigate) {
  const { user, token, isAdmin } = getAuthState();
  const active = location.pathname;

  root.innerHTML = `
    <nav class="navbar">
      <div class="navbar-inner">
        <a class="navbar-logo" data-link="/" href="/">
          <img src="/assets/images/logo.png" alt="TRAQQ" class="navbar-logo-img"
               onerror="this.style.display='none';this.nextElementSibling.style.display='inline';" />
          <span class="navbar-logo-fallback">TRAQQ</span>
        </a>

        <div class="navbar-links">
          <a data-link="/" href="/" class="nav-link ${active === '/' ? 'active' : ''}">Home</a>
          <a data-link="/how-it-works" href="/how-it-works" class="nav-link ${active === '/how-it-works' ? 'active' : ''}">How It Works</a>
          <a data-link="/about" href="/about" class="nav-link ${active === '/about' ? 'active' : ''}">About</a>
          <a data-link="/faq" href="/faq" class="nav-link ${active === '/faq' ? 'active' : ''}">FAQ</a>
          <a data-link="/packages" href="/packages" class="nav-link ${active === '/packages' ? 'active' : ''}">Packages</a>
          <a data-link="/contact" href="/contact" class="nav-link ${active === '/contact' ? 'active' : ''}">Contact</a>
          ${isAdmin ? `<a data-link="/admin" href="/admin" class="nav-link ${active.startsWith('/admin') ? 'active' : ''}">Admin</a>` : ''}
        </div>

        <div class="navbar-actions">
          ${token
            ? `<a data-link="/history" href="/history" class="nav-link ${active === '/history' ? 'active' : ''}">My Rides</a>
               <button class="btn-logout" id="nav-logout">Sign Out</button>`
            : `<a data-link="/login" href="/login" class="nav-link ${active === '/login' ? 'active' : ''}">Sign In</a>`
          }
          <a data-link="/booking" href="/booking" class="btn btn-primary nav-cta">Book Now</a>
        </div>

        <button class="navbar-hamburger" id="hamburger" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>

      <div class="navbar-mobile" id="mobile-menu">
        <a data-link="/" href="/" class="nav-link">Home</a>
        <a data-link="/how-it-works" href="/how-it-works" class="nav-link">How It Works</a>
        <a data-link="/about" href="/about" class="nav-link">About</a>
        <a data-link="/faq" href="/faq" class="nav-link">FAQ</a>
        <a data-link="/packages" href="/packages" class="nav-link">Packages</a>
        <a data-link="/contact" href="/contact" class="nav-link">Contact</a>
        ${isAdmin ? `<a data-link="/admin" href="/admin" class="nav-link">Admin</a>` : ''}
        <hr class="mobile-divider" />
        ${token
          ? `<a data-link="/history" href="/history" class="nav-link">My Rides</a>
             <button class="btn-logout" id="mobile-logout">Sign Out</button>`
          : `<a data-link="/login" href="/login" class="nav-link">Sign In</a>
             <a data-link="/register" href="/register" class="nav-link">Create Account</a>`
        }
        <a data-link="/booking" href="/booking" class="btn btn-primary" style="margin-top:0.5rem;">Book Now — $99</a>
      </div>
    </nav>`;

  root.querySelector('#hamburger').addEventListener('click', () => {
    root.querySelector('#mobile-menu').classList.toggle('open');
    root.querySelector('#hamburger').classList.toggle('active');
  });

  root.querySelector('#nav-logout')?.addEventListener('click', () => {
    localStorage.removeItem('traqq_access_token');
    localStorage.removeItem('traqq_refresh_token');
    localStorage.removeItem('traqq_user');
    window.location.href = '/';
  });

  root.querySelector('#mobile-logout')?.addEventListener('click', () => {
    localStorage.removeItem('traqq_access_token');
    localStorage.removeItem('traqq_refresh_token');
    localStorage.removeItem('traqq_user');
    window.location.href = '/';
  });
}
