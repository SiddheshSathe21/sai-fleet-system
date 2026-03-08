/* ═══════════════════════════════════════════════════════════════════
   NETLIFY IDENTITY AUTH
   ─────────────────────────────────────────────────────────────────
   No passwords stored in code. All auth is handled by Netlify's
   servers. To add/remove users go to:
   Netlify Dashboard → Site → Identity → Users
   ═══════════════════════════════════════════════════════════════════ */

// Always start with app hidden — never show until auth confirmed
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('main-app').style.display    = 'none';
  document.getElementById('login-screen').style.display = 'flex';
});

function showApp(user) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').style.display     = 'block';
  const emailEl = document.getElementById('user-email');
  if (emailEl && user && user.email) emailEl.textContent = user.email;
  init();
}

function showLogin() {
  document.getElementById('main-app').style.display      = 'none';
  document.getElementById('login-screen').style.display  = 'flex';
  document.getElementById('login-checking').style.display = 'none';
  document.getElementById('login-action').style.display   = 'block';
}

function doLogout() {
  netlifyIdentity.logout();
}

// Boot
window.addEventListener('load', () => {
  if (typeof netlifyIdentity === 'undefined') {
    showLogin();
    return;
  }

  // ── FIX: detect invite / password-recovery token in URL ──────────
  // When client clicks the invite email link, the URL contains
  // #invite_token=xxx or #recovery_token=xxx
  // We must open the widget immediately so they can set their password
  const hash = window.location.hash;
  if (hash && (hash.includes('invite_token=') || hash.includes('recovery_token='))) {
    // Let the widget handle the token — it will open automatically
    netlifyIdentity.on('init', () => {
      netlifyIdentity.open();
    });
  }

  netlifyIdentity.on('init', user => {
    if (user) {
      // Already logged in from a previous session
      showApp(user);
    } else {
      // Not logged in — show Sign In button
      document.getElementById('login-checking').style.display = 'none';
      document.getElementById('login-action').style.display   = 'block';
    }
  });

  netlifyIdentity.on('login', user => {
    // After invite accepted OR normal login — close widget, show app
    netlifyIdentity.close();
    // Clear the token from URL so it's not reused
    history.replaceState(null, '', window.location.pathname);
    showApp(user);
  });

  netlifyIdentity.on('logout', () => {
    showLogin();
  });

  netlifyIdentity.init();
});

/* ═══════════════════════════════════════════════════════════════════
   Shri Sai Enterprizes — Fleet Compliance
   script.js
   ═══════════════════════════════════════════════════════════════════ */

/* ── DATA ───────────────────────────────────────────────────────── */
let DATA = [
  {id:'MH04GC0366',reg:'2013-03-14',email:'owner1@example.com',fitness:'2026-09-01',tax:'2026-05-31',insurance:'2026-08-19',pucc:'2025-10-02',permit:'2026-01-11'},
  {id:'MH46AR7469',reg:'2016-12-27',email:'owner2@example.com',fitness:'2026-01-11',tax:'2026-04-30',insurance:'2027-02-01',pucc:'2027-01-11',permit:'2026-11-25'},
  {id:'MH20DE6247',reg:'2016-04-18',email:'owner3@example.com',fitness:'2027-01-05',tax:'2026-03-31',insurance:'2027-02-04',pucc:'2026-07-04',permit:'2030-01-23'},
  {id:'MH17AG7597',reg:'2013-09-30',email:'owner4@example.com',fitness:'2026-10-15',tax:'2026-02-28',insurance:'2026-09-27',pucc:'2026-04-15',permit:'2027-07-04'},
  {id:'MH12FZ4246',reg:'2010-11-12',email:'owner5@example.com',fitness:'2026-03-10',tax:'2026-03-31',insurance:'2027-02-13',pucc:'2025-08-06',permit:'2031-03-01'},
  {id:'MH04FJ6538',reg:'2012-02-09',email:'owner6@example.com',fitness:'2026-06-05',tax:'2026-03-31',insurance:'2026-05-06',pucc:'2026-08-23',permit:'2025-09-22'},
  {id:'MH14CP5598',reg:'2011-11-28',email:'owner7@example.com',fitness:'2026-01-26',tax:'2025-02-28',insurance:'2026-01-10',pucc:'2025-07-23',permit:'2027-05-17'},
];

