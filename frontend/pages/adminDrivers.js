import { adminLayout } from '../utils/adminLayout.js';
import { api } from '../services/api.js';
import { showToast, escapeHtml } from '../utils/auth.js';

export default async function adminDrivers(root, { isActive }) {
  const rendered = adminLayout(root, {
    title: 'Drivers Management',
    active: '/admin/drivers',
    bodyHTML: `
      <div class="admin-actions-bar" style="margin-bottom:2rem;">
        <button class="btn btn-primary" id="btn-create-driver" type="button">
          <i data-lucide="plus" class="icon-sm"></i> Add New Driver
        </button>
      </div>

      <!-- Create Driver Form (hidden by default) -->
      <div class="admin-card" id="create-driver-section" style="display:none; margin-bottom:2rem; padding: 2rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
          <h2 style="font-size:1.25rem; color:var(--white);">Create Driver Account</h2>
          <button class="btn btn-ghost btn-sm" id="btn-cancel-create" type="button">
            <i data-lucide="x" class="icon-sm"></i>
          </button>
        </div>
        
        <form id="create-driver-form">
          <div class="form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
            <div>
              <label class="form-label">Full Name</label>
              <input type="text" id="df-fullName" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Email Address</label>
              <input type="email" id="df-email" class="form-input" required />
            </div>
          </div>
          
          <div class="form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
            <div>
              <label class="form-label">Phone Number</label>
              <input type="tel" id="df-phoneNumber" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Password</label>
              <input type="password" id="df-password" class="form-input" required minlength="8" />
            </div>
          </div>
          
          <h3 style="font-size:1rem; color:var(--white); margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem;">Vehicle Details</h3>
          
          <div class="form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
            <div>
              <label class="form-label">Vehicle Make</label>
              <input type="text" id="df-make" class="form-input" placeholder="e.g. Cadillac" required />
            </div>
            <div>
              <label class="form-label">Vehicle Model</label>
              <input type="text" id="df-model" class="form-input" placeholder="e.g. Escalade" required />
            </div>
          </div>
          
          <div class="form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
            <div>
              <label class="form-label">Vehicle Color</label>
              <input type="text" id="df-color" class="form-input" placeholder="e.g. Black" required />
            </div>
            <div>
              <label class="form-label">License Plate</label>
              <input type="text" id="df-plate" class="form-input" required />
            </div>
          </div>
          
          <div class="form-row" style="margin-bottom:2rem;">
            <label class="form-label">Profile Photo URL (Optional)</label>
            <input type="url" id="df-photo" class="form-input" placeholder="https://..." />
          </div>

          <p id="create-error" class="form-error" style="display:none;"></p>

          <div style="display:flex; justify-content:flex-end;">
            <button type="submit" class="btn btn-primary" id="btn-submit-driver">Create Driver</button>
          </div>
        </form>
      </div>

      <!-- Drivers List -->
      <div id="drivers-list">
        <div class="skeleton" style="height:200px;border-radius:var(--radius);margin-bottom:1rem;"></div>
        <div class="skeleton" style="height:200px;border-radius:var(--radius);"></div>
      </div>
    `
  });

  if (!rendered) return;

  const createSection = root.querySelector('#create-driver-section');
  const createForm = root.querySelector('#create-driver-form');
  const errorEl = root.querySelector('#create-error');
  const submitBtn = root.querySelector('#btn-submit-driver');

  root.querySelector('#btn-create-driver').addEventListener('click', () => {
    createSection.style.display = 'block';
  });

  root.querySelector('#btn-cancel-create').addEventListener('click', () => {
    createSection.style.display = 'none';
    createForm.reset();
    errorEl.style.display = 'none';
  });

  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    
    const payload = {
      fullName: root.querySelector('#df-fullName').value.trim(),
      email: root.querySelector('#df-email').value.trim(),
      phoneNumber: root.querySelector('#df-phoneNumber').value.trim(),
      password: root.querySelector('#df-password').value,
      vehicleMake: root.querySelector('#df-make').value.trim(),
      vehicleModel: root.querySelector('#df-model').value.trim(),
      vehicleColor: root.querySelector('#df-color').value.trim(),
      vehiclePlate: root.querySelector('#df-plate').value.trim()
    };
    
    const photo = root.querySelector('#df-photo').value.trim();
    if (photo) payload.profilePhoto = photo;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
      await api.post('/admin/drivers', payload);
      showToast('Driver created successfully', 'success');
      createForm.reset();
      createSection.style.display = 'none';
      await loadDrivers();
    } catch (err) {
      errorEl.textContent = err.error || err.message || 'Failed to create driver.';
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Driver';
    }
  });

  async function loadDrivers() {
    try {
      const drivers = await api.get('/admin/drivers');
      if (isActive && !isActive()) return;

      const listEl = root.querySelector('#drivers-list');
      
      if (!drivers.length) {
        listEl.innerHTML = `
          <div class="admin-empty-state">
            <i data-lucide="car" class="icon-xl" style="color:var(--white-muted);margin-bottom:1rem;display:block;"></i>
            <h3>No drivers found</h3>
            <p>Click "Add New Driver" to onboard your first chauffeur.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      listEl.innerHTML = `
        <div class="admin-grid" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap:1.5rem;">
          ${drivers.map(d => `
            <div class="admin-card" style="padding:1.5rem;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
                <div style="display:flex; align-items:center; gap:1rem;">
                  <div style="width:48px;height:48px;border-radius:50%;background:var(--gold-dim);color:var(--gold);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:1.1rem;overflow:hidden;">
                    ${d.profilePhoto
                      ? `<img src="${escapeHtml(d.profilePhoto)}" style="width:100%;height:100%;object-fit:cover;" alt="Avatar">`
                      : escapeHtml(d.fullName.charAt(0))}
                  </div>
                  <div>
                    <h3 style="font-size:1.1rem;color:var(--white);margin-bottom:0.1rem;">${escapeHtml(d.fullName)}</h3>
                    <p style="font-size:0.85rem;color:var(--white-muted);">${escapeHtml(d.phoneNumber)}</p>
                  </div>
                </div>
                <span class="status-badge ${d.isAvailable ? 'status-confirmed' : 'status-cancelled'}" style="font-size:0.7rem;padding:0.2rem 0.5rem;">
                  ${d.isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </div>
              
              <div style="background:var(--bg-card); padding:1rem; border-radius:var(--radius); border:1px solid var(--border);">
                <p style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--white-muted); margin-bottom:0.75rem;">Vehicle Details</p>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                  <div>
                    <p style="font-size:0.75rem; color:var(--white-muted);">Make/Model</p>
                    <p style="font-size:0.9rem; color:var(--white);">${escapeHtml(d.vehicleColor)} ${escapeHtml(d.vehicleMake)} ${escapeHtml(d.vehicleModel)}</p>
                  </div>
                  <div>
                    <p style="font-size:0.75rem; color:var(--white-muted);">License Plate</p>
                    <p style="font-size:0.9rem; color:var(--gold); font-family:monospace;">${escapeHtml(d.vehiclePlate)}</p>
                  </div>
                </div>
              </div>
              <div style="margin-top:1.25rem;">
                <p style="font-size:0.8rem; color:var(--white-muted);"><i data-lucide="mail" class="icon-xs" style="vertical-align:-2px;margin-right:0.2rem;"></i> ${escapeHtml(d.email)}</p>
                ${d.licenseNumber ? `<p style="font-size:0.8rem; color:var(--white-muted); margin-top:0.4rem;"><i data-lucide="credit-card" class="icon-xs" style="vertical-align:-2px;margin-right:0.2rem;"></i> License: ${escapeHtml(d.licenseNumber)}</p>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();

    } catch (err) {
      if (isActive && !isActive()) return;
      root.querySelector('#drivers-list').innerHTML = `
        <div class="admin-empty-state">
          <p class="form-error">Failed to load drivers: ${err.message}</p>
        </div>
      `;
    }
  }

  await loadDrivers();
}
