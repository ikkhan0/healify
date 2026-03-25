'use strict';
let adminUser = null;
let allPatients = [], allDoctors = [], allAppointments = [];

// ─── Init ─────────────────────────────────────────────────────────────────
window.onload = () => {
  const token = localStorage.getItem('healify_admin_token');
  const user  = localStorage.getItem('healify_admin_user');
  if (token && user) { adminUser = JSON.parse(user); showApp(); }
  startClock();
};

function startClock() {
  const el = document.getElementById('topbar-time');
  const tick = () => { if (el) el.textContent = new Date().toLocaleTimeString('en', {hour:'2-digit',minute:'2-digit'}); };
  tick(); setInterval(tick, 1000);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function togglePwd() {
  const i = document.getElementById('admin-password');
  i.type = i.type === 'password' ? 'text' : 'password';
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ─── Login ─────────────────────────────────────────────────────────────────
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('login-err');
  err.textContent = '';
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = 'Signing in...'; btn.disabled = true;
  try {
    const res = await api.post('/auth/admin/login', {
      email: document.getElementById('admin-email').value,
      password: document.getElementById('admin-password').value
    });
    if (res.success) {
      localStorage.setItem('healify_admin_token', res.token);
      localStorage.setItem('healify_admin_user', JSON.stringify(res.user));
      adminUser = res.user;
      showApp();
    } else { err.textContent = res.message || 'Invalid admin credentials'; }
  } catch { err.textContent = 'Network error. Is the server running?'; }
  btn.textContent = 'Sign In'; btn.disabled = false;
});

function showApp() {
  document.getElementById('page-login').classList.remove('active');
  document.getElementById('page-app').classList.add('active');
  document.getElementById('page-app').style.display = 'flex';
  if (adminUser) document.getElementById('admin-name').textContent = adminUser.name;
  loadDashboard();
}

function logout() {
  localStorage.removeItem('healify_admin_token');
  localStorage.removeItem('healify_admin_user');
  document.getElementById('page-app').classList.remove('active');
  document.getElementById('page-app').style.display = 'none';
  document.getElementById('page-login').classList.add('active');
  showToast('Logged out');
}

// ─── Section Navigation ───────────────────────────────────────────────────
function showSection(name, linkEl) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const sec = document.getElementById(`section-${name}`);
  if (sec) sec.classList.add('active');
  if (linkEl) linkEl.classList.add('active');
  document.getElementById('sidebar').classList.remove('open');
  if (name === 'dashboard') loadDashboard();
  if (name === 'patients') loadPatients();
  if (name === 'doctors') loadDoctors();
  if (name === 'appointments') loadAppointments();
  if (name === 'reports') loadReports();
  if (name === 'settings') loadSettings();
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [statsRes, reportRes] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/reports')
    ]);
    const s = statsRes.stats || {};
    document.getElementById('kpi-patients').textContent = s.totalPatients || 0;
    document.getElementById('kpi-doctors').textContent = s.totalDoctors || 0;
    document.getElementById('kpi-appts').textContent = s.totalAppointments || 0;
    document.getElementById('kpi-earnings').textContent = `RS ${s.totalEarnings || 0}`;
    document.getElementById('rev-total').textContent = `RS ${s.totalEarnings || 0}`;
    document.getElementById('rev-clinic').textContent = `RS ${s.clinicShare || 0}`;
    document.getElementById('rev-doctor').textContent = `RS ${s.doctorShare || 0}`;

    // Top Doctors
    const topDocs = reportRes.topDoctors || [];
    const rankClasses = ['gold','silver','bronze'];
    document.getElementById('top-doctors-list').innerHTML = topDocs.slice(0,5).map((d,i) => {
      const u = d.userId || {};
      return `<div class="top-doc-item">
        <div class="top-doc-rank ${rankClasses[i] || ''}">${i+1}</div>
        <div class="top-doc-info"><h4>${u.name || 'Doctor'}</h4><p>${d.specialty}</p></div>
        <div class="top-doc-earn">RS ${d.totalEarnings || 0}</div>
      </div>`;
    }).join('') || '<div class="loading-sm">No data yet</div>';

    // Monthly chart
    const monthly = reportRes.monthlyRevenue || [];
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const maxRev = Math.max(...monthly.map(m => m.revenue), 1);
    const nowMonth = new Date().getMonth();
    document.getElementById('monthly-chart').innerHTML = monthly.slice(0,12).reverse().map(m => {
      const heightPct = Math.round((m.revenue / maxRev) * 100);
      const isActive = m._id.month - 1 === nowMonth;
      return `<div class="month-bar-wrap">
        <div class="month-bar ${isActive?'active-month':''}" style="height:${Math.max(heightPct,5)}%" title="RS ${m.revenue}"></div>
        <span>${monthNames[m._id.month - 1] || ''}</span>
      </div>`;
    }).join('') || '<div style="color:var(--text-muted);font-size:13px;padding:20px">No revenue data yet</div>';
  } catch(e) { console.error(e); }
}