const FL  = ['fitness', 'tax', 'insurance', 'pucc', 'permit'];
const LBL = { fitness:'Fitness', tax:'Tax', insurance:'Insurance', pucc:'PUCC', permit:'Permit' };

let activeFilter  = 'all';
let editingId     = null;
let viewingId     = null;
let emailSentKeys = new Set();
let ejsCfg        = { pk:'', svc:'', tpl:'', days:5 };

/* ── THEME ──────────────────────────────────────────────────────── */
function toggleTheme() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
  document.getElementById('t-icon').textContent = dark ? '🌙' : '☀️';
  document.getElementById('t-lbl').textContent  = dark ? 'Dark' : 'Light';
}

/* ── UTILITY FUNCTIONS ──────────────────────────────────────────── */

// Days difference from today to a date string
function dd(s) {
  const n = new Date(); n.setHours(0, 0, 0, 0);
  const d = new Date(s); d.setHours(0, 0, 0, 0);
  return Math.round((d - n) / 86400000);
}

// Format a date string to readable Indian format
function fmt(s) {
  if (!s) return '--';
  const d = new Date(s);
  return isNaN(d) ? '--' : d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

// Badge CSS class based on days left
function bc(d) { return d < 0 ? 'b-expired' : d <= 30 ? 'b-critical' : d <= 90 ? 'b-warning' : 'b-ok'; }

// Badge text based on days left
function bt(d) { return d < 0 ? 'Expired' : d + 'd left'; }

// Status colour based on days left
function sc(d) {
  const dk = document.documentElement.getAttribute('data-theme') === 'dark';
  if (d < 0)   return dk ? '#e05c5c' : '#c0392b';
  if (d <= 30) return dk ? '#e08a30' : '#c2710c';
  if (d <= 90) return dk ? '#d4a017' : '#9a6c00';
  return dk ? '#34c97a' : '#1a7a47';
}

// OK / healthy colour
function okC() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? '#34c97a' : '#1a7a47';
}

// Expired & critical counts for a vehicle
function vs(v) {
  const dl = FL.map(f => dd(v[f]));
  return {
    exp:  dl.filter(d => d < 0).length,
    crit: dl.filter(d => d >= 0 && d <= 30).length,
  };
}

function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function todayStr()    { return new Date().toISOString().slice(0, 10); }

/* ── TOAST ──────────────────────────────────────────────────────── */
let toastT = null;
function toast(msg, ms = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), ms);
}

/* ── CLOCK ──────────────────────────────────────────────────────── */
function tick() {
  document.getElementById('clock').textContent =
    new Date().toLocaleString('en-IN', {
      weekday:'short', day:'2-digit', month:'short', year:'numeric',
      hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false,
    });
}
setInterval(tick, 1000);
tick();

/* ── REMINDERS ──────────────────────────────────────────────────── */
function checkReminders() {
  const thr    = Math.max(1, parseInt(ejsCfg.days) || 5);
  const banner = document.getElementById('rem-banner');
  const alerts = [];

  DATA.forEach(v => FL.forEach(f => {
    const d = dd(v[f]);
    if (d >= 0 && d <= thr) alerts.push({ v, f, d });
  }));

  if (!alerts.length) { banner.classList.remove('show'); return; }

  document.getElementById('rem-txt').textContent =
    'Documents expiring within ' + thr + ' day' + (thr !== 1 ? 's' : '');
  banner.classList.add('show');

  document.getElementById('rem-items').innerHTML = alerts
    .sort((a, b) => a.d - b.d)
    .map(a => `<div class="rem-item">&#x1F514; <b>${a.v.id}</b> &mdash; ${LBL[a.f]} expires in
      <b style="color:${sc(a.d)}">${a.d} day${a.d !== 1 ? 's' : ''}</b>
      ${a.v.email ? `<span style="color:var(--text-muted)">(${a.v.email})</span>` : ''}</div>`)
    .join('');

  if (ejsCfg.pk && ejsCfg.svc && ejsCfg.tpl) sendEmails(alerts);
}

