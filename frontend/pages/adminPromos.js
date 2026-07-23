import { adminLayout } from '../utils/adminLayout.js';
import { api } from '../services/api.js';
import { showToast, escapeHtml } from '../utils/auth.js';

function fmtDate(d) {
  return d ? new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : '—';
}

function fmtMoney(val) {
  return val !== null && val !== undefined ? '$' + Number(val).toFixed(2) : '—';
}

function codeRow(pc) {
  const uses    = pc._count?.uses ?? 0;
  const maxLbl  = pc.maxUses === null ? '∞' : String(pc.maxUses);
  const badge   = pc.isActive ? 'status-confirmed' : 'status-cancelled';
  const lbl     = pc.isActive ? 'Active' : 'Inactive';
  return `
    <tr data-code-id="${pc.id}">
      <td>
        <code style="color:var(--gold);font-size:0.9rem;font-weight:700;letter-spacing:0.06em;">
          ${escapeHtml(pc.code)}
        </code>
        ${pc.description ? `<p style="font-size:0.75rem;color:var(--white-muted);margin:0.2rem 0 0;">${escapeHtml(pc.description)}</p>` : ''}
      </td>
      <td style="font-weight:700;color:var(--gold);font-size:1rem;">${pc.discountPct}%</td>
      <td style="font-size:0.82rem;color:var(--white-muted);">${pc.firstRideOnly ? 'First ride only' : 'Any ride'}</td>
      <td style="font-size:0.85rem;">${uses}<span style="color:var(--white-muted);"> / ${maxLbl}</span></td>
      <td><span class="status-badge ${badge}">${lbl}</span></td>
      <td>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm btn-edit-code" data-id="${pc.id}" type="button">
            <i data-lucide="pencil" class="icon-xs"></i> Edit
          </button>
          <button class="btn btn-ghost btn-sm btn-toggle-code"
                  data-id="${pc.id}" data-active="${pc.isActive}" type="button"
                  style="color:${pc.isActive ? '#ff5f5f' : '#4caf50'};">
            ${pc.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </td>
    </tr>`;
}

