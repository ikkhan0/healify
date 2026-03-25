'use strict';
let currentDoctor = null;
let allAppointments = [];
let allPatients = [];
let localStream = null;
let peerConnection = null;
let callSeconds = 0;
let callTimerInterval = null;
const socket = io();
// Note: To work perfectly across all networks, you SHOULD replace these with real TURN server credentials 
// from a provider like Metered.ca, Twilio, or Xirsys.
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Example TURN configuration:
    // { urls: 'turn:YOUR_TURN_SERVER_URL', username: 'YOUR_USERNAME', credential: 'YOUR_PASSWORD' }
  ]
};

window.navigate = (screenId) => {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(screenId);
  if (el) { el.classList.add('active'); el.scrollTop = 0; }
  
  // Navigation visibility
  const nav = document.getElementById('main-nav');
  const authScreens = ['screen-splash', 'screen-login', 'screen-signup', 'screen-reset-password', 'screen-otp'];
  if (nav) {
    if (authScreens.includes(screenId)) {
      nav.style.display = 'none';
    } else {
      nav.style.display = 'flex';
    }
  }

  // Highlight active nav item
  document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
  if (screenId === 'screen-dashboard') {
    document.getElementById('nav-home')?.classList.add('active');
    loadDashboard();
  }
  if (screenId === 'screen-appointments') {
    document.getElementById('nav-appointments')?.classList.add('active');
    loadAppointments();
  }
  if (screenId === 'screen-patients') {
    document.getElementById('nav-reports')?.classList.add('active');
    loadPatients();
  }
  if (screenId === 'screen-profile') {
    document.getElementById('nav-profile')?.classList.add('active');
    loadProfile();
  }
  if (screenId === 'screen-all-reports') {
    document.getElementById('nav-reports')?.classList.add('active');
    loadAllReports();
  }
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
        <button class="btn-primary" onclick="window.updateAppt('${a._id}','confirmed')"><i class="fas fa-check"></i> Confirm</button>
        <button class="btn-danger" onclick="window.updateAppt('${a._id}','cancelled')"><i class="fas fa-times"></i> Cancel</button>
      </div>`;
    } else if (a.status === 'confirmed') {
      actions = `<div class="appt-actions">
        <button class="btn-primary" onclick="window.joinVideoCall('${a.roomId || ''}','${p.name||'Patient'}')"><i class="fas fa-video"></i> Join Call</button>
        <button class="btn-outline" onclick="window.updateAppt('${a._id}','completed')">Complete</button>
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

let pendingCompletionId = null;

window.updateAppt = async (id, status) => {
  if (status === 'completed') {
    pendingCompletionId = id;
    document.getElementById('video-complete-details-modal').style.display = 'flex';
    return;
  }
  try {
    const res = await api.put(`/doctors/appointments/${id}`, { status });
    if (res.success) { showToast(`Appointment ${status}`); loadAppointments(); loadDashboard(); }
    else showToast(res.message || 'Failed');
  } catch { showToast('Error'); }
}

let manualPatientId = null;

window.generateManualReport = async (patientId, patientName) => {
  try {
    console.log('Generating Manual Report...', patientName, patientId);
    manualPatientId = patientId;
    pendingCompletionId = null; 
    document.getElementById('comp-remarks').value = '';
    document.getElementById('comp-medicines').value = '';
    document.getElementById('comp-tests').value = '';
    const modal = document.getElementById('video-complete-details-modal');
    if (modal) {
      modal.style.display = 'flex';
      const h2 = modal.querySelector('h2');
      if (h2) h2.textContent = `Generate Report: ${patientName}`;
    } else {
      console.error('MODAL NOT FOUND: video-complete-details-modal');
      alert('Software Error: Report modal missing from page. Refreshing...');
      window.location.reload();
    }
  } catch(e) { console.error('generateManualReport Error:', e); }
};

// Update the submit listener to handle manual reports
document.getElementById('btn-submit-completion')?.addEventListener('click', async () => {
  const remarks = document.getElementById('comp-remarks').value;
  const medicines = document.getElementById('comp-medicines').value;
  const suggestedTests = document.getElementById('comp-tests').value;
  
  const btn = document.getElementById('btn-submit-completion');
  btn.disabled = true; btn.textContent = 'Saving...';
  
  try {
    let res;
    if (pendingCompletionId) {
      // Linked to appointment
      res = await api.put(`/doctors/appointments/${pendingCompletionId}`, { 
        status: 'completed',
        remarks,
        medicines,
        suggestedTests
      });
    } else if (manualPatientId) {
      // Manual report (Directly to reports API)
      res = await api.post('/doctors/reports', { 
        patientId: manualPatientId,
        title: `Medical Report - ${new Date().toLocaleDateString()}`,
        description: remarks,
        remarks,
        medicines,
        suggestedTests,
        type: 'prescription'
      });
    }

    if (res && res.success) {
      document.getElementById('video-complete-details-modal').style.display = 'none';
      document.getElementById('video-completed-modal').style.display = 'flex';
      if (pendingCompletionId) {
         loadAppointments();
         loadDashboard();
      }
      // Clear
      manualPatientId = null;
      pendingCompletionId = null;
    } else {
      showToast(res?.message || 'Failed to save report');
    }
  } catch (ex) {
    showToast('Connection error');
  } finally {
    btn.disabled = false; btn.textContent = 'Save & Complete';
  }
});

// ─── Patients ─────────────────────────────────────────────────────────────────
window.loadPatients = async () => {
  const container = document.getElementById('patients-list');
  container.innerHTML = '<div class="loading-pulse">Loading...</div>';
  try {
    const res = await api.get('/doctors/patients');
    allPatients = res.patients || [];
    renderPatients(allPatients);
  } catch { container.innerHTML = '<div class="empty-state"><i class="fas fa-wifi-slash"></i><h3>Server offline</h3></div>'; }
}

window.searchPatients = (q) => {
  const filtered = allPatients.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  renderPatients(filtered);
}

window.renderPatients = (patients) => {
  const container = document.getElementById('patients-list');
  if (!patients.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><h3>No patients yet</h3><p>Patients who book with you will appear here</p></div>';
    return;
  }
  container.innerHTML = `<div style="padding:0 0 8px;display:flex;flex-direction:column;gap:12px">${patients.map(p => {
    const initials = p.name.split(' ').map(n=>n[0]).join('');
    return `<div class="patient-card" style="display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="patient-avatar">${p.profileImage ? `<img src="${p.profileImage}" style="width:50px;height:50px;border-radius:14px;object-fit:cover">` : initials}</div>
        <div class="patient-info"><h4>${p.name}</h4><p>${p.email}</p></div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <button class="btn-figma-small" style="background:#112A61; height:36px; padding:0 15px;" onclick="window.loadPatientReports('${p._id}', '${p.name}')">View Reports</button>
        <button class="btn-figma-small" style="background:#1c78c0; height:36px; padding:0 15px;" onclick="window.generateManualReport('${p._id}', '${p.name}')"><i class="fas fa-plus"></i> Report</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

window.loadPatientReports = async (patientId, patientName) => {
   const modal = document.getElementById('patient-reports-modal');
   const title = document.getElementById('modal-patient-name');
   const list = document.getElementById('modal-reports-list');
   
   title.textContent = `Reports: ${patientName}`;
   list.innerHTML = '<div class="loading-pulse">Loading reports...</div>';
   modal.style.display = 'flex';
   
   try {
      const res = await api.get(`/reports?patientId=${patientId}`);
      if (res.success && res.reports?.length) {
         list.innerHTML = res.reports.map(r => `
            <div style="background:#F8FCFF; padding:15px; border-radius:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; border:1px solid #EAF4FC;">
               <div>
                  <h4 style="margin:0 0 5px 0; color:#112A61;">${r.title}</h4>
                  <p style="margin:0; font-size:12px; color:#666;">${new Date(r.createdAt).toLocaleDateString()}</p>
               </div>
               <div style="display:flex; gap:10px;">
                  <button class="btn-figma-small" onclick="window.openReport('${r._id}')">View</button>
                  <button class="btn-figma-small" style="background:#1c78c0" onclick="window.openReport('${r._id}', true)">Download</button>
               </div>
            </div>
         `).join('');
      } else {
         list.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">No reports found for this patient.</p>';
      }
   } catch(e) {
      document.getElementById('patient-reports-list').innerHTML = '<p style="color:red">Error loading reports.</p>';
   }
}

// ─── Video Call ───────────────────────────────────────────────────────────────
window.joinVideoCall = async (roomId, patientName) => {
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
    showToast('Video call joined! 🎥');
  } catch (err) { 
    console.error('Video Call Access Error:', err);
    showToast('Failed to access camera/microphone. Please check permissions.');
    navigate('screen-appointments');
    return;
  }

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

window.toggleMic = (btn) => {
  const t = localStream?.getAudioTracks()[0];
  if (t) { 
    t.enabled = !t.enabled; 
    btn.innerHTML = t.enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
    btn.classList.toggle('muted', !t.enabled);
    showToast(t.enabled ? 'Microphone On' : 'Microphone Muted');
  }
};
window.toggleCam = (btn) => {
  const t = localStream?.getVideoTracks()[0];
  if (t) { 
    t.enabled = !t.enabled; 
    btn.innerHTML = t.enabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
    btn.classList.toggle('muted', !t.enabled);
    showToast(t.enabled ? 'Camera On' : 'Camera Off');
  }
};
function endCall() {
  localStream?.getTracks().forEach(t => t.stop());
  peerConnection?.close();
  peerConnection = null;
  clearInterval(callTimerInterval);
  callSeconds = 0;
  socket.emit('leave-room', { roomId: socket.roomId });
  navigate('screen-appointments');
  showToast('Call ended');
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
window.openReport = (id, print = false) => {
  window.open(`/shared/report.html?id=${id}${print ? '&print=true' : ''}`, '_blank');
};
window.loadAllReports = async () => {
  const container = document.getElementById('all-reports-list');
  if(!container) return;
  container.innerHTML = '<div class="loading-pulse">Loading all reports...</div>';
  try {
    const res = await api.get('/reports?all=true');
    if (res.success && res.reports?.length) {
      container.innerHTML = res.reports.map(r => `
        <div class="report-item-card" style="background:#fff; padding:20px; border-radius:15px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 4px 15px rgba(0,0,0,0.03); border:1px solid #EAF4FC;">
          <div style="display:flex; align-items:center; gap:15px;">
            <div style="background:#EAF4FC; color:#112A61; width:50px; height:50px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px;"><i class="fas fa-file-medical"></i></div>
            <div>
              <h4 style="margin:0; color:#112A61;">${r.title}</h4>
              <p style="margin:4px 0 0; font-size:13px; color:#666;">Patient: <b>${r.patientId?.name || 'N/A'}</b> | ${new Date(r.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn-figma-small" onclick="window.openReport('${r._id}')">View</button>
            <button class="btn-figma-small" style="background:#1c78c0" onclick="window.openReport('${r._id}', true)">Print</button>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = `
        <div class="empty-state" style="padding:40px; text-align:center;">
          <i class="fas fa-file-invoice" style="font-size:4rem; color:#EAF4FC; margin-bottom:20px;"></i>
          <h3>No reports found</h3>
          <p style="color:#666; margin-bottom:30px;">Reports you generate will appear here. Start by selecting a patient.</p>
          <button class="btn-figma" style="width:auto; padding:0 30px;" onclick="window.navigate('screen-patients')">View My Patients</button>
        </div>
      `;
    }
  } catch(e) { container.innerHTML = '<div class="empty-state">Error loading reports</div>'; }
};