function sendEmails(alerts) {
  const today = todayStr(), byV = {};

  alerts.forEach(a => {
    const k = a.v.id + '|' + today;
    if (emailSentKeys.has(k)) return;
    if (!byV[a.v.id]) byV[a.v.id] = { v: a.v, docs: [] };
    byV[a.v.id].docs.push(a);
  });

  if (!Object.keys(byV).length) return;
  if (typeof emailjs === 'undefined') return;

  emailjs.init(ejsCfg.pk);

  Object.values(byV).forEach(({ v, docs }) => {
    if (!v.email) return;
    const docList = docs.map(d =>
      '- ' + LBL[d.f] + ': expires ' + fmt(v[d.f]) + ' (in ' + d.d + 'd)'
    ).join('\n');

    emailjs.send(ejsCfg.svc, ejsCfg.tpl, {
      vehicle_id:  v.id,
      owner_email: v.email,
      reg_date:    fmt(v.reg),
      doc_list:    docList,
      days_left:   docs[0].d,
      doc_count:   docs.length,
      check_date:  fmt(today),
    })
      .then(() => emailSentKeys.add(v.id + '|' + today))
      .catch(e => console.warn('Email err', v.id, e));
  });
}

/* ── STATS ──────────────────────────────────────────────────────── */
function renderStats() {
  let exp = 0;
  DATA.forEach(v => FL.forEach(f => { if (dd(v[f]) < 0) exp++; }));

  document.getElementById('stats').innerHTML =
    `<div class="stat">
      <div class="stat-lbl">Total Vehicles</div>
      <div class="stat-num c-def">${DATA.length}</div>
      <div class="stat-hint">${DATA.length * FL.length} documents tracked</div>
    </div>` +
    `<div class="stat">
      <div class="stat-lbl">Expired Documents</div>
      <div class="stat-num c-red">${exp}</div>
      <div class="stat-hint">${exp > 0 ? 'Immediate action required' : 'All documents current'}</div>
    </div>`;
}

/* ── FILTER ─────────────────────────────────────────────────────── */
function setFilter(f, btn) {
  activeFilter = f;
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTable();
}

/* ── TABLE ──────────────────────────────────────────────────────── */
function renderTable() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  let html = '', cnt = 0;

  DATA.filter(v => {
    if (q && !v.id.toLowerCase().includes(q) && !(v.email || '').toLowerCase().includes(q)) return false;
    const s = vs(v);
    if (activeFilter === 'expired'  && s.exp === 0) return false;
    if (activeFilter === 'critical' && s.crit === 0 && s.exp === 0) return false;
    if (activeFilter === 'ok'       && (s.exp > 0 || s.crit > 0)) return false;
    return true;
  }).forEach(v => {
    cnt++;
    const s  = vs(v);
    const rc = s.exp > 0 ? 'row-expired' : s.crit > 0 ? 'row-critical' : '';
    const cells = FL.map(f => {
      const d = dd(v[f]);
      return `<td class="exp-cell">
        <div class="exp-date">${fmt(v[f])}</div>
        <span class="badge ${bc(d)}">${bt(d)}</span>
      </td>`;
    }).join('');

    html += `<tr class="${rc}">
      <td>
        <div class="v-id">${v.id}</div>
        <div class="v-reg">Reg: ${fmt(v.reg)}</div>
        <div class="v-email">&#x2709; ${v.email || '&mdash;'}</div>
      </td>
      ${cells}
      <td>
        <div class="row-actions">
          <button class="row-btn" onclick="openView('${v.id}')">View</button>
          <button class="row-btn edit-btn" onclick="openEdit('${v.id}')">Edit</button>
        </div>
      </td>
    </tr>`;
  });

  document.getElementById('tbody').innerHTML = html ||
    `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:28px 0">No vehicles match.</td></tr>`;
  document.getElementById('v-count').textContent = '(' + cnt + ')';
}

/* ── PANELS ─────────────────────────────────────────────────────── */
function renderPanels() {
  const ex = [], up = [];

  DATA.forEach(v => FL.forEach(f => {
    const d = dd(v[f]);
    if (d < 0)        ex.push({ v, f, d });
    else if (d <= 90) up.push({ v, f, d });
  }));

  ex.sort((a, b) => a.d - b.d);
  up.sort((a, b) => a.d - b.d);

  const row = ({ v, f, d }, isEx) => `<div class="prow">
    <div class="pdots" style="background:${sc(isEx ? -1 : d)}"></div>
    <div class="pinfo">
      <div class="pvid">${v.id}</div>
      <div class="ptyp">${LBL[f]}</div>
    </div>
    <div class="pdat">${fmt(v[f])}</div>
    <div class="pday" style="color:${sc(isEx ? -1 : d)}">${isEx ? Math.abs(d) + 'd ago' : d + 'd'}</div>
  </div>`;

  document.getElementById('exp-list').innerHTML =
    ex.length ? ex.map(x => row(x, true)).join('') : '<div class="pempty">No expired documents.</div>';
  document.getElementById('upc-list').innerHTML =
    up.length ? up.map(x => row(x, false)).join('') : '<div class="pempty">Nothing expiring in 90 days.</div>';
}

