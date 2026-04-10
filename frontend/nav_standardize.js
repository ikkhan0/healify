/**
 * Standardizes all .tm-nav headers in patient + doctor portals
 * to exactly match the main website navbar:
 *   - Same gradient background
 *   - White circle logo (50px) + brand text
 *   - Same link colors (#1C448E → #0A2753 on active/hover)
 *   - White pill CTA button with dark text
 */
const fs = require('fs');

// The canonical header HTML — identical structure to website's .top-nav
function makeTmNav(ctaLabel, ctaOnclick) {
  const ctaAttr = ctaOnclick
    ? `onclick="${ctaOnclick}"`
    : `href="/role-selection.html"`;
  const ctaTag  = ctaOnclick ? 'button' : 'a';

  return `<header class="tm-nav">
    <div class="logo">
      <div class="logo-circle-small tm-logo-circle">
        <img src="/assets/telemind_logo.png" alt="TeleMind" onerror="this.style.display='none'">
      </div>
      <span class="logo-text">TeleMind</span>
    </div>
    <nav class="nav-links">
      <a href="/">Home</a>
      <a href="/doctors.html">Find a Doctor</a>
      <a href="/how-it-works.html">How it works</a>
      <a href="/resources.html">Resources</a>
      <a href="/about-us.html">About us</a>
      <a href="/contact-us.html">Contact Us</a>
    </nav>
    <div class="nav-icons">
      <${ctaTag} class="btn-nav-cta" ${ctaAttr}>${ctaLabel}</${ctaTag}>
    </div>
  </header>`;
}

// Regex to replace existing .tm-nav blocks
const navRx = /<header class="tm-nav">[\s\S]*?<\/header>/g;

// ── Patient ────────────────────────────────────────────────────────────────────
let patient = fs.readFileSync('d:/Projects Backup/Healify/frontend/patient/index.html', 'utf8');

// Replace each tm-nav, choosing CTA based on which screen it's in
patient = patient.replace(navRx, (match, offset) => {
  const before = patient.slice(0, offset);
  const screenMatch = [...before.matchAll(/id="screen-(\w+)"/g)];
  const screenId = screenMatch.length ? screenMatch[screenMatch.length - 1][1] : '';

  // Login screen → show Sign Up; all others → Sign In
  if (screenId === 'login') {
    return makeTmNav("Sign Up", "navigate('screen-signup')");
  }
  return makeTmNav("Sign In", "navigate('screen-login')");
});

fs.writeFileSync('d:/Projects Backup/Healify/frontend/patient/index.html', patient, 'utf8');
console.log('Patient: tm-nav headers standardized.');

// ── Doctor ─────────────────────────────────────────────────────────────────────
let doctor = fs.readFileSync('d:/Projects Backup/Healify/frontend/doctor/index.html', 'utf8');

doctor = doctor.replace(navRx, (match, offset) => {
  const before = doctor.slice(0, offset);
  const screenMatch = [...before.matchAll(/id="screen-(\w+)"/g)];
  const screenId = screenMatch.length ? screenMatch[screenMatch.length - 1][1] : '';

  if (screenId === 'login') {
    return makeTmNav("Sign Up", "navigate('screen-signup')");
  }
  return makeTmNav("Sign In", "navigate('screen-login')");
});

fs.writeFileSync('d:/Projects Backup/Healify/frontend/doctor/index.html', doctor, 'utf8');
console.log('Doctor: tm-nav headers standardized.');
