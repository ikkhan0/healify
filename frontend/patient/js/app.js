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
function navigate(screenId) {
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
    const token = localStorage.getItem('healify_token');
    const user = localStorage.getItem('healify_user');
    if (token && user) {
      currentUser = JSON.parse(user);
      updateHeaderUser();
      navigate('screen-home');
    } else {
      navigate('screen-identity');
    }
  }, 2700);
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
      role: 'patient'
    });
    if (res.success) {
      // Send OTP
      const otpRes = await api.post('/auth/send-otp', { email: document.getElementById('signup-email').value });
      document.getElementById('otp-email-display').textContent = document.getElementById('signup-email').value;
      localStorage.setItem('healify_pending_email', document.getElementById('signup-email').value);
      navigate('screen-otp');
      showToast('OTP sent to your email 📧');
    } else {
      err.textContent = res.message || 'Registration failed';
    }
  } catch (ex) { err.textContent = 'Network error. Is the server running?'; }
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
      if (res.user.role !== 'patient') { err.textContent = 'Please use the correct login panel.'; setLoading(btn,false); return; }
      localStorage.setItem('healify_token', res.token);
      localStorage.setItem('healify_user', JSON.stringify(res.user));
      currentUser = res.user;
      updateHeaderUser();
      navigate('screen-home');
      showToast(`Welcome back, ${res.user.name.split(' ')[0]}! 👋`);
    } else {
      err.textContent = res.message || 'Invalid credentials';
    }
  } catch (ex) { err.textContent = 'Network error. Is the server running?'; }
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

// ─── Doctor Detail ────────────────────────────────────────────────────────────
async function openDoctorDetail(doctorId) {
  navigate('screen-doctor-detail');
  const container = document.getElementById('doctor-detail-content');
  container.innerHTML = '<div class="loading-pulse" style="padding:60px">Loading...</div>';
  try {
    const res = await api.get(`/patients/doctors/${doctorId}`);
    const d = res.doctor;
    const dp = d.doctorProfile || {};
    selectedDoctor = d;
    const initials = d.name.split(' ').map(n=>n[0]).join('').toUpperCase();
    container.innerHTML = `
      <div class="doc-hero">
        <div class="doc-hero-avatar">${d.profileImage ? `<img src="${d.profileImage}" alt="${d.name}" style="width:100%;height:100%;border-radius:24px;object-fit:cover">` : initials}</div>
        <h3>${d.name}</h3>
        <p>${dp.specialty || 'Specialist'} ${dp.country ? '• '+dp.country : ''}</p>
        <div class="doc-stats">
          <div class="doc-stat"><strong>${dp.experience || '5'}+</strong><span>Years Exp</span></div>
          <div class="doc-stat"><strong>${dp.rating || '4.0'}</strong><span>Rating</span></div>
          <div class="doc-stat"><strong>RS ${dp.consultationFee || 300}</strong><span>Consult Fee</span></div>
        </div>
      </div>
      <div class="doc-detail-body">
        <div class="doc-detail-section">
          <h4>About</h4>
          <p>${dp.bio || 'Experienced specialist dedicated to patient well-being and quality mental health care.'}</p>
        </div>
        ${dp.availability && dp.availability.length ? `<div class="doc-detail-section">
          <h4>Availability</h4>
          <p>${dp.availability.map(a => `${a.day}: ${a.startTime} – ${a.endTime}`).join('<br>')}</p>
        </div>` : ''}
        <div class="book-btn-sticky">
          <button class="btn-primary full" onclick="openBooking()">Book Appointment</button>
        </div>
      </div>`;
  } catch(e) { container.innerHTML = '<div class="empty-state"><p>Failed to load</p></div>'; }
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
  navigate('screen-payment');
}

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
  try {
    const dp = selectedDoctor?.doctorProfile || {};
    const res = await api.post('/patients/appointments', {
      doctorId: selectedDoctor._id,
      date: selectedDate,
      timeSlot: selectedSlot,
      type: selectedType,
      symptoms: document.getElementById('booking-symptoms')?.value || '',
      fee: dp.consultationFee || 300
    });
    if (res.success) {
      showToast('✅ Appointment booked successfully!');
      navigate('screen-appointments');
    } else {
      showToast(res.message || 'Booking failed');
    }
  } catch(e) { showToast('Network error'); }
}

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
      <div class="appt-card">
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
        ${a.status === 'confirmed' ? `<div class="appt-actions"><button class="btn-primary" onclick="joinVideoCall('${a.roomId}','${(doc.name||'Doctor')}')"><i class="fas fa-video"></i> Join Call</button></div>` : ''}
      </div>`;
  }).join('');
}

// ─── Reports ──────────────────────────────────────────────────────────────────
async function loadReports() {
  const container = document.getElementById('reports-list');
  container.innerHTML = '<div class="loading-pulse">Loading...</div>';
  try {
    const res = await api.get('/patients/reports');
    allReports = res.reports || [];
    renderReports(allReports);
  } catch(e) { container.innerHTML = '<div class="empty-state"><i class="fas fa-wifi-slash"></i><h3>Server offline</h3></div>'; }
}

function switchReportTab(type, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = type === 'all' ? allReports : allReports.filter(r => r.type === type);
  renderReports(filtered);
}

function renderReports(reports) {
  const container = document.getElementById('reports-list');
  if (!reports.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-file-medical"></i><h3>No records yet</h3><p>Your health records will appear here after consultations</p></div>';
    return;
  }
  container.innerHTML = reports.map(r => {
    const iconMap = { assessment:'brain assessment', prescription:'prescription-bottle prescription', lab:'flask lab', general:'file-medical general' };
    const [icon, cls] = (iconMap[r.type] || 'file general').split(' ');
    const date = new Date(r.createdAt).toLocaleDateString('en', { month:'short', day:'numeric', year:'numeric' });
    return `<div class="report-card"><div class="report-icon ${cls}"><i class="fas fa-${icon}"></i></div>
      <div class="report-info"><h4>${r.title}</h4><p>${r.description || 'No description'}</p><div class="report-date">${date}</div></div></div>`;
  }).join('');
}

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

const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

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
  } catch(e) { showToast('Could not access camera/microphone'); }

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

window.toggleMic = () => {
  if (!localStream) return;
  const track = localStream.getAudioTracks()[0];
  if (track) { track.enabled = !track.enabled; document.getElementById('mic-btn').classList.toggle('muted', !track.enabled); }
};

window.toggleCam = () => {
  if (!localStream) return;
  const track = localStream.getVideoTracks()[0];
  if (track) { track.enabled = !track.enabled; document.getElementById('cam-btn').classList.toggle('muted', !track.enabled); }
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