/* ── VIEW MODAL ─────────────────────────────────────────────────── */
function openView(id) {
  const v = DATA.find(x => x.id === id);
  if (!v) return;
  viewingId = id;

  const s = vs(v);
  document.getElementById('v-vid').textContent = v.id;
  document.getElementById('v-sub').textContent =
    'Reg: ' + fmt(v.reg) + '  ·  ✉ ' + (v.email || 'No email set');

  document.getElementById('v-sum').innerHTML =
    `<div class="vsi"><div class="vsil">Expired</div>
     <div class="vsiv" style="color:${s.exp > 0 ? sc(-1) : okC()}">${s.exp}</div></div>` +
    `<div class="vsi"><div class="vsil">Critical ≤30d</div>
     <div class="vsiv" style="color:${s.crit > 0 ? sc(15) : okC()}">${s.crit}</div></div>` +
    `<div class="vsi"><div class="vsil">Documents</div><div class="vsiv">${FL.length}</div></div>`;

  document.getElementById('v-grid').innerHTML = FL.map(f => {
    const d = dd(v[f]), c = sc(d);
    const p = d < 0 ? 0 : Math.min(100, Math.round(d / 365 * 100));
    return `<div class="dcard">
      <div class="dlbl">${LBL[f]}</div>
      <div class="ddate">${fmt(v[f])}</div>
      <div class="ddays" style="color:${c}">${d < 0 ? 'Expired (' + Math.abs(d) + 'd ago)' : d + ' days left'}</div>
      <div class="dbar"><div class="dbarf" style="width:${p}%;background:${c}"></div></div>
    </div>`;
  }).join('');

  document.getElementById('view-ov').classList.add('open');
}

function closeView(e) {
  if (!e || e.target === document.getElementById('view-ov')) {
    document.getElementById('view-ov').classList.remove('open');
    viewingId = null;
  }
}

function switchToEdit() {
  if (!viewingId) return;
  const id = viewingId;
  closeView();
  setTimeout(() => openEdit(id), 80);
}

/* ── FORM HELPERS ───────────────────────────────────────────────── */
function resetForm() {
  ['f-id','f-reg','f-email','f-fitness','f-tax','f-insurance','f-pucc','f-permit'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
    el.classList.remove('err');
    el.disabled = false;
  });
  document.querySelectorAll('.ferr').forEach(el => el.classList.remove('show'));
  document.getElementById('e-f-id').textContent = 'Enter a valid vehicle number';
}

function clrE(fid) {
  const el = document.getElementById(fid);
  if (el) el.classList.remove('err');
  const er = document.getElementById('e-' + fid);
  if (er) er.classList.remove('show');
}

/* ── ADD MODAL ──────────────────────────────────────────────────── */
function openAdd() {
  editingId = null;
  resetForm();
  document.getElementById('form-title').textContent  = 'Add New Vehicle';
  document.getElementById('form-sub').textContent    = 'Enter vehicle details and document expiry dates';
  document.getElementById('form-submit').textContent = 'Add Vehicle';
  document.getElementById('edit-badge').classList.remove('show');
  document.getElementById('form-ov').classList.add('open');
  setTimeout(() => document.getElementById('f-id').focus(), 120);
}

/* ── EDIT MODAL ─────────────────────────────────────────────────── */
function openEdit(id) {
  const v = DATA.find(x => x.id === id);
  if (!v) return;
  editingId = id;
  resetForm();

  document.getElementById('f-id').value        = v.id;
  document.getElementById('f-reg').value       = v.reg;
  document.getElementById('f-email').value     = v.email || '';
  document.getElementById('f-fitness').value   = v.fitness;
  document.getElementById('f-tax').value       = v.tax;
  document.getElementById('f-insurance').value = v.insurance;
  document.getElementById('f-pucc').value      = v.pucc;
  document.getElementById('f-permit').value    = v.permit;
  document.getElementById('f-id').disabled     = true;

  document.getElementById('form-title').textContent  = 'Edit Vehicle';
  document.getElementById('form-sub').textContent    = 'Updating details for ' + v.id;
  document.getElementById('form-submit').textContent = 'Save Changes';
  document.getElementById('edit-badge').classList.add('show');
  document.getElementById('form-ov').classList.add('open');
  setTimeout(() => document.getElementById('f-reg').focus(), 120);
}

