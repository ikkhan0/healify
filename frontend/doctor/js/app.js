'use strict';
let currentDoctor = null;
let allAppointments = [];
let allPatients = [];
let localStream = null;
let peerConnection = null;
let callSeconds = 0;
let callTimerInterval = null;
const socket = io();
const iceServers = {iceServers:[{urls:'stun:stun.l.google.com:19302'}]};

function navigate(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(screenId);
  if (el) { el.classList.add('active'); el.scrollTop = 0; }
  if (screenId === 'screen-dashboard') loadDashboard();
  if (screenId === 'screen-appointments') loadAppointments();
  if (screenId === 'screen-patients') loadPatients();
  if (screenId === 'screen-profile') loadProfile();
}

function showToast(msg, dur=2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  const isPass = inp.type === 'password';
  inp.type = isPass ? 'text' : 'password';
  btn.innerHTML = isPass ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
}

// ─── Splash & Init ───────────────────────────────────────────────────────────
window.onload = () => {
  setTimeout(() => {
    const token = localStorage.getItem('healify_doctor_token');
    const user = localStorage.getItem('healify_doctor_user');
    if (token && user) {
      currentDoctor = JSON.parse(user);
      updateDashboardHeader();
      navigate('screen-dashboard');
    } else {
      navigate('screen-login');
    }
  }, 2700);
};

function updateDashboardHeader() {
  if (!currentDoctor) return;
  const el = document.getElementById('doc-name');
  if (el) el.textContent = `Dr. ${currentDoctor.name}`;
  const av = document.getElementById('doc-avatar');
  if (av && currentDoctor.profileImage) av.src = currentDoctor.profileImage;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('login-err');
  err.textContent = '';
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = 'Signing in...'; btn.disabled = true;
  try {
    const res = await api.post('/auth/login', { email, password });
    if (res.success) {
      if (res.user.role !== 'doctor') { err.textContent = 'Please use the Doctor Sign In.'; btn.textContent='Sign In'; btn.disabled=false; return; }
      localStorage.setItem('healify_doctor_token', res.token);
      localStorage.setItem('healify_doctor_user', JSON.stringify(res.user));
      currentDoctor = res.user;
      updateDashboardHeader();
      navigate('screen-dashboard');
      showToast(`Welcome back, Dr. ${res.user.name.split(' ')[0]}!`);
    } else { err.textContent = res.message || 'Invalid credentials'; }
  } catch (ex) { 
    console.error('Doctor Login Error:', ex);
    err.textContent = 'Connection error. Is the server running?'; 
  }
  btn.textContent = 'Sign In'; btn.disabled = false;
});

document.getElementById('form-signup').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('signup-err');
  err.textContent = '';
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = 'Creating...'; btn.disabled = true;
  try {
    const data = {
      name: document.getElementById('su-name').value,
      email: document.getElementById('su-email').value,
      password: document.getElementById('su-password').value,
      role: 'doctor'
    };
    
    // Optional fields
    const phoneEl = document.getElementById('su-phone');
    const specialtyEl = document.getElementById('su-specialty');
    const countryEl = document.getElementById('su-country');
    
    if (phoneEl) data.phone = phoneEl.value;
    if (specialtyEl) data.specialty = specialtyEl.value || 'General';
    if (countryEl) data.country = countryEl.value;

    const res = await api.post('/auth/register', data);
    if (res.success) {
      // Send OTP (don't await so UI can move to OTP screen)
      api.post('/auth/send-otp', { email: document.getElementById('su-email').value }).catch(e => console.error('Auto OTP send failed', e));
      
      const email = document.getElementById('su-email').value;
      const displayEl = document.getElementById('otp-email-display');
      if (displayEl) displayEl.textContent = email;
      
      localStorage.setItem('healify_pending_email', email);
      navigate('screen-otp');
      showToast('OTP sent to your email 📧');
    } else { err.textContent = res.message || 'Registration failed'; }
  } catch (ex) { 
    console.error('Doctor Signup Error:', ex);
    err.textContent = 'Connection error. Check backend server.'; 
  }
  btn.textContent = 'Sign Up'; btn.disabled = false;
});

// OTP
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.otp-box').forEach((box, i, boxes) => {
    box.addEventListener('input', () => { if (box.value && i < boxes.length-1) boxes[i+1].focus(); });
    box.addEventListener('keydown', (e) => { if (e.key==='Backspace' && !box.value && i>0) boxes[i-1].focus(); });
  });
});

