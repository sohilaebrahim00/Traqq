export function getUser() {
  try { return JSON.parse(localStorage.getItem('traqq_user') || 'null'); }
  catch { return null; }
}

export function getToken() {
  return localStorage.getItem('traqq_access_token');
}

export function isAdmin() {
  return getUser()?.role === 'ADMIN';
}

export function isDriver() {
  return getUser()?.role === 'DRIVER';
}

export function logout() {
  localStorage.removeItem('traqq_access_token');
  localStorage.removeItem('traqq_refresh_token');
  localStorage.removeItem('traqq_user');
}

export function saveBookingToHistory(booking) {
  try {
    const existing = JSON.parse(localStorage.getItem('traqq_my_bookings') || '[]');
    const updated = [booking, ...existing.filter(b => b.id !== booking.id)];
    localStorage.setItem('traqq_my_bookings', JSON.stringify(updated.slice(0, 50)));
  } catch {}
}

export function getLocalBookings() {
  try { return JSON.parse(localStorage.getItem('traqq_my_bookings') || '[]'); }
  catch { return []; }
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
