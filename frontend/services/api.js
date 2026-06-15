import { API_BASE_URL } from '../config.js';
const BASE_URL = API_BASE_URL;

function getToken() {
  return localStorage.getItem('traqq_access_token');
}

function getRefreshToken() {
  return localStorage.getItem('traqq_refresh_token');
}

// Attempt to refresh the access token once using the stored refresh token.
// Returns the new access token on success, or null on failure.
async function attemptRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.accessToken) {
      localStorage.setItem('traqq_access_token', data.accessToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

async function request(method, path, body, _retry = true) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  // On 401, try to silently refresh the access token and retry once
  if (res.status === 401 && _retry) {
    const newToken = await attemptRefresh();
    if (newToken) {
      return request(method, path, body, false);
    }
    // Refresh also failed — clear stale session so the user is prompted to log in
    localStorage.removeItem('traqq_access_token');
    localStorage.removeItem('traqq_refresh_token');
    localStorage.removeItem('traqq_user');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(data.message || data.error || 'Request failed');
    err.response = data;
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  post:  (path, body) => request('POST',   path, body),
  get:   (path)       => request('GET',    path),
  put:   (path, body) => request('PUT',    path, body),
  patch: (path, body) => request('PATCH',  path, body),
  del:   (path)       => request('DELETE', path)
};