async function verifyOTP() {
  const otp = [...document.querySelectorAll('.otp-box')].map(b=>b.value).join('');
  const email = localStorage.getItem('healify_pending_email');
  const err = document.getElementById('otp-err');
  if (otp.length < 6) { err.textContent='Enter all 6 digits'; return; }
  try {
    const res = await api.post('/auth/verify-otp', { email, otp });
    if (res.success) {
      if (res.token) { localStorage.setItem('healify_doctor_token', res.token); localStorage.setItem('healify_doctor_user', JSON.stringify(res.user)); currentDoctor=res.user; }
      document.getElementById('otp-success-modal').style.display = 'flex';
    } else { err.textContent = res.message || 'Invalid OTP'; }
  } catch { err.textContent = 'Network error'; }
}

async function resendOTP() {
  const email = localStorage.getItem('healify_pending_email');
  if (!email) return;
  const res = await api.post('/auth/send-otp', { email });
  showToast(res.success ? 'OTP resent!' : res.message);
}

async function bypassOTP() {
  const email = localStorage.getItem('healify_pending_email');
  if (!email) { showToast('Email not found. Please sign up again.'); return; }
  
  showToast('Bypassing verification...');
  try {
    const res = await api.post('/auth/verify-otp', { email, otp: '123456' });
    if (res.success) {
      if (res.token) {
        localStorage.setItem('healify_doctor_token', res.token);
        localStorage.setItem('healify_doctor_user', JSON.stringify(res.user));
        currentDoctor = res.user;
      }
      document.getElementById('otp-success-modal').style.display = 'flex';
    } else {
      showToast(res.message || 'Bypass failed (is server running?)');
    }
  } catch(e) { showToast('Network error during bypass'); }
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
async function loadDashboard() {
  updateDashboardHeader();
  try {
    const [apptRes, earnRes, patRes] = await Promise.all([
      api.get('/doctors/appointments'),
      api.get('/doctors/earnings'),
      api.get('/doctors/patients')
    ]);
    const appts = apptRes.appointments || [];
    const earn = earnRes.earnings || {};
    const patients = patRes.patients || [];

    document.getElementById('doc-total-patients').textContent = patients.length;
    document.getElementById('doc-total-appts').textContent = appts.length;
    document.getElementById('doc-pending').textContent = appts.filter(a=>a.status==='pending').length;
    document.getElementById('doc-earnings').textContent = `RS ${earn.totalEarnings || 0}`;
    document.getElementById('today-earn-label').textContent = `RS ${earn.totalEarnings || 0}`;

    const todayAppts = appts.filter(a => {
      const d = new Date(a.date);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    });
    const container = document.getElementById('dash-appointments');
    if (!todayAppts.length) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:14px">No appointments today 🎉</div>';
      return;
    }
    container.innerHTML = todayAppts.map(a => renderApptCard(a)).join('');
  } catch(e) { console.error(e); }
}

// ─── Appointments ─────────────────────────────────────────────────────────────
async function loadAppointments() {
  const container = document.getElementById('appt-list');
  container.innerHTML = '<div class="loading-pulse">Loading...</div>';
  try {
    const res = await api.get('/doctors/appointments');
    allAppointments = res.appointments || [];
    renderAppointments(allAppointments);
  } catch { container.innerHTML = '<div class="empty-state"><i class="fas fa-wifi-slash"></i><h3>Server offline</h3></div>'; }
}

function filterAppts(status, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = status === 'all' ? allAppointments : allAppointments.filter(a => a.status === status);
  renderAppointments(filtered);
}

function renderAppointments(appts) {
  const container = document.getElementById('appt-list');
  if (!appts.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><h3>No appointments</h3></div>';
    return;
  }
  container.innerHTML = appts.map(a => renderApptCard(a, true)).join('');
}

