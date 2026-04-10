const fs = require('fs');

const files = [
  'd:/Projects Backup/Healify/frontend/doctor/index.html',
  'd:/Projects Backup/Healify/frontend/website/role-selection.html'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace the opening tag and logo
    let newHeaderTop = `<header class="top-nav" style="padding: 24px 60px; position: absolute; top:0; left:0; width:100%; box-sizing:border-box; z-index:100; display:flex; justify-content:space-between; align-items:center;">
    <div class="logo" style="display:flex; align-items:center; gap:10px;">
      <img src="/assets/telemind_logo.png" alt="TeleMind Logo" style="height:40px; border-radius:8px; object-fit:cover;">
      <span class="logo-text" style="font-weight:800; font-size:1.2rem; margin-left:8px; color:#112A61;">TeleMind</span>
    </div>
    <nav class="nav-links" style="display:flex; gap:3rem;">
      <a href="/" style="text-decoration:none; color:#112A61; font-weight:800; font-size:15px;">Home</a>
      <a href="/how-it-works.html" style="text-decoration:none; color:#112A61; font-weight:800; font-size:15px;">How it works</a>
      <a href="/about-us.html" style="text-decoration:none; color:#112A61; font-weight:800; font-size:15px;">About us</a>
      <a href="/contact-us.html" style="text-decoration:none; color:#112A61; font-weight:800; font-size:15px;">Contact Us</a>
    </nav>`;

    content = content.replace(/<header class="auth-desktop-nav">\s*<div class="auth-logo">[\s\S]*?<\/div>\s*<div class="auth-nav-links">[\s\S]*?<\/div>/g, newHeaderTop);
    
    // Replace buttons
    content = content.replace(/<div class="auth-nav-btn">\s*<button(.*?)>(.*?)<\/button>\s*<\/div>/g, '<div class="nav-icons"><button$1 style="background:#112A61; color:#fff; border:none; padding:12px 30px; border-radius:30px; font-weight:700; cursor:pointer; font-size:15px;">$2</button></div>');
    
    // And auth nav arrows in Doctor OTP
    content = content.replace(/<div class="auth-nav-arrows">([\s\S]*?)<\/div>/g, '<div class="nav-icons" style="display:flex; gap:15px; font-size:24px; color:#112A61; cursor:pointer;">$1</div>');
    
    // Images
    content = content.replace(/<img src="\/assets\/doctor-hero\.(png|svg)"[^>]*>/g, '<img src="/assets/doctor_signup_dummy.png" alt="TeleMind Provider" style="width:100%; height:100%; object-fit:cover; object-position:center; border-radius:30px;" />');
    
    fs.writeFileSync(file, content);
  }
});
console.log("Done");