export default async function adminPromos(root, { isActive } = {}) {
  const rendered = adminLayout(root, {
    title: 'Promo Codes',
    active: '/admin/promos',
    bodyHTML: `
      <div id="promo-content">
        ${Array(3).fill(`
          <div class="skeleton" style="height:100px;border-radius:var(--radius-sm);margin-bottom:1.5rem;"></div>`).join('')}
      </div>`
  });
  if (!rendered) return;

  const content = root.querySelector('#promo-content');

  // Load codes list and usage stats in parallel
  let allCodes = [];
  let uses     = [];
  let summary  = [];

  try {
    const [codesRes, usageRes] = await Promise.all([
      api.get('/admin/promo'),
      api.get('/admin/promo/usage')
    ]);
    if (isActive && !isActive()) return;
    allCodes = codesRes.codes  || [];
    uses     = usageRes.uses   || [];
    summary  = usageRes.summary || [];
  } catch (e) {
    if (isActive && !isActive()) return;
    content.innerHTML = `
      <div class="empty-state" style="padding:3rem;">
        <p class="form-error">${escapeHtml(e.message || 'Failed to load promo data.')}</p>
      </div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const totalSaved = uses.reduce((sum, u) => sum + Number(u.discountAmount), 0);
  const paidUses   = uses.filter(u => u.booking?.paymentStatus === 'PAID');

  content.innerHTML = `
    <!-- ── Create / Edit form (hidden until triggered) ── -->
    <div class="admin-card" id="promo-form-section"
         style="display:none;margin-bottom:2rem;padding:2rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
        <h2 id="promo-form-title" style="font-size:1.2rem;color:var(--white);margin:0;">
          Create Promo Code
        </h2>
        <button class="btn btn-ghost btn-sm" id="promo-form-close" type="button">
          <i data-lucide="x" class="icon-sm"></i>
        </button>
      </div>

      <form id="promo-form" autocomplete="off">
        <input type="hidden" id="editing-promo-id" value="" />

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.25rem;">
          <div>
            <label class="form-label">Code <span class="required">*</span></label>
            <input type="text" class="form-input" id="pf-code"
                   placeholder="e.g. SUMMER20"
                   style="text-transform:uppercase;letter-spacing:0.08em;font-weight:600;"
                   maxlength="30" />
            <p id="pf-code-hint" style="font-size:0.75rem;color:var(--white-muted);margin-top:0.3rem;">
              Letters, numbers, hyphens only. Auto-uppercased.
            </p>
          </div>
          <div>
            <label class="form-label">Discount % <span class="required">*</span></label>
            <input type="number" class="form-input" id="pf-pct"
                   placeholder="e.g. 15" min="1" max="100" />
          </div>
        </div>

        <div style="margin-bottom:1.25rem;">
          <label class="form-label">Description <span class="optional">(optional)</span></label>
          <input type="text" class="form-input" id="pf-desc"
                 placeholder="e.g. Influencer partner discount" maxlength="200" />
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.25rem;">
          <div>
            <label class="form-label">Restriction</label>
            <select class="form-input" id="pf-firstride">
              <option value="true">First ride only</option>
              <option value="false">Any ride (no restriction)</option>
            </select>
          </div>
          <div>
            <label class="form-label">Max Uses <span class="optional">(optional)</span></label>
            <input type="number" class="form-input" id="pf-maxuses"
                   placeholder="Leave blank for unlimited" min="1" />
          </div>
        </div>

        <div style="margin-bottom:1.75rem;">
          <label class="form-label">Status</label>
          <select class="form-input" id="pf-active" style="max-width:220px;">
            <option value="true">Active — customers can use this code</option>
            <option value="false">Inactive — code is disabled</option>
          </select>
        </div>

        <p id="promo-form-error" class="form-error" style="display:none;margin-bottom:1rem;"></p>

        <div style="display:flex;gap:1rem;justify-content:flex-end;align-items:center;">
          <button type="button" class="btn btn-ghost" id="promo-form-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary" id="promo-form-submit">Create Code</button>
        </div>
      </form>
    </div>

    <!-- ── Codes management table ── -->
    <div class="admin-panel" style="margin-bottom:1.5rem;">
      <div class="admin-panel-header">
        <h3>All Promo Codes</h3>
        <button class="btn btn-primary btn-sm" id="btn-new-promo" type="button">
          <i data-lucide="plus" class="icon-xs"></i> New Code
        </button>
      </div>
      <div id="codes-table-wrap">
        ${renderCodesTableHTML(allCodes)}
      </div>
    </div>

    <!-- ── Usage stat cards ── -->
    ${summary.length ? `
    <div class="promo-usage-grid" style="margin-bottom:1.5rem;">
      ${summary.map(pc => `
        <div class="promo-stat-card">
          <p class="promo-stat-code">${escapeHtml(pc.code)}</p>
          <p class="promo-stat-count">${pc._count.uses}</p>
          <p class="promo-stat-label">
            ${pc.discountPct}% off ·
            ${pc.firstRideOnly ? 'First ride only' : 'Any ride'} ·
            ${pc.isActive ? '✓ Active' : '✗ Inactive'}
          </p>
        </div>`).join('')}
      <div class="promo-stat-card">
        <p class="promo-stat-code" style="color:var(--white-muted);">Total Discount Given</p>
        <p class="promo-stat-count">${fmtMoney(totalSaved)}</p>
        <p class="promo-stat-label">${paidUses.length} paid ride${paidUses.length !== 1 ? 's' : ''} with promo</p>
      </div>
    </div>` : ''}

    <!-- ── Usage history table ── -->
    <div class="admin-panel">
      <div class="admin-panel-header">
        <h3>Usage History</h3>
        <span class="admin-count">${uses.length} use${uses.length !== 1 ? 's' : ''}</span>
      </div>
      ${uses.length ? `
      <div class="admin-table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Customer</th>
              <th>Booking Ref</th>
              <th>Discount</th>
              <th>Payment</th>
              <th>Date Used</th>
            </tr>
          </thead>
          <tbody>
            ${uses.map(u => `
              <tr>
                <td>
                  <code style="color:var(--gold);font-size:0.85rem;">
                    ${escapeHtml(u.promoCode?.code || '—')}
                  </code>
                </td>
                <td>
                  ${escapeHtml(u.user?.fullName || '—')}<br>
                  <span style="font-size:0.78rem;color:var(--white-muted);">
                    ${escapeHtml(u.booking?.phoneNumber || '')}
                  </span>
                </td>
                <td>
                  <a class="btn-view-link"
                     data-link="/admin/booking-details?id=${u.bookingId}"
                     href="/admin/booking-details?id=${u.bookingId}">
                    ${escapeHtml(u.booking?.bookingRef || u.bookingId.slice(-8).toUpperCase())}
                  </a>
                </td>
                <td style="color:#4caf50;font-weight:600;">${fmtMoney(u.discountAmount)}</td>
                <td>
                  <span class="status-badge ${u.booking?.paymentStatus === 'PAID' ? 'status-paid' : 'status-unpaid'}">
                    ${escapeHtml(u.booking?.paymentStatus || '—')}
                  </span>
                </td>
                <td style="white-space:nowrap;font-size:0.82rem;">${fmtDate(u.usedAt)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `
      <div class="empty-state" style="padding:3rem;">
        <i data-lucide="tag" class="icon-xl"
           style="color:var(--white-muted);margin-bottom:0.75rem;display:block;"></i>
        <h3 style="color:var(--white);">No promo codes used yet</h3>
        <p style="color:var(--white-muted);font-size:0.85rem;">
          Usage will appear here once customers redeem promo codes at checkout.
        </p>
      </div>`}
    </div>`;

  if (window.lucide) window.lucide.createIcons();

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const formSection   = content.querySelector('#promo-form-section');
  const formTitle     = content.querySelector('#promo-form-title');
  const formSubmit    = content.querySelector('#promo-form-submit');
  const formError     = content.querySelector('#promo-form-error');
  const editingId     = content.querySelector('#editing-promo-id');
  const codeInput     = content.querySelector('#pf-code');
  const codeHint      = content.querySelector('#pf-code-hint');
  const pctInput      = content.querySelector('#pf-pct');
  const descInput     = content.querySelector('#pf-desc');
  const firstRideSel  = content.querySelector('#pf-firstride');
  const maxUsesInput  = content.querySelector('#pf-maxuses');
  const activeSel     = content.querySelector('#pf-active');
  const codesWrap     = content.querySelector('#codes-table-wrap');

  // ── Helpers ────────────────────────────────────────────────────────────────

  function resetForm() {
    editingId.value         = '';
    formTitle.textContent   = 'Create Promo Code';
    formSubmit.textContent  = 'Create Code';
    codeInput.value         = '';
    codeInput.disabled      = false;
    codeHint.style.display  = '';
    pctInput.value          = '';
    descInput.value         = '';
    firstRideSel.value      = 'true';
    maxUsesInput.value      = '';
    activeSel.value         = 'true';
    formError.style.display = 'none';
    formSubmit.disabled     = false;
  }

  function openForm(code = null) {
    if (code) {
      editingId.value         = code.id;
      formTitle.textContent   = `Edit: ${code.code}`;
      formSubmit.textContent  = 'Save Changes';
      codeInput.value         = code.code;
      codeInput.disabled      = true;
      codeHint.textContent    = 'Code cannot be changed after creation.';
      pctInput.value          = code.discountPct;
      descInput.value         = code.description || '';
      firstRideSel.value      = String(code.firstRideOnly);
      maxUsesInput.value      = code.maxUses ?? '';
      activeSel.value         = String(code.isActive);
    } else {
      resetForm();
    }
    formError.style.display = 'none';
    formSection.style.display = '';
    formSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => (codeInput.disabled ? pctInput : codeInput).focus(), 80);
  }

  function closeForm() {
    formSection.style.display = 'none';
    resetForm();
  }

  function reRenderCodes(codes) {
    allCodes = codes;
    codesWrap.innerHTML = renderCodesTableHTML(codes);
    if (window.lucide) window.lucide.createIcons();
    attachTableListeners();
  }

  function attachTableListeners() {
    codesWrap.querySelectorAll('.btn-edit-code').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = allCodes.find(c => c.id === btn.dataset.id);
        if (code) openForm(code);
      });
    });

    codesWrap.querySelectorAll('.btn-toggle-code').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id       = btn.dataset.id;
        const wasActive = btn.dataset.active === 'true';
        btn.disabled   = true;
        btn.textContent = 'Saving…';
        try {
          const { promo } = await api.patch(`/admin/promo/${id}`, { isActive: !wasActive });
          const idx = allCodes.findIndex(c => c.id === id);
          if (idx !== -1) allCodes[idx] = { ...allCodes[idx], ...promo };
          reRenderCodes([...allCodes]);
          showToast(`${promo.code} ${promo.isActive ? 'activated' : 'deactivated'}.`, 'success');
        } catch (err) {
          btn.disabled    = false;
          btn.textContent = wasActive ? 'Deactivate' : 'Activate';
          showToast(err.message || 'Failed to update.', 'error');
        }
      });
    });
  }

  // ── Event listeners ────────────────────────────────────────────────────────
  content.querySelector('#btn-new-promo')?.addEventListener('click', () => openForm(null));
  content.querySelector('#promo-form-close')?.addEventListener('click', closeForm);
  content.querySelector('#promo-form-cancel')?.addEventListener('click', closeForm);

  codeInput?.addEventListener('input', () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
  });

  content.querySelector('#promo-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    formError.style.display = 'none';

    const id     = editingId.value;
    const isEdit = Boolean(id);

    const maxUsesRaw = maxUsesInput.value.trim();
    const payload = {
      discountPct:   parseInt(pctInput.value, 10),
      description:   descInput.value.trim(),
      firstRideOnly: firstRideSel.value === 'true',
      maxUses:       maxUsesRaw ? parseInt(maxUsesRaw, 10) : null,
      isActive:      activeSel.value === 'true'
    };

    if (!isEdit) {
      const code = codeInput.value.trim().toUpperCase();
      if (code.length < 2) {
        formError.textContent = 'Code must be at least 2 characters.';
        formError.style.display = 'block';
        return;
      }
      payload.code = code;
    }

    if (!payload.discountPct || payload.discountPct < 1 || payload.discountPct > 100) {
      formError.textContent = 'Discount must be between 1% and 100%.';
      formError.style.display = 'block';
      return;
    }

    formSubmit.disabled    = true;
    formSubmit.textContent = 'Saving…';

    try {
      if (isEdit) {
        const { promo } = await api.patch(`/admin/promo/${id}`, payload);
        const idx = allCodes.findIndex(c => c.id === id);
        if (idx !== -1) allCodes[idx] = { ...allCodes[idx], ...promo };
        reRenderCodes([...allCodes]);
        showToast(`${promo.code} updated.`, 'success');
      } else {
        const { promo } = await api.post('/admin/promo', payload);
        allCodes.unshift(promo);
        reRenderCodes([...allCodes]);
        showToast(`${promo.code} created.`, 'success');
      }
      closeForm();
    } catch (err) {
      formError.textContent   = err.message || (isEdit ? 'Failed to update.' : 'Failed to create.');
      formError.style.display = 'block';
      formSubmit.disabled     = false;
      formSubmit.textContent  = isEdit ? 'Save Changes' : 'Create Code';
    }
  });

  attachTableListeners();
}

// Pure function — used at initial render and on re-render
function renderCodesTableHTML(codes) {
  if (!codes.length) {
    return `
      <div class="empty-state" style="padding:2.5rem;text-align:center;">
        <i data-lucide="tag" class="icon-xl"
           style="color:var(--white-muted);margin-bottom:0.75rem;display:block;"></i>
        <h3 style="color:var(--white);">No promo codes yet</h3>
        <p style="color:var(--white-muted);font-size:0.85rem;">
          Click "New Code" above to create your first promo code.
        </p>
      </div>`;
  }
  return `
    <div class="admin-table-scroll">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Discount</th>
            <th>Restriction</th>
            <th>Uses / Max</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${codes.map(codeRow).join('')}
        </tbody>
      </table>
    </div>`;
}
