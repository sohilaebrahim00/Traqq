// API base URL resolution (in priority order):
//   1. window.TRAQQ_API_URL — injected at deploy time (Nginx sub_filter or <script> in index.html)
//   2. Localhost detection — direct to dev backend on port 4000
//   3. Relative /api — production Nginx same-domain proxy
const isLocalhost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL =
  (typeof window !== 'undefined' && window.TRAQQ_API_URL) ||
  (isLocalhost ? 'http://localhost:4000/api' : '/api');