function closeForm(e) {
  if (!e || e.target === document.getElementById('form-ov')) {
    document.getElementById('form-ov').classList.remove('open');
    editingId = null;
  }
}

/* ── SUBMIT FORM (add + edit) ───────────────────────────────────── */
function submitForm() {
  const isEdit  = editingId !== null;
  const docFlds = ['f-reg','f-email','f-fitness','f-tax','f-insurance','f-pucc','f-permit'];
  const allFlds = isEdit ? docFlds : ['f-id', ...docFlds];
  let ok = true;

  allFlds.forEach(fid => {
    const el = document.getElementById(fid);
    if (!el.value.trim()) {
      el.classList.add('err');
      document.getElementById('e-' + fid).classList.add('show');
      ok = false;
    }
  });

  const em = document.getElementById('f-email').value.trim();
  if (em && !validEmail(em)) {
    document.getElementById('f-email').classList.add('err');
    document.getElementById('e-f-email').textContent = 'Enter a valid email address';
    document.getElementById('e-f-email').classList.add('show');
    ok = false;
  }

  if (!isEdit) {
    const idv = document.getElementById('f-id').value.trim().toUpperCase();
    if (idv && DATA.find(v => v.id === idv)) {
      document.getElementById('f-id').classList.add('err');
      document.getElementById('e-f-id').textContent = 'Vehicle number already exists';
      document.getElementById('e-f-id').classList.add('show');
      ok = false;
    }
  }

  if (!ok) return;

  const rec = {
    reg:       document.getElementById('f-reg').value,
    email:     em,
    fitness:   document.getElementById('f-fitness').value,
    tax:       document.getElementById('f-tax').value,
    insurance: document.getElementById('f-insurance').value,
    pucc:      document.getElementById('f-pucc').value,
    permit:    document.getElementById('f-permit').value,
  };

  if (isEdit) {
    const savedId = editingId;
    const idx = DATA.findIndex(v => v.id === savedId);
    if (idx !== -1) DATA[idx] = { id: savedId, ...rec };
    document.getElementById('form-ov').classList.remove('open');
    editingId = null;
    init();
    toast('✓ ' + savedId + ' updated successfully');
  } else {
    const idv = document.getElementById('f-id').value.trim().toUpperCase();
    DATA.push({ id: idv, ...rec });
    document.getElementById('form-ov').classList.remove('open');
    editingId = null;
    init();
    toast('✓ Vehicle ' + idv + ' added');
  }
}

/* ── SETTINGS ───────────────────────────────────────────────────── */
function openSettings() {
  document.getElementById('s-pk').value   = ejsCfg.pk   || '';
  document.getElementById('s-svc').value  = ejsCfg.svc  || '';
  document.getElementById('s-tpl').value  = ejsCfg.tpl  || '';
  document.getElementById('s-days').value = ejsCfg.days || 5;
  document.getElementById('ssaved').classList.remove('show');
  dzReset();
  document.getElementById('set-ov').classList.add('open');
}

function closeSettings(e) {
  if (!e || e.target === document.getElementById('set-ov'))
    document.getElementById('set-ov').classList.remove('open');
}

function saveSettings() {
  ejsCfg.pk   = document.getElementById('s-pk').value.trim();
  ejsCfg.svc  = document.getElementById('s-svc').value.trim();
  ejsCfg.tpl  = document.getElementById('s-tpl').value.trim();
  ejsCfg.days = Math.max(1, parseInt(document.getElementById('s-days').value) || 5);
  document.getElementById('ssaved').classList.add('show');
  emailSentKeys.clear();
  toast('✓ Settings saved');
  checkReminders();
}

function testEmail() {
  if (!ejsCfg.pk || !ejsCfg.svc || !ejsCfg.tpl) {
    toast('⚠ Save your EmailJS settings first', 3500);
    return;
  }
  if (typeof emailjs === 'undefined') {
    toast('⚠ EmailJS not loaded. Check your internet connection.', 3500);
    return;
  }
  emailjs.init(ejsCfg.pk);
  const v = DATA[0];
  emailjs.send(ejsCfg.svc, ejsCfg.tpl, {
    vehicle_id:  v.id,
    owner_email: v.email,
    reg_date:    fmt(v.reg),
    doc_list:    '- Test reminder from Shri Sai Enterprizes.',
    days_left:   ejsCfg.days,
    doc_count:   1,
    check_date:  fmt(todayStr()),
  })
    .then(() => toast('✓ Test email sent to ' + v.email, 3500))
    .catch(e => toast('✗ Failed: ' + (e.text || 'Check credentials'), 4000));
}