// ─── Patients ──────────────────────────────────────────────────────────────
async function loadPatients() {
  try {
    const res = await api.get('/admin/patients');
    allPatients = res.patients || [];
    renderPatients(allPatients);
  } catch { document.getElementById('patients-tbody').innerHTML = '<tr><td colspan="9" class="loading-row">Error loading data</td></tr>'; }
}

function renderPatients(patients) {
  const tbody = document.getElementById('patients-tbody');
  if (!patients.length) { tbody.innerHTML = '<tr><td colspan="9" class="loading-row">No patients found</td></tr>'; return; }
  tbody.innerHTML = patients.map((p, i) => {
    const pp = p.patientProfile || {};
    const initials = p.name.split(' ').map(n=>n[0]).join('').toUpperCase();
    const joined = new Date(p.createdAt).toLocaleDateString('en', {month:'short',day:'numeric',year:'numeric'});
    return `<tr>
      <td>${i+1}</td>
      <td><div class="user-cell"><div class="user-thumb">${initials}</div><div><h5>${p.name}</h5></div></div></td>
      <td>${p.email}</td>
      <td>${p.phone || '—'}</td>
      <td>${pp.age || '—'}</td>
      <td>${pp.bloodGroup || '—'}</td>
      <td>${joined}</td>
      <td><span class="badge ${p.isActive?'badge-active':'badge-inactive'}">${p.isActive?'Active':'Inactive'}</span></td>
      <td>
        <button class="action-btn" style="background:#1C448E; color:#fff" onclick="openEditPat('${p._id}', '${p.name}', '${p.email}', '${p.phone || ''}', '${pp.age || ''}')">Edit</button>
        <button class="action-btn btn-toggle" onclick="toggleUser('${p._id}',this)">${p.isActive?'Disable':'Enable'}</button>
        <button class="action-btn btn-delete" onclick="deleteUser('${p._id}','patient')">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

// ─── Doctors ───────────────────────────────────────────────────────────────
async function loadDoctors() {
  try {
    const res = await api.get('/admin/doctors');
    allDoctors = res.doctors || [];
    renderDoctors(allDoctors);
  } catch { document.getElementById('doctors-tbody').innerHTML = '<tr><td colspan="9" class="loading-row">Error loading data</td></tr>'; }
}

function renderDoctors(doctors) {
  const tbody = document.getElementById('doctors-tbody');
  if (!doctors.length) { tbody.innerHTML = '<tr><td colspan="9" class="loading-row">No doctors found</td></tr>'; return; }
  tbody.innerHTML = doctors.map((d, i) => {
    const dp = d.doctorProfile || {};
    const initials = d.name.split(' ').map(n=>n[0]).join('').toUpperCase();
    return `<tr>
      <td>${i+1}</td>
      <td><div class="user-cell"><div class="user-thumb">${initials}</div><div><h5>Dr. ${d.name}</h5></div></div></td>
      <td>${dp.specialty || '—'}</td>
      <td>${d.email}</td>
      <td>${dp.country || '—'}</td>
      <td>RS ${dp.consultationFee || 0}</td>
      <td>⭐ ${dp.rating || '4.0'}</td>
      <td>RS ${dp.totalEarnings || 0}</td>
      <td>
        <button class="action-btn" style="background:#5DADE2; color:#fff" onclick="openViewDoctor('${d._id}')">View</button>
        <button class="action-btn" style="background:#1C448E; color:#fff" onclick="openEditDoc('${d._id}', '${d.name}', '${d.email}', '${dp.specialty || ''}', '${dp.consultationFee || 0}', '${dp.experience || ''}', '${dp.education || ''}', '${dp.bio || ''}', '${d.profileImage || ''}')">Edit</button>
        <button class="action-btn btn-toggle" onclick="toggleUser('${d._id}',this)">${d.isActive?'Disable':'Enable'}</button>
        <button class="action-btn btn-delete" onclick="deleteUser('${d._id}','doctor')">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

// ─── Appointments ──────────────────────────────────────────────────────────
async function loadAppointments() {
  try {
    const res = await api.get('/admin/appointments');
    allAppointments = res.appointments || [];
    renderAppointments(allAppointments);
  } catch { document.getElementById('appts-tbody').innerHTML = '<tr><td colspan="8" class="loading-row">Error loading data</td></tr>'; }
}

function filterAppointments() {
  const status = document.getElementById('appt-status-filter').value;
  const filtered = status ? allAppointments.filter(a => a.status === status) : allAppointments;
  renderAppointments(filtered);
}

function renderAppointments(appts) {
  const tbody = document.getElementById('appts-tbody');
  if (!appts.length) { tbody.innerHTML = '<tr><td colspan="8" class="loading-row">No appointments found</td></tr>'; return; }
  tbody.innerHTML = appts.map((a, i) => {
    const p = a.patientId || {};
    const d = a.doctorId || {};
    const date = new Date(a.date).toLocaleDateString('en', {month:'short',day:'numeric',year:'numeric'});
    return `<tr>
      <td>${i+1}</td>
      <td>${p.name || '—'}</td>
      <td>${d.name ? 'Dr. '+d.name : '—'}</td>
      <td>${date}</td>
      <td>${a.timeSlot}</td>
      <td><i class="fas fa-${a.type==='video'?'video':'hospital'}" style="color:var(--primary)"></i> ${a.type}</td>
      <td>RS ${a.fee || 0}</td>
      <td><span class="badge badge-${a.status}">${a.status}</span></td>
      <td>
        <button class="action-btn" style="background:#1C448E; color:#fff" onclick="openEditAppt('${a._id}', '${a.status}')">Update</button>
      </td>
    </tr>`;
  }).join('');
}

// ─── Reports ────────────────────────────────────────────────────────────────
async function loadReports() {
  try {
    const [statsRes, reportRes] = await Promise.all([api.get('/admin/stats'), api.get('/admin/reports')]);
    const s = statsRes.stats || {};
    document.getElementById('rpt-total-rev').textContent = `RS ${s.totalEarnings || 0}`;
    document.getElementById('rpt-clinic-share').textContent = `RS ${s.clinicShare || 0}`;
    document.getElementById('rpt-doc-share').textContent = `RS ${s.doctorShare || 0}`;
    document.getElementById('rpt-completed').textContent = s.completedAppts || 0;

    const topDocs = reportRes.topDoctors || [];
    document.getElementById('rpt-top-doctors').innerHTML = topDocs.slice(0,10).map((d,i) => {
      const u = d.userId || {};
      return `<tr><td>${i+1}</td><td>Dr. ${u.name||'—'}</td><td>${d.specialty||'—'}</td>
        <td>RS ${d.totalEarnings||0}</td><td>${(d.patients||[]).length}</td></tr>`;
    }).join('') || '<tr><td colspan="5" class="loading-row">No data yet</td></tr>';
  } catch(e) { console.error(e); }
}

// ─── Table Search ──────────────────────────────────────────────────────────
function filterTable(type, q) {
  q = q.toLowerCase();
  if (type === 'patient') {
    renderPatients(allPatients.filter(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)));
  } else if (type === 'doctor') {
    renderDoctors(allDoctors.filter(d => d.name.toLowerCase().includes(q) || (d.doctorProfile?.specialty||'').toLowerCase().includes(q)));
  }
}

// ─── User Actions ──────────────────────────────────────────────────────────
async function toggleUser(id, btn) {
  try {
    const res = await api.put(`/admin/user/${id}/toggle`, {});
    if (res.success) {
      showToast(`User ${res.isActive ? 'activated' : 'deactivated'}`);
      btn.textContent = res.isActive ? 'Disable' : 'Enable';
      loadPatients(); loadDoctors();
    }
  } catch { showToast('Error updating user'); }
}

async function deleteUser(id, type) {
  if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) return;
  try {
    const res = await api.del(`/admin/user/${id}`);
    if (res.success) { showToast(`${type} deleted`); type === 'patient' ? loadPatients() : loadDoctors(); }
    else showToast(res.message || 'Delete failed');
  } catch { showToast('Error'); }
}

// ─── Export ────────────────────────────────────────────────────────────────
function exportReport() {
  const rows = [['Doctor','Specialty','Country','Earnings','Clinic Share']];
  allDoctors.forEach(d => {
    const dp = d.doctorProfile || {};
    rows.push([d.name, dp.specialty||'', dp.country||'', dp.totalEarnings||0, Math.round((dp.totalEarnings||0)*0.2)]);
  });
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `healify-report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  showToast('Report exported ✅');
}

// ─── Modal Actions ─────────────────────────────────────────────────────────
function openEditDoc(id, name, email, spec, fee, exp, edu, bio, img) {
  document.getElementById('edit-doc-id').value = id;
  document.getElementById('edit-doc-name').value = name;
  document.getElementById('edit-doc-email').value = email;
  document.getElementById('edit-doc-spec').value = spec || '';
  document.getElementById('edit-doc-fee').value = fee || '';
  document.getElementById('edit-doc-exp').value = exp || '';
  document.getElementById('edit-doc-edu').value = edu || '';
  document.getElementById('edit-doc-bio').value = bio || '';
  document.getElementById('edit-doc-img').value = img || '';
  document.getElementById('edit-doctor-modal').style.display = 'flex';
}
async function submitEditDoctor(e) {
  e.preventDefault();
  const id = document.getElementById('edit-doc-id').value;
  const updates = { 
    name: document.getElementById('edit-doc-name').value, 
    email: document.getElementById('edit-doc-email').value, 
    profileImage: document.getElementById('edit-doc-img').value,
    profileData: { 
      specialty: document.getElementById('edit-doc-spec').value, 
      consultationFee: document.getElementById('edit-doc-fee').value,
      experience: document.getElementById('edit-doc-exp').value,
      education: document.getElementById('edit-doc-edu').value,
      bio: document.getElementById('edit-doc-bio').value
    } 
  };
  try { await api.put(`/admin/doctor/${id}`, updates); document.getElementById('edit-doctor-modal').style.display = 'none'; showToast('Doctor updated'); loadDoctors(); } catch(e) { showToast(e.message, true); }
}

async function openViewDoctor(doctorId) {
  const modal = document.getElementById('doctor-detail-modal');
  const container = document.getElementById('doctor-modal-content');
  modal.style.display = 'flex';
  container.innerHTML = '<div class="loading-pulse" style="padding:60px; text-align:center;">Loading...</div>';
  
  try {
    const res = await api.get(`/patients/doctors/${doctorId}`);
    const d = res.doctor;
    const dp = d.doctorProfile || {};
    const initials = d.name.split(' ').map(n=>n[0]).join('').toUpperCase();
    
    const rating = dp.rating || 4.5;
    let stars = '';
    for(let i=1; i<=5; i++) {
       stars += `<i class="fa${i<=rating?'s':'-regular'} fa-star" style="color:#FFD700;"></i>`;
    }
    
    container.innerHTML = `
      <div style="text-align:center; margin-bottom:1.5rem;">
        <div style="width:200px; height:200px; border-radius:50%; overflow:hidden; margin:0 auto 1rem auto; background:#EAF4FC; display:flex; align-items:center; justify-content:center; font-size:4rem; color:#0A2753; border:4px solid #fff; box-shadow:0 10px 30px rgba(0,0,0,0.1);">
          ${d.profileImage ? `<img src="${d.profileImage}" style="width:100%;height:100%;object-fit:cover">` : initials}
        </div>
        <h3 style="color:#0A2753; font-size:1.8rem; font-weight:800; margin-bottom:0.3rem;">Dr. ${d.name}</h3>
        <div style="margin-bottom:0.8rem; font-size:1.2rem;">${stars}</div>
        <div style="display:flex; justify-content:center; gap:20px; color:#1C448E; font-weight:600; font-size:1.1rem; margin-bottom:1.5rem;">
           <div><i class="fas fa-stethoscope"></i> ${dp.specialty || 'Psychiatrist'}</div>
           <div><i class="fas fa-money-bill-wave"></i> Fee: RS ${dp.consultationFee || 300}</div>
        </div>
      </div>
      
      <div style="border-top:1px solid #EAF4FC; padding-top:1.5rem; text-align:left;">
        <h4 style="color:#0A2753; font-size:1.3rem; margin-bottom:0.8rem; font-weight:700;">Experience</h4>
        <p style="color:#1C448E; line-height:1.6; margin-bottom:1.5rem;">${dp.experience ? dp.experience + ' Years Experience' : 'Extensive experience in mental health care.'}</p>
        
        <h4 style="color:#0A2753; font-size:1.3rem; margin-bottom:0.8rem; font-weight:700;">Education</h4>
        <p style="color:#1C448E; line-height:1.6; margin-bottom:1.5rem;">${dp.education || 'Certified Professional'}</p>
        
        <h4 style="color:#0A2753; font-size:1.3rem; margin-bottom:0.8rem; font-weight:700;">About</h4>
        <p style="color:#1C448E; line-height:1.6; margin-bottom:2rem;">${dp.bio || 'A compassionate professional who makes complex issues feel manageable.'}</p>
        
        <h4 style="color:#0A2753; font-size:1.3rem; margin-bottom:0.8rem; font-weight:700;">Patient Reviews</h4>
        <div style="display:flex; gap:10px; overflow-x:auto; margin-bottom:1rem; padding-bottom:10px;">
          ${dp.reviews && dp.reviews.length ? dp.reviews.map(r => `
          <div style="background:#5DADE2; min-width:280px; border-radius:12px; padding:1.2rem; color:#fff; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
             <div style="margin-bottom:0.5rem; font-size:1rem; color:#FFD700;"><i class="fas fa-star"></i> ${r.rating}</div>
             <p style="font-size:0.95rem; line-height:1.4;">"${r.comment}"</p>
             <div style="font-size:0.8rem; margin-top:10px; opacity:0.9; font-weight:600;">- ${r.patientName}</div>
          </div>`).join('') : '<div style="color:#1C448E; font-weight:600; padding:1rem;">No reviews yet.</div>'}
        </div>
      </div>`;
  } catch(e) { container.innerHTML = '<div style="text-align:center; color:red;">Failed to load profile preview</div>'; }
}

function openEditPat(id, name, email, phone, age) {
  document.getElementById('edit-pat-id').value = id;
  document.getElementById('edit-pat-name').value = name;
  document.getElementById('edit-pat-email').value = email;
  document.getElementById('edit-pat-phone').value = phone || '';
  document.getElementById('edit-pat-age').value = age || '';
  document.getElementById('edit-patient-modal').style.display = 'flex';
}
async function submitEditPatient(e) {
  e.preventDefault();
  const id = document.getElementById('edit-pat-id').value;
  const updates = { name: document.getElementById('edit-pat-name').value, email: document.getElementById('edit-pat-email').value, phone: document.getElementById('edit-pat-phone').value, profileData: { age: document.getElementById('edit-pat-age').value } };
  try { await api.put(`/admin/patient/${id}`, updates); document.getElementById('edit-patient-modal').style.display = 'none'; showToast('Patient updated'); loadPatients(); } catch(e) { showToast(e.message, true); }
}

function openEditAppt(id, status) {
  document.getElementById('edit-appt-id').value = id;
  document.getElementById('edit-appt-status').value = status;
  document.getElementById('edit-appt-modal').style.display = 'flex';
}
async function submitEditAppt(e) {
  e.preventDefault();
  const id = document.getElementById('edit-appt-id').value;
  const status = document.getElementById('edit-appt-status').value;
  try { await api.put(`/admin/appointment/${id}`, {status}); document.getElementById('edit-appt-modal').style.display = 'none'; showToast('Appointment status updated'); loadAppointments(); } catch(e) { showToast(e.message, true); }
}

// ─── Settings ───────────────────────────────────────────────────────────────
function showSettingsTab(tab, btn) {
  document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  btn.classList.add('active');
  if (tab === 'admins') loadAdmins();
}

async function loadSettings() {
  try {
    const res = await api.get('/settings');
    if (res.success && res.settings) {
      const s = res.settings;
      document.getElementById('set-logo').value = s.logoUrl || '';
      document.getElementById('set-phone').value = s.phone || '';
      document.getElementById('set-email').value = s.email || '';
      document.getElementById('set-address').value = s.address || '';
    }
  } catch (e) { console.error('Failed to load settings', e); }
}

async function saveGeneralSettings(e) {
  e.preventDefault();
  const updates = {
    logoUrl: document.getElementById('set-logo').value,
    phone: document.getElementById('set-phone').value,
    email: document.getElementById('set-email').value,
    address: document.getElementById('set-address').value
  };
  try {
    const res = await api.put('/settings', updates);
    if (res.success) { showToast('Settings updated successfully ✅'); }
  } catch (e) { showToast('Failed to update settings'); }
}

async function changeAdminPassword(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('cur-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confPassword = document.getElementById('conf-password').value;

  if (newPassword !== confPassword) return showToast('New passwords do not match');

  try {
    const res = await api.put('/admin/change-password', { currentPassword, newPassword });
    if (res.success) {
      showToast('Password updated successfully ✅');
      e.target.reset();
    } else {
      showToast(res.message || 'Error updating password');
    }
  } catch (e) { showToast('Error updating password'); }
}

async function loadAdmins() {
  const tbody = document.getElementById('admins-tbody');
  try {
    const res = await api.get('/admin/admins');
    const admins = res.admins || [];
    if (!admins.length) { tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No admins found</td></tr>'; return; }
    tbody.innerHTML = admins.map((a, i) => `
      <tr>
        <td>${i+1}</td>
        <td>${a.name}</td>
        <td>${a.email}</td>
        <td><span class="badge" style="background:#0A2753; color:#fff">${a.role}</span></td>
        <td><span class="badge ${a.isActive?'badge-active':'badge-inactive'}">${a.isActive?'Active':'Inactive'}</span></td>
      </tr>
    `).join('');
  } catch { tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Error loading admins</td></tr>'; }
}

function openAddAdminModal() {
  document.getElementById('add-admin-modal').style.display = 'flex';
}

async function submitAddAdmin(e) {
  e.preventDefault();
  const name = document.getElementById('add-adm-name').value;
  const email = document.getElementById('add-adm-email').value;
  const password = document.getElementById('add-adm-pass').value;

  try {
    const res = await api.post('/admin/admins', { name, email, password });
    if (res.success) {
      showToast('Admin created successfully ✅');
      document.getElementById('add-admin-modal').style.display = 'none';
      e.target.reset();
      loadAdmins();
    } else {
      showToast(res.message || 'Error creating admin');
    }
  } catch (e) { showToast('Error creating admin'); }
}
