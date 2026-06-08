// On localhost: talk directly to the dev backend on port 4000.
// On production (Nginx same-domain setup): use a relative path so no hardcoded domain is needed.
const isLocalhost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL = isLocalhost ? 'http://localhost:4000/api' : '/api';