/* ── DANGER ZONE ────────────────────────────────────────────────── */
function dzReset() {
  document.getElementById('dz-box').style.display  = 'none';
  document.getElementById('dz-link').textContent   = '⚙ Advanced Options';
  document.getElementById('dz-sel').value          = '';
  document.getElementById('dz-sel').innerHTML      = '<option value="">-- choose a vehicle --</option>';
  document.getElementById('dz-s2').style.display   = 'none';
  document.getElementById('dz-inp').value          = '';
  document.getElementById('dz-err').style.display  = 'none';
  document.getElementById('dz-warn').style.display = 'none';
  document.getElementById('dz-btn').style.display  = 'none';
  document.getElementById('dz-btn').classList.remove('active');
}

function toggleDZ() {
  const box  = document.getElementById('dz-box');
  const link = document.getElementById('dz-link');
  const open = box.style.display === 'none' || box.style.display === '';

  if (open) {
    box.style.display = 'block';
    link.textContent  = '▲ Hide Advanced Options';

    const sel = document.getElementById('dz-sel');
    sel.innerHTML = '<option value="">-- choose a vehicle --</option>';
    DATA.forEach(v => {
      const o = document.createElement('option');
      o.value = v.id;
      o.textContent = v.id + ' — Reg: ' + fmt(v.reg);
      sel.appendChild(o);
    });

    document.getElementById('dz-s2').style.display   = 'none';
    document.getElementById('dz-inp').value          = '';
    document.getElementById('dz-err').style.display  = 'none';
    document.getElementById('dz-warn').style.display = 'none';
    document.getElementById('dz-btn').style.display  = 'none';
    document.getElementById('dz-btn').classList.remove('active');
  } else {
    dzReset();
  }
}

function dzStep1() {
  const id  = document.getElementById('dz-sel').value;
  const s2  = document.getElementById('dz-s2');
  const btn = document.getElementById('dz-btn');

  document.getElementById('dz-inp').value          = '';
  document.getElementById('dz-err').style.display  = 'none';
  document.getElementById('dz-warn').style.display = 'none';
  btn.classList.remove('active');
  btn.style.display = 'none';

  if (!id) { s2.style.display = 'none'; return; }

  document.getElementById('dz-confirm-lbl').textContent = id;
  document.getElementById('dz-warn-id').textContent     = id;
  s2.style.display = 'block';
  setTimeout(() => document.getElementById('dz-inp').focus(), 80);
}

function dzStep2() {
  const id    = document.getElementById('dz-sel').value;
  const typed = document.getElementById('dz-inp').value;
  const err   = document.getElementById('dz-err');
  const warn  = document.getElementById('dz-warn');
  const btn   = document.getElementById('dz-btn');

  btn.classList.remove('active');
  btn.style.display = 'none';

  if (!typed) { err.style.display = 'none'; warn.style.display = 'none'; return; }

  if (typed === id) {
    err.style.display  = 'none';
    warn.style.display = 'block';
    btn.style.display  = 'block';
    setTimeout(() => {
      if (document.getElementById('dz-inp').value === id) {
        btn.classList.add('active');
      }
    }, 2000);
  } else {
    err.style.display  = 'block';
    warn.style.display = 'none';
  }
}

function dzExecute() {
  const id    = document.getElementById('dz-sel').value;
  const typed = document.getElementById('dz-inp').value;
  if (!id || typed !== id) { toast('✗ Mismatch — cancelled', 3000); return; }
  DATA = DATA.filter(v => v.id !== id);
  dzReset();
  closeSettings();
  init();
  toast('Vehicle ' + id + ' permanently removed');
}

/* ── INIT ───────────────────────────────────────────────────────── */
function init() {
  renderStats();
  renderTable();
  renderPanels();
  checkReminders();
}

// init() is called from showApp() once Netlify Identity confirms the user is logged in.
// The setInterval keeps data fresh every 60 seconds after login.
setInterval(() => {
  if (document.getElementById('main-app').style.display !== 'none') init();
}, 60000);
