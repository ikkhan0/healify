const fs = require('fs');

// The ONE unified header template — identical to main website navbar
function makeHeader(ctaHtml) {
  return `<header class="tm-nav">
    <div class="logo" style="display:flex;align-items:center;gap:10px;">
      <img src="/assets/telemind_logo.png" alt="TeleMind" style="height:40px;border-radius:8px;object-fit:cover;">
      <span style="font-weight:800;font-size:1.2rem;color:#112A61;">TeleMind</span>
    </div>
    <nav class="nav-links" style="display:flex;gap:2.5rem;">
      <a href="/" style="text-decoration:none;color:#112A61;font-weight:700;font-size:15px;">Home</a>
      <a href="/doctors.html" style="text-decoration:none;color:#112A61;font-weight:700;font-size:15px;">Find a Doctor</a>
      <a href="/how-it-works.html" style="text-decoration:none;color:#112A61;font-weight:700;font-size:15px;">How it works</a>
      <a href="/resources.html" style="text-decoration:none;color:#112A61;font-weight:700;font-size:15px;">Resources</a>
      <a href="/about-us.html" style="text-decoration:none;color:#112A61;font-weight:700;font-size:15px;">About us</a>
      <a href="/contact-us.html" style="text-decoration:none;color:#112A61;font-weight:700;font-size:15px;">Contact Us</a>
    </nav>
    <div class="nav-icons">${ctaHtml}</div>
  </header>`;
}

// ─── PATIENT PORTAL ───────────────────────────────────────────────────────────
let patient = fs.readFileSync('d:/Projects Backup/Healify/frontend/patient/index.html', 'utf8');

// Replace all existing headers (auth-desktop-nav and top-nav variants)
patient = patient.replace(/<header class="(auth-desktop-nav|top-nav)"[^>]*>[\s\S]*?<\/header>/g, (match) => {
  // Determine the CTA button based on which links the original had
  if (match.includes("navigate('screen-signup')") && !match.includes("navigate('screen-login')")) {
    return makeHeader(`<button onclick="navigate('screen-signup')" style="background:#112A61;color:#fff;border:none;padding:11px 28px;border-radius:30px;font-weight:700;cursor:pointer;font-size:15px;">Sign Up</button>`);
  }
  return makeHeader(`<button onclick="navigate('screen-login')" style="background:#112A61;color:#fff;border:none;padding:11px 28px;border-radius:30px;font-weight:700;cursor:pointer;font-size:15px;">Sign In</button>`);
});

// Add website links section to sidebar (patient)
const patientSidebarBefore = `    <a class="nav-item" onclick="navigate('screen-profile')"><i class="fas fa-user"></i><span>Profile</span></a>
  </nav>`;
const patientSidebarAfter = `    <a class="nav-item" onclick="navigate('screen-profile')"><i class="fas fa-user"></i><span>Profile</span></a>
    <div class="nav-divider"></div>
    <a class="nav-item nav-item-website" href="/doctors.html"><i class="fas fa-stethoscope"></i><span>Find a Doctor</span></a>
    <a class="nav-item nav-item-website" href="/how-it-works.html"><i class="fas fa-info-circle"></i><span>How it works</span></a>
    <a class="nav-item nav-item-website" href="/resources.html"><i class="fas fa-book-open"></i><span>Resources</span></a>
    <a class="nav-item nav-item-website" href="/about-us.html"><i class="fas fa-building"></i><span>About us</span></a>
    <a class="nav-item nav-item-website" href="/contact-us.html"><i class="fas fa-envelope"></i><span>Contact Us</span></a>
    <div class="nav-divider"></div>
    <a class="nav-item nav-item-logout" onclick="localStorage.clear(); window.location.href='/'"><i class="fas fa-sign-out-alt"></i><span>Logout</span></a>
  </nav>`;
patient = patient.replace(patientSidebarBefore, patientSidebarAfter);

fs.writeFileSync('d:/Projects Backup/Healify/frontend/patient/index.html', patient, 'utf8');
console.log("Patient portal updated.");

// ─── DOCTOR PORTAL ────────────────────────────────────────────────────────────
let doctor = fs.readFileSync('d:/Projects Backup/Healify/frontend/doctor/index.html', 'utf8');

// Replace all existing headers
doctor = doctor.replace(/<header class="(auth-desktop-nav|top-nav)"[^>]*>[\s\S]*?<\/header>/g, (match) => {
  if (match.includes("navigate('screen-signup')") && !match.includes("navigate('screen-login')")) {
    return makeHeader(`<button onclick="navigate('screen-signup')" style="background:#112A61;color:#fff;border:none;padding:11px 28px;border-radius:30px;font-weight:700;cursor:pointer;font-size:15px;">Sign Up</button>`);
  }
  return makeHeader(`<button onclick="navigate('screen-login')" style="background:#112A61;color:#fff;border:none;padding:11px 28px;border-radius:30px;font-weight:700;cursor:pointer;font-size:15px;">Sign In</button>`);
});

// Add website links + nav-logo to doctor sidebar
const docSidebarOld = `<nav id="main-nav" class="bottom-nav" style="display:none;">
  <div class="nav-logo" style="display:none;"><div class="logo-circle-small" style="background:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:#000;font-weight:700;font-size:12px;margin:10px auto;">logo</div></div>`;
const docSidebarNew = `<nav id="main-nav" class="bottom-nav" style="display:none;">
  <div class="nav-logo">
    <img src="/assets/telemind_logo.png" alt="TeleMind" onerror="this.style.display='none'">
    <span class="nav-brand">TeleMind</span>
  </div>`;
doctor = doctor.replace(docSidebarOld, docSidebarNew);

// Add website links before closing </nav>
const docNavClose = `  <a class="nav-item desktop-only logout-nav" onclick="logout()"><i class="fas fa-sign-out-alt"></i><span>Logout</span></a>
</nav>`;
const docNavNew = `  <a class="nav-item desktop-only logout-nav" onclick="logout()"><i class="fas fa-sign-out-alt"></i><span>Logout</span></a>
  <div class="nav-divider"></div>
  <a class="nav-item nav-item-website" href="/doctors.html"><i class="fas fa-stethoscope"></i><span>Find a Doctor</span></a>
  <a class="nav-item nav-item-website" href="/how-it-works.html"><i class="fas fa-info-circle"></i><span>How it works</span></a>
  <a class="nav-item nav-item-website" href="/resources.html"><i class="fas fa-book-open"></i><span>Resources</span></a>
  <a class="nav-item nav-item-website" href="/about-us.html"><i class="fas fa-building"></i><span>About us</span></a>
  <a class="nav-item nav-item-website" href="/contact-us.html"><i class="fas fa-envelope"></i><span>Contact Us</span></a>
</nav>`;
doctor = doctor.replace(docNavClose, docNavNew);

fs.writeFileSync('d:/Projects Backup/Healify/frontend/doctor/index.html', doctor, 'utf8');
console.log("Doctor portal updated.");
