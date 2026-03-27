/* app.js – Healify Patient Panel Main Logic */
'use strict';

// ─── State ──────────────────────────────────────────────────────────────────
let currentUser = null;
let allDoctors = [];
let allAppointments = [];
let allReports = [];
let selectedDoctor = null;
let selectedDate = null;
let selectedSlot = null;
let selectedType = 'video';

// Assessment questions
const assessmentQuestions = [
  { q: "How often have you felt down, depressed, or hopeless in the last two weeks?", opts: ["Not at all", "Several days", "More than half the days", "Nearly every day"] },
  { q: "How often have you had little interest or pleasure in doing things?", opts: ["Not at all", "Several days", "More than half the days", "Nearly every day"] },
  { q: "How often have you felt nervous, anxious, or on edge?", opts: ["Not at all", "Several days", "More than half the days", "Nearly every day"] },
  { q: "How often have you had trouble relaxing?", opts: ["Not at all", "Several days", "More than half the days", "Nearly every day"] },
  { q: "How often have you had trouble falling or staying asleep?", opts: ["Not at all", "Several days", "More than half the days", "Nearly every day"] },
  { q: "How often have you felt tired or had little energy?", opts: ["Not at all", "Several days", "More than half the days", "Nearly every day"] },
  { q: "How often have you had poor appetite or been overeating?", opts: ["Not at all", "Several days", "More than half the days", "Nearly every day"] },
  { q: "How often have you had difficulty concentrating on things?", opts: ["Not at all", "Several days", "More than half the days", "Nearly every day"] },
  { q: "How often have you felt so restless that you had trouble sitting still?", opts: ["Not at all", "Several days", "More than half the days", "Nearly every day"] },
  { q: "How often have you felt afraid something awful might happen?", opts: ["Not at all", "Several days", "More than half the days", "Nearly every day"] }
];
let currentQuestion = 0;
let assessAnswers = [];

// ─── Navigation ──────────────────────────────────────────────────────────────
window.navigate = (screenId) => {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    target.scrollTop = 0;
  }
  // Load data for screens
  if (screenId === 'screen-home') loadHomeDoctors();
  if (screenId === 'screen-doctors') loadDoctorsList();
  if (screenId === 'screen-appointments') loadAppointments();
  if (screenId === 'screen-reports') loadReports();
  if (screenId === 'screen-profile') loadProfile();
  if (screenId === 'screen-assessment') startAssessment();
}

function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function setLoading(btnEl, loading) {
  if (loading) { btnEl.dataset.orig = btnEl.textContent; btnEl.textContent = 'Loading...'; btnEl.disabled = true; }
  else { btnEl.textContent = btnEl.dataset.orig || 'Submit'; btnEl.disabled = false; }
}

// ─── Splash ───────────────────────────────────────────────────────────────────
window.onload = () => {
  setTimeout(() => {
    const token = localStorage.getItem('telemind_token');
    const user = localStorage.getItem('telemind_user');
    const disclaimerAccepted = localStorage.getItem('telemind_disclaimer_accepted');
    
    if (token && user) {
      currentUser = JSON.parse(user);
      updateHeaderUser();
      navigate('screen-home');
    } else if (!disclaimerAccepted) {
      navigate('screen-disclaimer');
    } else {
      navigate('screen-identity');
    }
  }, 2700);
};

window.setLanguage = (lang) => {
  localStorage.setItem('telemind_lang', lang);
  showToast(`Language set to ${lang === 'en' ? 'English' : 'Urdu'}`);
  // In a real app, this would trigger a re-render or reload with new translations
  // For now, we'll store the preference.
};

// Override navigate to mark disclaimer as accepted when moving from it
const originalNavigate = window.navigate;
window.navigate = (screenId) => {
  if (document.querySelector('.screen.active')?.id === 'screen-disclaimer' && screenId === 'screen-identity') {
    localStorage.setItem('telemind_disclaimer_accepted', 'true');
  }
  originalNavigate(screenId);
};

// ─── Auth Helpers ─────────────────────────────────────────────────────────────
function updateHeaderUser() {
  if (!currentUser) return;
  const el = document.getElementById('user-name-display');
  if (el) el.textContent = currentUser.name.split(' ')[0];
  const profileImg = document.getElementById('home-avatar');
  if (profileImg && currentUser.profileImage) profileImg.src = currentUser.profileImage;
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  const isPass = inp.type === 'password';
  inp.type = isPass ? 'text' : 'password';
  btn.innerHTML = isPass ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────
document.getElementById('form-signup').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('signup-err');
  err.textContent = '';
  const btn = e.target.querySelector('button[type=submit]');
  setLoading(btn, true);
  try {
    const res = await api.post('/auth/register', {
      name: document.getElementById('signup-name').value,
      email: document.getElementById('signup-email').value,
      password: document.getElementById('signup-password').value,
      phone: document.getElementById('signup-phone').value,
      role: 'client'
    });
    if (res.success) {
      // Send OTP
      api.post('/auth/send-otp', { email: document.getElementById('signup-email').value }).catch(e => console.error('Auto OTP send failed', e));
      
      const email = document.getElementById('signup-email').value;
      const displayEl = document.getElementById('otp-email-display');
      if (displayEl) displayEl.textContent = email;
      
      localStorage.setItem('healify_pending_email', email);
      navigate('screen-otp');
      showToast('OTP sent to your email 📧');
    } else {
      err.textContent = res.message || 'Registration failed';
    }
  } catch (ex) { 
    console.error('Signup Error:', ex);
    err.textContent = 'Connection error. Make sure the backend server (default: port 5000) is running.';
  }
  setLoading(btn, false);
});

