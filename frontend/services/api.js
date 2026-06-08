import { API_BASE_URL } from '../config.js';
const BASE_URL = API_BASE_URL;

function getToken() {
  return localStorage.getItem('traqq_access_token');
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(data.message || data.error || 'Request failed');
    err.response = data;   // attach full body so callers can read structured errors
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