function renderApptCard(a, withActions = false) {
  const p = a.patientId || {};
  const initials = (p.name || 'P').split(' ').map(n=>n[0]).join('');
  const date = new Date(a.date).toLocaleDateString('en', {weekday:'short',month:'short',day:'numeric'});
  let actions = '';
  if (withActions) {
    if (a.status === 'pending') {
      actions = `<div class="appt-actions">
        <button class="btn-primary" onclick="updateAppt('${a._id}','confirmed')"><i class="fas fa-check"></i> Confirm</button>
        <button class="btn-danger" onclick="updateAppt('${a._id}','cancelled')"><i class="fas fa-times"></i> Cancel</button>
      </div>`;
    } else if (a.status === 'confirmed') {
      actions = `<div class="appt-actions">
        <button class="btn-primary" onclick="joinVideoCall('${a.roomId || ''}','${p.name||'Patient'}')"><i class="fas fa-video"></i> Join Call</button>
        <button class="btn-outline" onclick="updateAppt('${a._id}','completed')">Complete</button>
      </div>`;
    }
  }
  return `<div class="appt-card">
    <div class="appt-card-top">
      <div class="appt-patient-img">${initials}</div>
      <div class="appt-info"><h4>${p.name || 'Patient'}</h4><p>${p.email || ''}</p></div>
      <span class="appt-status status-${a.status}">${a.status}</span>
    </div>
    <div class="appt-detail-row">
      <span><i class="fas fa-calendar"></i>${date}</span>
      <span><i class="fas fa-clock"></i>${a.timeSlot}</span>
      <span><i class="fas fa-${a.type==='video'?'video':'hospital'}"></i>${a.type}</span>
      <span><i class="fas fa-tag"></i>RS ${a.fee || 0}</span>
    </div>
    ${actions}
  </div>`;
}

async function updateAppt(id, status) {
  try {
    const res = await api.put(`/doctors/appointments/${id}`, { status });
    if (res.success) { showToast(`Appointment ${status}`); loadAppointments(); loadDashboard(); }
    else showToast(res.message || 'Failed');
  } catch { showToast('Error'); }
}

// ─── Patients ─────────────────────────────────────────────────────────────────
async function loadPatients() {
  const container = document.getElementById('patients-list');
  container.innerHTML = '<div class="loading-pulse">Loading...</div>';
  try {
    const res = await api.get('/doctors/patients');
    allPatients = res.patients || [];
    renderPatients(allPatients);
  } catch { container.innerHTML = '<div class="empty-state"><i class="fas fa-wifi-slash"></i><h3>Server offline</h3></div>'; }
}

function searchPatients(q) {
  const filtered = allPatients.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  renderPatients(filtered);
}

function renderPatients(patients) {
  const container = document.getElementById('patients-list');
  if (!patients.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><h3>No patients yet</h3><p>Patients who book with you will appear here</p></div>';
    return;
  }
  container.innerHTML = `<div style="padding:0 0 8px;display:flex;flex-direction:column;gap:12px">${patients.map(p => {
    const initials = p.name.split(' ').map(n=>n[0]).join('');
    return `<div class="patient-card">
      <div class="patient-avatar">${p.profileImage ? `<img src="${p.profileImage}" style="width:50px;height:50px;border-radius:14px;object-fit:cover">` : initials}</div>
      <div class="patient-info"><h4>${p.name}</h4><p>${p.email}</p></div>
    </div>`;
  }).join('')}</div>`;
}

// ─── Video Call ───────────────────────────────────────────────────────────────
async function joinVideoCall(roomId, patientName) {
  navigate('screen-video-call');
  document.getElementById('call-patient-name').textContent = patientName;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('local-video').srcObject = localStream;
    socket.emit('join-room', { roomId, userId: currentDoctor?._id, userName: `Dr. ${currentDoctor?.name || 'Doctor'}` });
    callTimerInterval = setInterval(() => {
      callSeconds++;
      const m = String(Math.floor(callSeconds/60)).padStart(2,'0');
      const s = String(callSeconds%60).padStart(2,'0');
      document.getElementById('call-timer').textContent = `${m}:${s}`;
    }, 1000);
  } catch { showToast('Camera/mic access denied'); }

  socket.on('user-joined', async ({ socketId }) => {
    peerConnection = new RTCPeerConnection(iceServers);
    localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));
    peerConnection.ontrack = e => { document.getElementById('remote-video').srcObject = e.streams[0]; };
    peerConnection.onicecandidate = e => { if(e.candidate) socket.emit('ice-candidate', {to:socketId, candidate:e.candidate}); };
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', {to:socketId, offer});
  });
  socket.on('offer', async ({from,offer}) => {
    peerConnection = new RTCPeerConnection(iceServers);
    localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));
    peerConnection.ontrack = e => { document.getElementById('remote-video').srcObject = e.streams[0]; };
    peerConnection.onicecandidate = e => { if(e.candidate) socket.emit('ice-candidate', {to:from, candidate:e.candidate}); };
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', {to:from, answer});
  });
  socket.on('answer', async ({answer}) => { await peerConnection?.setRemoteDescription(new RTCSessionDescription(answer)); });
  socket.on('ice-candidate', async ({candidate}) => { await peerConnection?.addIceCandidate(new RTCIceCandidate(candidate)); });
}