// ─── Login ────────────────────────────────────────────────────────────────────
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('login-err');
  err.textContent = '';
  const btn = e.target.querySelector('button[type=submit]');
  setLoading(btn, true);
  try {
    const res = await api.post('/auth/login', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value
    });
    if (res.success) {
      if (res.user.role !== 'client') { err.textContent = 'Please use the correct login panel.'; setLoading(btn,false); return; }
      localStorage.setItem('telemind_token', res.token);
      localStorage.setItem('telemind_user', JSON.stringify(res.user));
      currentUser = res.user;
      updateHeaderUser();
      navigate('screen-home');
      showToast(`Welcome back, ${res.user.name.split(' ')[0]}! 👋`);
    } else {
      err.textContent = res.message || 'Invalid credentials';
    }
  } catch (ex) { 
    console.error('Login Error:', ex);
    err.textContent = 'Connection error. Is the backend server running?';
  }
  setLoading(btn, false);
});

// ─── OTP ──────────────────────────────────────────────────────────────────────
// OTP inputs auto-advance
document.addEventListener('DOMContentLoaded', () => {
  const boxes = document.querySelectorAll('.otp-box');
  boxes.forEach((box, i) => {
    box.addEventListener('input', () => { if (box.value && i < boxes.length - 1) boxes[i+1].focus(); });
    box.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !box.value && i > 0) { boxes[i-1].focus(); } });
  });
});

function getOTPValue() {
  return [...document.querySelectorAll('.otp-box')].map(b => b.value).join('');
}

async function verifyOTP() {
  const otp = getOTPValue();
  const email = localStorage.getItem('healify_pending_email') || document.getElementById('otp-email-display').textContent;
  const err = document.getElementById('otp-err');
  if (otp.length < 6) { err.textContent = 'Please enter all 6 digits'; return; }
  err.textContent = '';
  try {
    const res = await api.post('/auth/verify-otp', { email, otp });
    if (res.success) {
      if (res.token) {
        localStorage.setItem('healify_token', res.token);
        localStorage.setItem('healify_user', JSON.stringify(res.user));
        currentUser = res.user;
      }
      document.getElementById('otp-success-modal').style.display = 'flex';
    } else {
      err.textContent = res.message || 'Invalid OTP';
    }
  } catch(ex) { err.textContent = 'Network error'; }
}

async function resendOTP() {
  const email = localStorage.getItem('healify_pending_email');
  if (!email) return;
  const res = await api.post('/auth/send-otp', { email });
  showToast(res.success ? 'OTP resent! Check your email.' : res.message);
}

async function bypassOTP() {
  const email = localStorage.getItem('healify_pending_email');
  if (!email) { showToast('Email not found. Please sign up again.'); return; }
  
  showToast('Bypassing verification...');
  try {
    const res = await api.post('/auth/verify-otp', { email, otp: '123456' });
    if (res.success) {
      if (res.token) {
        localStorage.setItem('healify_token', res.token);
        localStorage.setItem('healify_user', JSON.stringify(res.user));
        currentUser = res.user;
      }
      document.getElementById('otp-success-modal').style.display = 'flex';
    } else {
      showToast(res.message || 'Bypass failed (is server running?)');
    }
  } catch(e) { showToast('Network error during bypass'); }
}

// ─── Home / Doctors ───────────────────────────────────────────────────────────
async function loadHomeDoctors() {
  const container = document.getElementById('home-doctors-list');
  try {
    const res = await api.get('/patients/doctors');
    allDoctors = res.doctors || [];
    renderDoctorCards(allDoctors.slice(0,4), container);
    updateStats();
  } catch(e) { container.innerHTML = '<div class="empty-state"><i class="fas fa-wifi-slash"></i><h3>Server offline</h3><p>Start the backend server to see doctors</p></div>'; }
}

async function loadDoctorsList() {
  const container = document.getElementById('doctors-full-list');
  if (allDoctors.length === 0) {
    try {
      const res = await api.get('/patients/doctors');
      allDoctors = res.doctors || [];
    } catch(e) {}
  }
  renderDoctorCards(allDoctors, container);
}

function renderDoctorCards(doctors, container) {
  if (!doctors.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-user-md"></i><h3>No doctors found</h3><p>Try a different search</p></div>';
    return;
  }
  container.innerHTML = doctors.map(d => {
    const dp = d.doctorProfile || {};
    const initials = d.name.split(' ').map(n=>n[0]).join('').toUpperCase();
    return `
      <div class="doctor-card" onclick="openDoctorDetail('${d._id}')">
        <div class="doc-avatar">${d.profileImage ? `<img src="${d.profileImage}" alt="${d.name}" onerror="this.parentNode.innerHTML='${initials}'" />` : initials}</div>
        <div class="doc-info">
          <h4>${d.name}</h4>
          <div class="doc-specialty">${dp.specialty || 'Specialist'}</div>
          <div class="doc-rating"><i class="fas fa-star"></i> ${dp.rating || '4.0'} (${dp.reviewCount || 0} reviews)</div>
        </div>
        <div class="doc-meta">
          <div class="doc-fee">RS ${dp.consultationFee || 300}</div>
          <div class="doc-avail">Available</div>
        </div>
      </div>`;
  }).join('');
}

