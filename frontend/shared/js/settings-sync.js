(async function() {
  try {
    // Note: Adjusting path to /api/settings as it's absolute from root
    const response = await fetch('/api/settings');
    const data = await response.json();
    if (data.success && data.settings) {
      const s = data.settings;
      
      // Update Logo in all placeholders
      if (s.logoUrl) {
        const logoContainers = document.querySelectorAll('.auth-logo, .nav-logo, .logo');
        logoContainers.forEach(container => {
          const logoText = container.querySelector('.logo-text, .logo-circle-small');
          if (logoText) {
             container.innerHTML = `<img src="${s.logoUrl}" alt="Healify" style="height:35px; vertical-align:middle; cursor:pointer;" onclick="window.location.href='/'">`;
          }
        });
      }
    }
  } catch (e) {
    console.error('Failed to load global settings', e);
  }
})();
