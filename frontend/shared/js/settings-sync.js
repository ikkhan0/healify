(async function() {
  try {
    const response = await fetch('/api/settings');
    const data = await response.json();
    if (data.success && data.settings) {
      const s = data.settings;
      
      // 1. Update Logo in all placeholders
      if (s.logoUrl) {
        const logoContainers = document.querySelectorAll('.auth-logo, .nav-logo, .logo, .sidebar-brand .brand-icon, .login-brand i');
        logoContainers.forEach(container => {
           // If it's the brand-icon (font-awesome), replace with img
           if (container.classList.contains('brand-icon') || container.tagName === 'I') {
              container.innerHTML = `<img src="${s.logoUrl}" style="width:100%; height:100%; object-fit:contain;">`;
              container.style.background = 'transparent';
           } else {
              container.innerHTML = `<img src="${s.logoUrl}" alt="TeleMind" style="height:35px; vertical-align:middle; cursor:pointer;" onclick="window.location.href='/'">`;
           }
        });
        
        // Website specific logo update
        const logoText = document.querySelector('.logo-text');
        const logoCircle = document.querySelector('.logo-circle-small');
        if (logoText) {
          logoText.innerHTML = `<img src="${s.logoUrl}" alt="TeleMind" style="height:32px; vertical-align:middle;">`;
          if (logoCircle) logoCircle.style.display = 'none';
        }
      }

      // 2. Update Contact Info globally
      const phoneEls = document.querySelectorAll('.setting-phone, #report-phone, .contact-phone');
      const emailEls = document.querySelectorAll('.setting-email, #report-email, .contact-email');
      const addressEls = document.querySelectorAll('.setting-address, #report-address, .contact-address');

      if (s.phone) phoneEls.forEach(el => el.textContent = s.phone);
      if (s.email) emailEls.forEach(el => el.textContent = s.email);
      if (s.address) addressEls.forEach(el => el.textContent = s.address);

      // 3. Inject Global Footer if on website/portal
      if (!document.querySelector('footer') && !document.querySelector('.no-footer')) {
         const footer = document.createElement('footer');
         footer.style.cssText = 'background:#0A2753; color:#fff; padding:4rem 2rem; margin-top:4rem; font-family:"Plus Jakarta Sans", sans-serif;';
         footer.innerHTML = `
           <div style="max-width:1200px; margin:0 auto; display:grid; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); gap:40px;">
             <div>
               <div class="logo" style="margin-bottom:20px; display:flex; align-items:center; gap:10px;">
                 ${s.logoUrl ? `<img src="${s.logoUrl}" style="height:40px;">` : `<span style="font-size:1.5rem; font-weight:800;">TeleMind</span>`}
               </div>
               <p style="color:rgba(255,255,255,0.7); line-height:1.6; font-size:0.95rem;">Your trusted partner for psychiatric consultations and mental wellness. We bring the best specialists to your screen with complete privacy and care.</p>
             </div>
             <div>
               <h3 style="margin-bottom:25px; font-size:1.2rem; font-weight:700; border-left:4px solid #5DADE2; padding-left:15px;">Contact Us</h3>
               <p style="margin-bottom:12px; display:flex; align-items:center; gap:12px;"><i class="fas fa-phone-alt" style="color:#5DADE2; width:20px;"></i> <span class="setting-phone">${s.phone || '+92 300 1234567'}</span></p>
               <p style="margin-bottom:12px; display:flex; align-items:center; gap:12px;"><i class="fas fa-envelope" style="color:#5DADE2; width:20px;"></i> <span class="setting-email">${s.email || 'support@telemind.pk'}</span></p>
               <p style="margin-bottom:12px; display:flex; align-items:center; gap:12px;"><i class="fas fa-map-marker-alt" style="color:#5DADE2; width:20px;"></i> <span class="setting-address">${s.address || 'Lahore, Pakistan'}</span></p>
             </div>
             <div>
               <h3 style="margin-bottom:25px; font-size:1.2rem; font-weight:700; border-left:4px solid #5DADE2; padding-left:15px;">Quick Links</h3>
               <ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap:12px;">
                 <li><a href="/doctors.html" style="color:rgba(255,255,255,0.7); text-decoration:none; transition:color 0.2s;">Find a Doctor</a></li>
                 <li><a href="/about-us.html" style="color:rgba(255,255,255,0.7); text-decoration:none; transition:color 0.2s;">About Us</a></li>
                 <li><a href="/contact-us.html" style="color:rgba(255,255,255,0.7); text-decoration:none; transition:color 0.2s;">Contact Support</a></li>
                 <li><a href="/role-selection.html" style="color:rgba(255,255,255,0.7); text-decoration:none; transition:color 0.2s;">Login / Signup</a></li>
               </ul>
             </div>
           </div>
           <div style="text-align:center; margin-top:60px; padding-top:25px; border-top:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.4); font-size:0.85rem;">
             &copy; ${new Date().getFullYear()} ${s.softwareName || 'TeleMind'}. All rights reserved. Professional mental health at your doorstep.
           </div>
         `;
         document.body.appendChild(footer);
      }

      // 4. Update Document Title / Brand Name if needed
      if (s.otherSettings && s.otherSettings.get('softwareName')) {
         const name = s.otherSettings.get('softwareName');
         document.querySelectorAll('.brand-name, .logo-text').forEach(el => el.textContent = name);
      }
    }
  } catch (e) {
    console.error('Failed to load global settings', e);
  }
})();