function searchDoctors(q) {
  const filtered = allDoctors.filter(d =>
    d.name.toLowerCase().includes(q.toLowerCase()) ||
    (d.doctorProfile?.specialty || '').toLowerCase().includes(q.toLowerCase())
  );
  const container = document.getElementById('home-doctors-list') || document.getElementById('doctors-full-list');
  if (container) renderDoctorCards(filtered, container);
}

function filterDoctors(specialty) {
  document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  const filtered = specialty ? allDoctors.filter(d => (d.doctorProfile?.specialty || '').toLowerCase() === specialty.toLowerCase()) : allDoctors;
  const container = document.getElementById('home-doctors-list') || document.getElementById('doctors-full-list');
  if (container) renderDoctorCards(filtered, container);
}

async function updateStats() {
  try {
    const appts = await api.get('/patients/appointments');
    allAppointments = appts.appointments || [];
    const reports = await api.get('/patients/reports');
    document.getElementById('stat-appts').textContent = allAppointments.length;
    document.getElementById('stat-reports').textContent = (reports.reports || []).length;
  } catch(e) {}
}

// ─── Doctor Detail Modal (Image 6) ────────────────────────────────────────────
async function openDoctorDetail(doctorId) {
  const modal = document.getElementById('doctor-detail-modal');
  const container = document.getElementById('doctor-modal-content');
  modal.style.display = 'flex';
  container.innerHTML = '<div class="loading-pulse" style="padding:60px; text-align:center;">Loading...</div>';
  
  try {
    const res = await api.get(`/patients/doctors/${doctorId}`);
    const d = res.doctor;
    const dp = d.doctorProfile || {};
    selectedDoctor = d;
    const initials = d.name.split(' ').map(n=>n[0]).join('').toUpperCase();
    
    // Generate Stars
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
           <div><i class="fas fa-stethoscope"></i> ${dp.specialty || 'senior Psychiatrist'}</div>
           <div><i class="fas fa-money-bill-wave"></i> Fee: RS ${dp.consultationFee || 300}</div>
        </div>
        <div style="display:flex; justify-content:center; gap:15px; margin-bottom:2rem;">
           <button style="width:45px; height:45px; border-radius:50%; background:#00509D; color:#fff; border:none; font-size:1.2rem; cursor:pointer;"><i class="fas fa-globe"></i></button>
           <button style="width:45px; height:45px; border-radius:50%; background:#00509D; color:#fff; border:none; font-size:1.2rem; cursor:pointer;"><i class="fas fa-comment-dots"></i></button>
           <button style="width:45px; height:45px; border-radius:50%; background:#00509D; color:#fff; border:none; font-size:1.2rem; cursor:pointer;"><i class="fas fa-phone"></i></button>
           <button style="width:45px; height:45px; border-radius:50%; background:#A3C6D9; color:#00509D; border:none; font-size:1.2rem; cursor:pointer;"><i class="fas fa-share"></i></button>
        </div>
      </div>
      
      <div style="border-top:1px solid #EAF4FC; padding-top:1.5rem; text-align:left;">
        <h4 style="color:#0A2753; font-size:1.3rem; margin-bottom:0.8rem; font-weight:700;">Experience</h4>
        <p style="color:#1C448E; line-height:1.6; margin-bottom:1.5rem;">Senior psychiatrist with extensive experience in mental health care, committed to improving lives through evidence-based treatment.</p>
        
        <h4 style="color:#0A2753; font-size:1.3rem; margin-bottom:0.8rem; font-weight:700;">Specialities</h4>
        <ul style="color:#1C448E; line-height:1.6; margin-bottom:2rem; padding-left:1.5rem;">
          <li>Depression & Anxiety</li>
          <li>Stress & Trauma</li>
          <li>Personalized Psychiatric Care</li>
        </ul>
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h4 style="color:#0A2753; font-size:1.3rem; font-weight:700;">Reviews</h4>
          <div style="color:#0A2753; font-size:1.2rem;"><i class="fas fa-chevron-circle-left" style="cursor:pointer"></i> <i class="fas fa-chevron-circle-right" style="cursor:pointer"></i></div>
        </div>
        
        <div style="display:flex; gap:10px; overflow-x:auto; margin-bottom:2rem; padding-bottom:10px;">
          ${dp.reviews && dp.reviews.length ? dp.reviews.map(r => `
          <div style="background:#5DADE2; min-width:280px; border-radius:12px; padding:1.2rem; color:#fff; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
             <div style="margin-bottom:0.5rem; font-size:1rem; color:#FFD700;"><i class="fas fa-star"></i> ${r.rating}</div>
             <p style="font-size:0.95rem; line-height:1.4;">"${r.comment}"</p>
             <div style="font-size:0.8rem; margin-top:10px; opacity:0.9; font-weight:600;">- ${r.patientName}</div>
          </div>`).join('') : '<div style="color:#1C448E; font-weight:600; padding:1rem;">No reviews yet.</div>'}
        </div>
        
        <button onclick="document.getElementById('doctor-detail-modal').style.display='none'; openBooking();" style="width:100%; background:#0a2753; color:#fff; padding:1rem; border-radius:8px; border:none; font-weight:700; font-size:1.1rem; cursor:pointer;">Book Your Appointment Now</button>
      </div>`;
  } catch(e) { container.innerHTML = '<div style="text-align:center; color:red;">Failed to load profile</div>'; }
}

// ─── Booking ──────────────────────────────────────────────────────────────────
function openBooking() {
  navigate('screen-booking');
  if (selectedDoctor) {
    const dp = selectedDoctor.doctorProfile || {};
    const initials = selectedDoctor.name.split(' ').map(n=>n[0]).join('').toUpperCase();
    document.getElementById('booking-doctor-info').innerHTML = `
      <div class="doc-avatar" style="width:48px;height:48px;font-size:18px;border-radius:14px">${selectedDoctor.profileImage ? `<img src="${selectedDoctor.profileImage}" style="width:48px;height:48px;border-radius:14px;object-fit:cover">` : initials}</div>
      <div class="doc-info">
        <h4>${selectedDoctor.name}</h4>
        <p>${dp.specialty || 'Specialist'}</p>
      </div>`;
    document.getElementById('booking-fee').textContent = `RS ${dp.consultationFee || 300}`;
    const payFee = document.getElementById('pay-fee');
    const payTotal = document.getElementById('pay-total');
    if (payFee) payFee.textContent = `RS ${dp.consultationFee || 300}`;
    if (payTotal) payTotal.textContent = `RS ${(dp.consultationFee || 300) + 50}`;
  }
  renderCalendar();
  renderTimeSlots();
}

function renderCalendar() {
  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth();
  selectedDate = null;

  function draw() {
    const cal = document.getElementById('calendar-mini');
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en', { month: 'long', year: 'numeric' });
    let html = `<div class="cal-header"><button class="cal-nav-btn" onclick="calNav(-1)">‹</button><h4>${monthName}</h4><button class="cal-nav-btn" onclick="calNav(1)">›</button></div>
      <div class="cal-days-header"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
      <div class="cal-grid">`;
    for (let i = 0; i < firstDay; i++) html += '<div class="cal-day other-month"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const isToday = date.toDateString() === now.toDateString();
      const isPast = date < now && !isToday;
      const isSel = selectedDate && date.toDateString() === selectedDate.toDateString();
      html += `<div class="cal-day${isToday?' today':''}${isPast?' disabled':''}${isSel?' selected':''}" onclick="${isPast ? '' : `selectDate(${viewYear},${viewMonth},${d})`}">${d}</div>`;
    }
    html += '</div>';
    cal.innerHTML = html;
  }

  window.calNav = (dir) => { viewMonth += dir; if (viewMonth > 11) { viewMonth = 0; viewYear++; } if (viewMonth < 0) { viewMonth = 11; viewYear--; } draw(); };
  window.selectDate = (y, m, d) => { selectedDate = new Date(y, m, d); draw(); };
  draw();
}

function renderTimeSlots() {
  const slots = ['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','02:00 PM','02:30 PM','03:00 PM','03:30 PM','04:00 PM','04:30 PM'];
  selectedSlot = null;
  document.getElementById('time-slots').innerHTML = slots.map(s =>
    `<div class="time-slot" onclick="selectSlot(this,'${s}')">${s}</div>`
  ).join('');
}

window.selectSlot = (el, slot) => {
  document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  selectedSlot = slot;
};

window.selectType = (el, type) => {
  document.querySelectorAll('.type-opt').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  selectedType = type;
};

function confirmBooking() {
  if (!selectedDate) { showToast('Please select a date'); return; }
  if (!selectedSlot) { showToast('Please select a time slot'); return; }
  
  // Basic intake validation
  const age = document.getElementById('intake-age').value;
  if (!document.getElementById('intake-name').value || !age) {
    showToast('Please fill in Name and Age'); return;
  }
  if (age < 16 && !document.getElementById('intake-guardian-name').value) {
    showToast('Guardian name required for age < 16'); return;
  }

  navigate('screen-payment');
}

window.toggleGuardianFields = (age) => {
  const fields = document.getElementById('guardian-fields');
  if (fields) fields.style.display = (age && age < 16) ? 'block' : 'none';
};

window.toggleWaiverFields = (checked) => {
  const fields = document.getElementById('waiver-fields');
  if (fields) fields.style.display = checked ? 'block' : 'none';
};

// ─── Payment ──────────────────────────────────────────────────────────────────
window.selectPayment = (el) => {
  document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  const cardForm = document.getElementById('credit-card-form');
  cardForm.style.display = el.textContent.includes('Credit') ? 'block' : 'none';
};

async function processPayment() {
  if (!currentUser) { navigate('screen-login'); return; }
  const selected = document.querySelector('.pay-opt.selected');
  if (!selected) { showToast('Please select a payment method'); return; }
  
  // Show loading state
  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  
  try {
    const dp = selectedDoctor?.doctorProfile || {};
    
    // Collect Intake Data
    const intakeData = {
      name: document.getElementById('intake-name').value,
      age: document.getElementById('intake-age').value,
      guardianName: document.getElementById('intake-guardian-name').value,
      guardianContact: document.getElementById('intake-guardian-contact').value,
      gender: document.querySelector('input[name="intake-gender"]:checked')?.value,
      education: document.getElementById('intake-education').value,
      phone: document.getElementById('intake-phone').value,
      email: document.getElementById('intake-email').value,
      address: document.getElementById('intake-address').value,
      counsellorPreference: document.getElementById('intake-counsellor-pref').value,
      migrationStatus: document.querySelector('input[name="intake-migration"]:checked')?.value
    };

    // Collect Waiver Data
    const isWaiver = document.getElementById('request-fee-waiver').checked;
    const waiverData = isWaiver ? {
      requestWaiver: true,
      income: document.getElementById('waiver-income').value,
      ses: document.getElementById('waiver-ses').value,
      familyMembers: document.getElementById('waiver-members').value,
      occupation: document.querySelector('input[name="waiver-occupation"]:checked')?.value,
      residenceType: document.querySelector('input[name="waiver-residence"]:checked')?.value
    } : { requestWaiver: false };

    const res = await api.post('/patients/appointments', {
      doctorId: selectedDoctor._id,
      date: selectedDate,
      timeSlot: selectedSlot,
      type: selectedType,
      symptoms: document.getElementById('booking-symptoms')?.value || '',
      fee: dp.consultationFee || 300,
      intakeData,
      waiverData
    });
    
    btn.innerHTML = originalText;
    
    if (res.success) {
      // Instead of navigating immediately, show the Image 3 Success Modal
      document.getElementById('booking-success-modal').style.display = 'flex';
      // The OK button will navigate to screen-appointments
    } else {
      showToast(res.message || 'Booking failed');
    }
  } catch(e) { 
    btn.innerHTML = originalText;
    showToast('Network error'); 
  }
}

window.closeSuccessModal = () => {
  document.getElementById('booking-success-modal').style.display = 'none';
  navigate('screen-appointments');
  loadAppointments();
};

// ─── Appointments ─────────────────────────────────────────────────────────────
async function loadAppointments() {
  const container = document.getElementById('appointments-list');
  container.innerHTML = '<div class="loading-pulse">Loading...</div>';
  try {
    const res = await api.get('/patients/appointments');
    allAppointments = res.appointments || [];
    renderAppointments(allAppointments);
  } catch(e) { container.innerHTML = '<div class="empty-state"><i class="fas fa-wifi-slash"></i><h3>Server offline</h3></div>'; }
}

function filterAppts(status, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = status === 'all' ? allAppointments : allAppointments.filter(a => a.status === status);
  renderAppointments(filtered);
}

function renderAppointments(appts) {
  const container = document.getElementById('appointments-list');
  if (!appts.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><h3>No appointments</h3><p>Book your first appointment with a doctor</p></div>';
    return;
  }
  container.innerHTML = appts.map(a => {
    const doc = a.doctorId || {};
    const initials = (doc.name || 'D').split(' ').map(n=>n[0]).join('');
    const date = new Date(a.date).toLocaleDateString('en', { weekday:'short', month:'short', day:'numeric' });
    return `
      <div class="appt-card" onclick="openApptDetail('${a._id}')" style="cursor:pointer; position:relative;">
        <div class="appt-card-top">
          <div class="appt-doc-img">${doc.profileImage ? `<img src="${doc.profileImage}" style="width:50px;height:50px;border-radius:14px;object-fit:cover">` : initials}</div>
          <div class="appt-info"><h4>${doc.name || 'Doctor'}</h4><p>Consultation</p></div>
          <span class="appt-status status-${a.status}">${a.status}</span>
        </div>
        <div class="appt-detail-row">
          <span><i class="fas fa-calendar"></i>${date}</span>
          <span><i class="fas fa-clock"></i>${a.timeSlot}</span>
          <span><i class="fas fa-${a.type === 'video' ? 'video' : 'hospital'}"></i>${a.type}</span>
        </div>
        </div>
        ${a.status === 'confirmed' ? `<div class="appt-actions"><button class="btn-primary" onclick="event.stopPropagation(); joinVideoCall('${a.roomId}','${(doc.name||'Doctor')}')"><i class="fas fa-video"></i> Join Call</button></div>` : ''}
        ${a.status === 'completed' ? `<div class="appt-actions"><button class="btn-primary" style="background:#0A2753;" onclick="event.stopPropagation(); openReviewModal('${doc._id}')"><i class="fas fa-star"></i> Write Review</button></div>` : ''}
      </div>`;
  }).join('');
}

window.openApptDetail = (apptId) => {
  const appt = allAppointments.find(a => a._id === apptId);
  if (!appt) return;
  navigate('screen-appt-detail');
  const doc = appt.doctorId || {};
  const dp = doc.doctorProfile || {};
  const initials = (doc.name || 'D').split(' ').map(n=>n[0]).join('').toUpperCase();
  const date = new Date(appt.date).toLocaleDateString('en', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
  
  document.getElementById('appt-detail-content').innerHTML = `
    <div style="display:flex; align-items:center; gap:15px; margin-bottom:2rem;">
      <div style="width:70px; height:70px; border-radius:12px; overflow:hidden; background:#EAF4FC; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#0A2753;">
        ${doc.profileImage ? `<img src="${doc.profileImage}" style="width:100%;height:100%;object-fit:cover">` : initials}
      </div>
      <div>
        <h3 style="color:#0A2753; font-size:1.3rem; margin:0 0 5px 0; font-weight:800;">Dr. ${doc.name || 'Doctor'}</h3>
        <p style="color:#1C448E; margin:0; font-weight:600;"><i class="fas fa-stethoscope"></i> ${dp.specialty || 'senior Psychiatrist'}</p>
      </div>
    </div>
    
    <div style="display:grid; grid-template-columns:1fr; gap:15px; margin-bottom:15px;">
      
      <!-- Service Provided -->
      <div style="background:#1C448E; color:#fff; padding:1.5rem; border-radius:16px;">
        <h4 style="margin:0 0 1rem 0; font-size:1.1rem; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:10px;">Service Provided</h4>
        <p style="margin:0 0 8px 0; font-size:0.9rem;"><i class="far fa-clock" style="margin-right:8px;"></i> ${appt.timeSlot}</p>
        <p style="margin:0 0 15px 0; font-size:0.9rem;"><i class="far fa-calendar-alt" style="margin-right:8px;"></i> ${date}</p>
        
        <p style="margin:0; font-size:0.9rem; color:#A3C6D9;">• Service:</p>
        <p style="margin:0 0 10px 0; font-weight:600;">Psychiatric Evaluation</p>
        
        <p style="margin:0; font-size:0.9rem; color:#A3C6D9;">• Focus Area:</p>
        <p style="margin:0 0 10px 0; font-weight:600;">Stress, Anxiety, Mood</p>
        
        <p style="margin:0; font-size:0.9rem; color:#A3C6D9;">• Duration:</p>
        <p style="margin:0; font-weight:600;">30–45 minutes</p>
      </div>
      
      <!-- Doctor Notes -->
      <div style="background:#1C448E; color:#fff; padding:1.5rem; border-radius:16px;">
        <h4 style="margin:0 0 1rem 0; font-size:1.1rem; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:10px;">Doctor Notes</h4>
        <ul style="padding-left:1rem; margin:0 0 15px 0; font-size:0.9rem; line-height:1.5;">
           <li style="margin-bottom:8px;">Patient consultation has been completed successfully.</li>
           <li>Doctor advised medication and follow-up if required.</li>
        </ul>
        <p style="color:#A3C6D9; font-weight:600; margin-bottom:15px; font-size:0.95rem;">Psychiatric Evaluation Report</p>
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button id="view-appt-report-btn" class="loading-btn" style="background:#fff; color:#1C448E; padding:0.8rem; border-radius:8px; border:none; font-weight:700; cursor:pointer; opacity:0.5;" disabled>Searching Report...</button>
          <button style="background:#fff; color:#1C448E; padding:0.8rem; border-radius:8px; border:none; font-weight:700; cursor:pointer;" onclick="window.print()">Print This Page</button>
        </div>
      </div>
      
      <!-- Payment Summary -->
      <div style="background:#1C448E; color:#fff; padding:1.5rem; border-radius:16px;">
        <h4 style="margin:0 0 1rem 0; font-size:1.1rem; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:10px;">Payment Summary</h4>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.9rem;">
          <span style="color:#A3C6D9;">• Consultation Fees:</span>
        </div>
        <p style="margin:0 0 15px 0; font-weight:600;">RS ${appt.fee || 300}</p>
        
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.9rem;">
          <span style="color:#A3C6D9;">• Payment Status:</span>
        </div>
        <p style="margin:0 0 15px 0; font-weight:600;">Paid</p>
        
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button id="view-receipt-btn" style="background:#fff; color:#1C448E; padding:0.8rem; border-radius:8px; border:none; font-weight:700; cursor:pointer;" onclick="window.print()">Print Receipt</button>
          <button id="download-appt-report-btn" class="loading-btn" style="background:#fff; color:#1C448E; padding:0.8rem; border-radius:8px; border:none; font-weight:700; cursor:pointer; opacity:0.5;" disabled>Download Report</button>
        </div>
      </div>
      
    </div>
  `;

  // Search for associated report
  (async () => {
    try {
      const res = await api.get('/patients/reports');
      const reports = res.reports || [];
      const report = reports.find(r => r.appointmentId === apptId);
      const btn = document.getElementById('view-appt-report-btn');
      const dlBtn = document.getElementById('download-appt-report-btn');
      if (btn && report) {
        btn.textContent = 'View Report';
        btn.style.opacity = '1';
        btn.disabled = false;
        btn.onclick = () => openReport(report._id);
        
        if (dlBtn) {
          dlBtn.textContent = 'Download Report';
          dlBtn.style.opacity = '1';
          dlBtn.disabled = false;
          dlBtn.onclick = () => openReport(report._id, true);
        }
      } else if (btn) {
        btn.textContent = 'No Report Found';
        if (dlBtn) dlBtn.textContent = 'No Report';
      }
    } catch(e) { console.error('Report search failed', e); }
  })();
};

// ─── Reviews ──────────────────────────────────────────────────────────────────
// ... (rest of the file)

// ─── Reviews ──────────────────────────────────────────────────────────────────
window.openReviewModal = (doctorId) => {
  document.getElementById('review-doctor-id').value = doctorId;
  document.getElementById('review-comment').value = '';
  document.getElementById('review-modal').style.display = 'flex';
  setRating(0); // reset
};

window.setRating = (stars) => {
  document.getElementById('review-rating').value = stars;
  const icons = document.getElementById('star-rating').querySelectorAll('i');
  icons.forEach((i, idx) => {
    if (idx < stars) { i.classList.replace('far', 'fas'); i.style.color = '#FFD700'; }
    else { i.classList.replace('fas', 'far'); i.style.color = '#ccc'; }
  });
};

window.submitReview = async (e) => {
  e.preventDefault();
  const doctorId = document.getElementById('review-doctor-id').value;
  const rating = document.getElementById('review-rating').value;
  const comment = document.getElementById('review-comment').value;
  
  if(rating == 0) return showToast('Please select a star rating');
  
  const btn = e.target.querySelector('button');
  const orgBtn = btn.innerHTML;
  btn.innerHTML = 'Submitting...';
  
  try {
    const res = await api.post(`/patients/doctors/${doctorId}/reviews`, { rating, comment });
    btn.innerHTML = orgBtn;
    if(res.success) {
       document.getElementById('review-modal').style.display = 'none';
       showToast('✅ Review submitted!');
    } else { showToast(res.message); }
  } catch(err) { btn.innerHTML = orgBtn; showToast('Network Error'); }
};

// ─── Reports ──────────────────────────────────────────────────────────────────
window.loadReports = async () => {
  const container = document.getElementById('reports-list');
  container.innerHTML = '<div class="loading-pulse">Loading...</div>';
  try {
    const res = await api.get('/patients/reports');
    allReports = res.reports || [];
    renderReports(allReports);
  } catch(e) { container.innerHTML = '<div class="empty-state"><i class="fas fa-wifi-slash"></i><h3>Server offline</h3></div>'; }
}

window.switchReportTab = (type, btn) => {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = type === 'all' ? allReports : allReports.filter(r => r.type === type);
  renderReports(filtered);
}

window.renderReports = (reports) => {
  const container = document.getElementById('reports-list');
  if (!reports.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-file-medical"></i><h3>No records yet</h3><p>Your health records will appear here after consultations</p></div>';
    return;
  }
  container.innerHTML = reports.map(r => {
    const iconMap = { assessment:'brain assessment', prescription:'prescription-bottle prescription', lab:'flask lab', general:'file-medical general' };
    const [icon, cls] = (iconMap[r.type] || 'file general').split(' ');
    const date = new Date(r.createdAt).toLocaleDateString('en', { month:'short', day:'numeric', year:'numeric' });
    return `
      <div class="report-card" onclick="openReport('${r._id}')" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:15px;">
          <div class="report-icon ${cls}"><i class="fas fa-${icon}"></i></div>
          <div class="report-info">
            <h4 style="margin:0;">${r.title}</h4>
            <p style="margin:4px 0;">${r.description || 'No description'}</p>
            <div class="report-date">${date}</div>
          </div>
        </div>
        <div class="report-actions" style="display:flex; gap:10px;">
          <button class="icon-btn" onclick="event.stopPropagation(); openReport('${r._id}', true)" title="Download/Print" style="background:#f0f7ff; color:#1C448E; border:none; padding:8px; border-radius:8px; cursor:pointer;"><i class="fas fa-download"></i></button>
        </div>
      </div>`;
  }).join('');
}

window.openReport = (id, autoPrint = false) => {
  window.open(`/shared/report.html?id=${id}${autoPrint ? '&print=true' : ''}`, '_blank');
};

// ─── Assessment ───────────────────────────────────────────────────────────────
function startAssessment() {
  currentQuestion = 0;
  assessAnswers = new Array(assessmentQuestions.length).fill(null);
  renderQuestion();
}

function renderQuestion() {
  const container = document.getElementById('assessment-question-wrap');
  const q = assessmentQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / assessmentQuestions.length) * 100;
  document.getElementById('assess-progress').style.width = progress + '%';
  document.getElementById('assess-counter').textContent = `${currentQuestion + 1} / ${assessmentQuestions.length}`;
  document.getElementById('assess-prev').style.visibility = currentQuestion === 0 ? 'hidden' : 'visible';
  document.getElementById('assess-next').textContent = currentQuestion === assessmentQuestions.length - 1 ? 'Finish' : 'Next';
  container.innerHTML = `<div class="question-card"><h3>${q.q}</h3><div class="answer-options">
    ${q.opts.map((opt, i) => `<div class="answer-opt${assessAnswers[currentQuestion] === i ? ' selected' : ''}" onclick="selectAnswer(${i})">${opt}</div>`).join('')}
  </div></div>`;
}

window.selectAnswer = (i) => {
  assessAnswers[currentQuestion] = i;
  document.querySelectorAll('.answer-opt').forEach((o, idx) => o.classList.toggle('selected', idx === i));
};

function nextQuestion() {
  if (assessAnswers[currentQuestion] === null) { showToast('Please select an answer'); return; }
  if (currentQuestion < assessmentQuestions.length - 1) { currentQuestion++; renderQuestion(); }
  else showAssessmentResult();
}

function prevQuestion() { if (currentQuestion > 0) { currentQuestion--; renderQuestion(); } }

function showAssessmentResult() {
  const score = assessAnswers.reduce((sum, a) => sum + (a || 0), 0);
  const maxScore = assessmentQuestions.length * 3;
  const pct = Math.round((1 - score / maxScore) * 100);
  const arcOffset = 251 - (251 * pct / 100);
  let emoji = '😊', title = 'Feeling Good', desc = 'Your mental health score is positive. Keep up your healthy habits and self-care routine.';
  if (pct < 40) { emoji = '😟'; title = 'Needs Attention'; desc = 'Your score suggests you may be experiencing significant distress. We strongly recommend consulting a mental health professional.'; }
  else if (pct < 65) { emoji = '😐'; title = 'Moderate Struggles'; desc = 'You are experiencing some mental health challenges. Speaking with a therapist could be very beneficial.'; }
  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-desc').textContent = desc;
  document.getElementById('score-num').textContent = pct;
  document.getElementById('score-arc').setAttribute('stroke-dashoffset', arcOffset);
  navigate('screen-assess-result');
}

// ─── Video Call ───────────────────────────────────────────────────────────────
let localStream = null;
let peerConnection = null;
let callTimerInterval = null;
let callSeconds = 0;
const socket = io();

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
    // Example TURN configuration (Required for working perfectly):
    // { urls: 'turn:YOUR_TURN_SERVER_URL', username: 'YOUR_USERNAME', credential: 'YOUR_PASSWORD' }
  ]
};


async function joinVideoCall(roomId, doctorName) {
  navigate('screen-video-call');
  document.getElementById('call-doctor-name').textContent = doctorName;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('local-video').srcObject = localStream;
    const userId = currentUser?._id || 'anon';
    const userName = currentUser?.name || 'Patient';
    socket.emit('join-room', { roomId, userId, userName });
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
    peerConnection.onicecandidate = e => { if(e.candidate) socket.emit('ice-candidate', { to: socketId, candidate: e.candidate }); };
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { to: socketId, offer });
  });

  socket.on('offer', async ({ from, offer }) => {
    peerConnection = new RTCPeerConnection(iceServers);
    localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));
    peerConnection.ontrack = e => { document.getElementById('remote-video').srcObject = e.streams[0]; };
    peerConnection.onicecandidate = e => { if(e.candidate) socket.emit('ice-candidate', { to: from, candidate: e.candidate }); };
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { to: from, answer });
  });

  socket.on('answer', async ({ answer }) => { await peerConnection?.setRemoteDescription(new RTCSessionDescription(answer)); });
  socket.on('ice-candidate', async ({ candidate }) => { await peerConnection?.addIceCandidate(new RTCIceCandidate(candidate)); });
}

window.toggleMic = (btn) => {
  if (!localStream) return;
  const track = localStream.getAudioTracks()[0];
  if (track) { 
    track.enabled = !track.enabled; 
    btn.innerHTML = track.enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
    btn.classList.toggle('muted', !track.enabled);
    showToast(track.enabled ? 'Microphone On' : 'Microphone Muted');
  }
};

window.toggleCam = (btn) => {
  if (!localStream) return;
  const track = localStream.getVideoTracks()[0];
  if (track) { 
    track.enabled = !track.enabled; 
    btn.innerHTML = track.enabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
    btn.classList.toggle('muted', !track.enabled);
    showToast(track.enabled ? 'Camera On' : 'Camera Off');
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
  const token = localStorage.getItem('healify_token');
  if (!token) { navigate('screen-login'); return; }
  try {
    const res = await api.get('/patients/profile');
    const u = res.user;
    const p = res.profile || {};
    document.getElementById('profile-name').textContent = u.name;
    document.getElementById('profile-email').textContent = u.email;
    document.getElementById('profile-phone').textContent = u.phone || 'Not set';
    document.getElementById('profile-age').textContent = p.age ? `${p.age} years` : 'Not set';
    document.getElementById('profile-blood').textContent = p.bloodGroup || 'Not set';
    if (u.profileImage) document.getElementById('profile-img').src = u.profileImage;
  } catch(e) {}
}

window.uploadAvatar = async (input) => {
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('profileImage', file);
  const headers = {};
  if (api.token()) headers['Authorization'] = `Bearer ${api.token()}`;
  try {
    const res = await fetch('/api/patients/profile', { method: 'PUT', headers, body: fd });
    const data = await res.json();
    if (data.success) { showToast('Profile photo updated'); loadProfile(); }
  } catch(e) { showToast('Upload failed'); }
};

function logout() {
  localStorage.removeItem('healify_token');
  localStorage.removeItem('healify_user');
  currentUser = null;
  navigate('screen-identity');
  showToast('Logged out successfully');
}

// --- Patient Profile & Health Records ---
window.showEditProfile = async () => {
  try {
    const res = await api.get('/patients/profile');
    const u = res.user;
    const p = res.profile || {};
    document.getElementById('edit-name').value = u.name || '';
    document.getElementById('edit-phone').value = u.phone || '';
    document.getElementById('edit-age').value = p.age || '';
    document.getElementById('edit-blood').value = p.bloodGroup || '';
    document.getElementById('edit-profile-modal').style.display = 'flex';
  } catch(e) { showToast('Error fetching profile data'); }
};

window.saveProfile = async () => {
  const btn = document.getElementById('btn-save-profile');
  const name = document.getElementById('edit-name').value;
  const phone = document.getElementById('edit-phone').value;
  const age = document.getElementById('edit-age').value;
  const bloodGroup = document.getElementById('edit-blood').value;

  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const res = await api.put('/patients/profile', { name, phone, age: Number(age), bloodGroup });
    if (res.success) {
      showToast('Profile updated');
      const user = JSON.parse(localStorage.getItem('healify_user') || '{}');
      user.name = name;
      user.phone = phone;
      localStorage.setItem('healify_user', JSON.stringify(user));
      loadProfile();
      document.getElementById('edit-profile-modal').style.display = 'none';
    } else showToast(res.message);
  } catch (err) { showToast('Error saving profile'); }
  finally { btn.disabled = false; btn.textContent = 'Save Changes'; }
};

window.uploadHealthRecord = async () => {
  const btn = document.getElementById('btn-upload-rec');
  const title = document.getElementById('rec-title').value;
  const desc = document.getElementById('rec-desc').value;
  const fileInp = document.getElementById('rec-file');

  if (!title) return showToast('Enter title');
  
  btn.disabled = true; btn.textContent = 'Uploading...';
  try {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', desc);
    formData.append('type', 'general');
    if (fileInp.files[0]) formData.append('file', fileInp.files[0]);

    const res = await fetch(`/api/patients/reports`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('healify_token')}` },
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      showToast('Record added');
      document.getElementById('add-record-modal').style.display = 'none';
      loadReports();
      // Clear
      document.getElementById('rec-title').value = '';
      document.getElementById('rec-desc').value = '';
      document.getElementById('rec-file').value = '';
    } else showToast(data.message);
  } catch (err) { showToast('Error uploading record'); }
  finally { btn.disabled = false; btn.textContent = 'Upload Record'; }
};
