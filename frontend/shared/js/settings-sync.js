(async function() {
  try {
    const response = await fetch('/api/settings');
    const data = await response.json();
    if (data.success && data.settings) {
      const s = data.settings;
      
      // 1. Update Logo in all placeholders
      if (s.logoUrl) {

        // A) Update <img> tags already inside logo circles (patient/doctor .tm-logo-circle)
        document.querySelectorAll('.tm-logo-circle img, .logo-circle-small img').forEach(img => {
          img.src = s.logoUrl;
          img.style.display = '';
        });

        // B) Update any nav-logo area images (sidebar and bottom-nav)
        document.querySelectorAll('.nav-logo img').forEach(img => {
          img.src = s.logoUrl;
          img.style.display = '';
        });

        // C) Admin sidebar brand-icon (replaces FontAwesome <i> with img)
        document.querySelectorAll('.sidebar-brand .brand-icon, .login-brand i').forEach(container => {
          if (container.tagName === 'I' || container.classList.contains('brand-icon')) {
            container.innerHTML = `<img src="${s.logoUrl}" style="width:100%; height:100%; object-fit:contain;">`;
            container.style.background = 'transparent';
          }
        });

        // D) Website specific: .auth-logo standalone containers (not circles)
        document.querySelectorAll('.auth-logo').forEach(container => {
          if (!container.querySelector('img')) {
            container.innerHTML = `<img src="${s.logoUrl}" alt="TeleMind" style="height:35px; vertical-align:middle; cursor:pointer;" onclick="window.location.href='/'">`;
          } else {
            container.querySelector('img').src = s.logoUrl;
          }
        });

        // E) Logo text span — just keep the text, don't replace with an img
        // (the circle img is already handled above)
      }

      // 2. Update Contact Info globally
      const phoneEls = document.querySelectorAll('.setting-phone, #report-phone, .contact-phone');
      const emailEls = document.querySelectorAll('.setting-email, #report-email, .contact-email');
      const addressEls = document.querySelectorAll('.setting-address, #report-address, .contact-address');

      if (s.phone) phoneEls.forEach(el => el.textContent = s.phone);
      if (s.email) emailEls.forEach(el => el.textContent = s.email);
      if (s.address) addressEls.forEach(el => el.textContent = s.address);

      // 3. Inject Global Footer if on website/portal (skip SPA app dashboards)
      const isAppDashboard = !!document.querySelector('.app-screen, #page-app');
      if (!document.querySelector('footer') && !document.querySelector('.no-footer') && !isAppDashboard) {
         const footer = document.createElement('footer');

         // Detect admin panel: sidebar is fixed at var(--sidebar-w) = 260px
         const sidebar = document.querySelector('.sidebar');
         const sidebarW = sidebar ? (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w')) || 260) : 0;
         
         footer.style.cssText = `background:#0A2753; color:#fff; padding:4rem 2rem; margin-top:4rem; font-family:"Plus Jakarta Sans", sans-serif; margin-left:${sidebarW}px;`;
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
      if (s.otherSettings && s.otherSettings['softwareName']) {
         const name = s.otherSettings['softwareName'];
         document.querySelectorAll('.brand-name, .logo-text').forEach(el => el.textContent = name);
      }
    }
  } catch (e) {
    console.error('Failed to load global settings', e);
  }
})();