window.toggleMic = () => {
  const t = localStream?.getAudioTracks()[0];
  if (t) { t.enabled = !t.enabled; document.getElementById('mic-btn').classList.toggle('muted', !t.enabled); }
};
window.toggleCam = () => {
  const t = localStream?.getVideoTracks()[0];
  if (t) { t.enabled = !t.enabled; document.getElementById('cam-btn').classList.toggle('muted', !t.enabled); }
};
function endCall() {
  localStream?.getTracks().forEach(t => t.stop());
  peerConnection?.close();
  clearInterval(callTimerInterval);
  callSeconds = 0;
  navigate('screen-appointments');
}

// ─── Profile ──────────────────────────────────────────────────────────────────
async function loadProfile() {
  try {
    const res = await api.get('/doctors/profile');
    const u = res.user;
    const d = res.profile || {};
    
    // Header
    const nameEl = document.getElementById('profile-name');
    if (nameEl) nameEl.textContent = `Dr. ${u.name}`;
    
    const specialtyTxt = document.getElementById('profile-specialty');
    if (specialtyTxt) specialtyTxt.textContent = d.designation || d.specialty || 'Specialist';
    
    const ratingEl = document.getElementById('profile-rating');
    if (ratingEl) ratingEl.textContent = `${d.rating || '4.0'} Rating`;
    
    const feeTxt = document.getElementById('profile-fee');
    if (feeTxt) feeTxt.textContent = `RS ${d.consultationFee || 0} per session`;
    
    const countryTxt = document.getElementById('profile-country');
    if (countryTxt) countryTxt.textContent = `${d.city ? d.city + ', ' : ''}${d.country || '---'}`;
    
    // Form Fields
    const fields = {
      'edit-name': u.name,
      'edit-phone': u.phone || '',
      'edit-designation': d.designation || '',
      'edit-specialty': d.specialty || '',
      'edit-education': d.education || '',
      'edit-exp-years': d.experienceYears || 0,
      'edit-gender': d.gender || 'Male',
      'edit-city': d.city || '',
      'edit-country': d.country || '',
      'edit-languages': d.languages || '',
      'edit-fee': d.consultationFee || 0,
      'edit-bio': d.bio || ''
    };
    
    for (const [id, val] of Object.entries(fields)) {
      const el = document.getElementById(id);
      if (el) el.value = val;
    }

    if (u.profileImage) {
      const imgEl = document.getElementById('profile-img');
      if (imgEl) imgEl.src = u.profileImage.startsWith('data:') ? u.profileImage : u.profileImage;
    }
  } catch (err) { console.error('Load Profile Error:', err); }
}

let profileImageBase64 = null;
// Handle Image Upload Input
document.getElementById('avatar-upload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(event) {
    profileImageBase64 = event.target.result;
    document.getElementById('profile-img').src = profileImageBase64;
    showToast('Image selected 🖼️');
  };
  reader.readAsDataURL(file);
});

async function saveProfile() {
  try {
    const data = {
      name: document.getElementById('edit-name').value,
      phone: document.getElementById('edit-phone').value,
      designation: document.getElementById('edit-designation').value,
      specialty: document.getElementById('edit-specialty').value,
      education: document.getElementById('edit-education').value,
      experienceYears: Number(document.getElementById('edit-exp-years').value),
      gender: document.getElementById('edit-gender').value,
      city: document.getElementById('edit-city').value,
      country: document.getElementById('edit-country').value,
      languages: document.getElementById('edit-languages').value,
      consultationFee: Number(document.getElementById('edit-fee').value),
      bio: document.getElementById('edit-bio').value
    };
    
    if (profileImageBase64) {
      data.profileImage = profileImageBase64;
    }

    const res = await api.put('/doctors/profile', data);
    if (res.success) {
      showToast('Profile updated ✅');
      loadProfile(); // Refresh UI
    } else {
      showToast(res.message || 'Update failed');
    }
  } catch (err) { 
    console.error('Save Profile Error:', err);
    showToast('Error saving profile'); 
  }
}

function logout() {
  localStorage.removeItem('healify_doctor_token');
  localStorage.removeItem('healify_doctor_user');
  currentDoctor = null;
  navigate('screen-login');
  showToast('Logged out');
}
