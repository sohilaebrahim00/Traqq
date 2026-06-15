import { renderNavbar } from '../components/navbar.js';

const routes = {
  '/': () => import('../pages/home.js'),
  '/booking': () => import('../pages/booking.js'),
  '/checkout': () => import('../pages/checkout.js'),
  '/success': () => import('../pages/success.js'),
  '/history': () => import('../pages/history.js'),
  '/booking-details': () => import('../pages/bookingDetails.js'),
  '/login': () => import('../pages/login.js'),
  '/register': () => import('../pages/register.js'),
  '/admin': () => import('../pages/adminDashboard.js'),
  '/admin/bookings': () => import('../pages/adminBookings.js'),
  '/admin/booking-details': () => import('../pages/adminBookingDetails.js'),
  '/admin/customers': () => import('../pages/adminCustomers.js'),
  '/admin/drivers': () => import('../pages/adminDrivers.js'),
  '/admin/payments': () => import('../pages/adminPayments.js'),
  '/admin/analytics': () => import('../pages/adminAnalytics.js'),
  '/admin/settings': () => import('../pages/adminSettings.js'),
  '/admin/promos': () => import('../pages/adminPromos.js'),
  '/about': () => import('../pages/about.js'),
  '/how-it-works': () => import('../pages/howItWorks.js'),
  '/contact': () => import('../pages/contact.js'),
  '/faq': () => import('../pages/faq.js'),
  '/terms': () => import('../pages/terms.js'),
  '/privacy': () => import('../pages/privacy.js'),
  '/packages': () => import('../pages/packages.js'),
  '/package-success': () => import('../pages/packageSuccess.js'),
  '/cancellation-policy': () => import('../pages/cancellationPolicy.js'),
  '/verify-booking': () => import('../pages/verifyBooking.js'),
  // Driver portal
  '/driver/login': () => import('../pages/driverLogin.js'),
  '/driver/dashboard': () => import('../pages/driverDashboard.js'),
  '/driver/bookings': () => import('../pages/driverBookingDetails.js'),
  // Customer tracking page
  '/booking-tracking': () => import('../pages/bookingTracking.js'),
};

const ADMIN_ROUTES = [
  '/admin', '/admin/bookings', '/admin/booking-details',
  '/admin/customers', '/admin/drivers', '/admin/payments', '/admin/analytics', '/admin/settings',
  '/admin/promos'
];

const DRIVER_ROUTES = [
  '/driver/login', '/driver/dashboard', '/driver/bookings'
];

let currentCleanup = null;
let currentRevealObs = null;
let navId = 0; // incremented on every navigate(); pages check this to detect stale renders

function initReveal(root) {
  if (currentRevealObs) {
    currentRevealObs.disconnect();
    currentRevealObs = null;
  }

  const SELECTOR = '.reveal, .reveal-up, .reveal-left, .reveal-right, .reveal-scale, .reveal-image';
  const elements = root.querySelectorAll(SELECTOR);
  if (!elements.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('reveal-visible'));
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

  elements.forEach(el => obs.observe(el));
  currentRevealObs = obs;
}

async function navigate(path, push = true) {
  // Each call gets a unique ID. Pages receive isActive() so they can bail out
  // if the user navigates again while an API fetch is still in flight.
  const myId = ++navId;
  const isActive = () => navId === myId;

  const pageRoot = document.getElementById('page-root');
  const footerRoot = document.getElementById('footer-root');

  const [pathname, queryString] = path.split('?');
  const searchParams = queryString
    ? Object.fromEntries(new URLSearchParams(queryString))
    : Object.fromEntries(new URL(location.href).searchParams);

  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  pageRoot.classList.add('page-exit');
  await sleep(180);

  // Another navigation fired during the exit animation — stop here.
  if (!isActive()) return;

  if (push) window.history.pushState({}, '', path);

  // Resolve dynamic routes
  let resolvedLoader = routes[pathname];
  if (!resolvedLoader && pathname.startsWith('/driver/bookings/')) {
    resolvedLoader = routes['/driver/bookings'];
    // Inject the booking ID into searchParams so the page can read params.id
    const bookingId = pathname.replace('/driver/bookings/', '');
    if (bookingId) searchParams.id = bookingId;
  } else if (!resolvedLoader && pathname.startsWith('/booking-tracking/')) {
    resolvedLoader = routes['/booking-tracking'];
    // Inject the booking reference into searchParams so the page can read params.ref
    const bookingRef = pathname.replace('/booking-tracking/', '');
    if (bookingRef) searchParams.ref = bookingRef;
  }
  const loader = resolvedLoader || routes['/'];
  const mod = await loader();

  // Another navigation fired while the module was loading — stop here.
  if (!isActive()) return;

  pageRoot.innerHTML = '';
  pageRoot.classList.remove('page-exit');
  pageRoot.classList.add('page-enter');

  try {
    const cleanup = await mod.default(pageRoot, { params: searchParams, path, navigate, isActive });
    // Only store cleanup if we're still the active navigation
    if (isActive()) currentCleanup = cleanup || null;
  } catch (err) {
    if (!isActive()) return;
    console.error('[router] page render error:', err);
    if (!pageRoot.innerHTML.trim()) {
      pageRoot.innerHTML = `
        <div style="min-height:60vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem;">
          <div>
            <p style="color:var(--white-muted);font-size:0.95rem;margin-bottom:1rem;">Something went wrong loading this page.</p>
            <a href="/" style="color:var(--gold);font-size:0.875rem;">← Back to Home</a>
          </div>
        </div>`;
    }
  } finally {
    if (isActive()) requestAnimationFrame(() => pageRoot.classList.remove('page-enter'));
  }

  if (!isActive()) return;

  if (window.lucide) window.lucide.createIcons();
  initReveal(pageRoot);

  renderNavbar(document.getElementById('navbar-root'), navigate);

  if (footerRoot) {
    const hideFooter = ADMIN_ROUTES.includes(pathname) ||
      DRIVER_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
    footerRoot.style.display = hideFooter ? 'none' : '';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function initRouter() {
  window.addEventListener('popstate', () => {
    const fullPath = location.pathname + (location.search || '');
    navigate(fullPath, false);
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-link]');
    if (link) {
      e.preventDefault();
      navigate(link.dataset.link);
    }
  });

  navigate(location.pathname + (location.search || ''), false);
}

export { initRouter, navigate };
