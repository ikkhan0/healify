(async function() {
  try {
    const response = await fetch('/api/settings');
    const data = await response.json();
    if (data.success && data.settings) {
      const s = data.settings;
      
      // Update Logo
      if (s.logoUrl) {
        const logoText = document.querySelector('.logo-text');
        const logoCircle = document.querySelector('.logo-circle-small');
        if (logoText) {
          logoText.innerHTML = `<img src="${s.logoUrl}" alt="Healify" style="height:32px; vertical-align:middle;">`;
          if (logoCircle) logoCircle.style.display = 'none';
        }
      }

      // Update Contact Info (if elements exist)
      const phoneEls = document.querySelectorAll('.setting-phone');
      const emailEls = document.querySelectorAll('.setting-email');
      const addressEls = document.querySelectorAll('.setting-address');

      phoneEls.forEach(el => el.textContent = s.phone);
      emailEls.forEach(el => el.textContent = s.email);
      addressEls.forEach(el => el.textContent = s.address);

      // Update H1 logo icon if on landing
      const brandH1 = document.querySelector('.brand-text h1');
      if (brandH1 && s.logoUrl) {
         // Optionally replace the ⚕️ icon or add logo next to it
      }
    }
  } catch (e) {
    console.error('Failed to load global settings', e);
  }
})();
