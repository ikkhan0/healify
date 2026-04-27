/**
 * TeleMind i18n (Internationalization) Module
 * Uses Google Translate Widget for automatic translation + manual RTL support
 * Approach: Google Translate handles content translation; we handle RTL/direction
 */
(function() {
  const SUPPORTED_LANGS = ['en', 'ur'];
  const RTL_LANGS = ['ur'];
  const STORAGE_KEY = 'telemind_language';
  let currentLang = localStorage.getItem(STORAGE_KEY) || 'en';

  // ─── Google Translate Integration ─────────────────────────────────────────
  function initGoogleTranslate() {
    // Add Google Translate element (hidden)
    if (!document.getElementById('google_translate_element')) {
      const div = document.createElement('div');
      div.id = 'google_translate_element';
      div.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
      document.body.appendChild(div);
    }

    // Load Google Translate script
    if (!document.querySelector('script[src*="translate.google.com"]')) {
      window.googleTranslateElementInit = function() {
        new google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'en,ur',
          autoDisplay: false,
          layout: google.translate.TranslateElement.InlineLayout.SIMPLE
        }, 'google_translate_element');

        // If saved language is Urdu, trigger translation after init
        setTimeout(() => {
          if (currentLang === 'ur') triggerGoogleTranslate('ur');
        }, 1000);
      };

      const script = document.createElement('script');
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.head.appendChild(script);
    }
  }

  // Trigger Google Translate to switch language
  function triggerGoogleTranslate(langCode) {
    const gtCombo = document.querySelector('.goog-te-combo');
    if (gtCombo) {
      gtCombo.value = langCode;
      gtCombo.dispatchEvent(new Event('change'));
    } else {
      // Retry after Google Translate loads
      setTimeout(() => triggerGoogleTranslate(langCode), 500);
    }
  }

  // ─── RTL / Direction Support ──────────────────────────────────────────────
  function applyDirection(lang) {
    const isRTL = RTL_LANGS.includes(lang);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    document.body.classList.toggle('rtl', isRTL);
    document.body.classList.toggle('ltr', !isRTL);

    // Inject RTL overrides if Urdu
    let rtlStyle = document.getElementById('rtl-override-style');
    if (isRTL) {
      if (!rtlStyle) {
        rtlStyle = document.createElement('style');
        rtlStyle.id = 'rtl-override-style';
        document.head.appendChild(rtlStyle);
      }
      rtlStyle.textContent = `
        /* ─── RTL Overrides for Urdu ─── */
        [dir="rtl"] body,
        [dir="rtl"] * {
          direction: rtl !important;
          text-align: right !important;
        }
        [dir="rtl"] .nav-links,
        [dir="rtl"] .nav-icons,
        [dir="rtl"] .doctor-card,
        [dir="rtl"] .appt-card-top,
        [dir="rtl"] .appt-detail-row,
        [dir="rtl"] .doc-info,
        [dir="rtl"] .doc-meta,
        [dir="rtl"] .report-card,
        [dir="rtl"] .stat-card,
        [dir="rtl"] .cal-header,
        [dir="rtl"] .cal-days-header,
        [dir="rtl"] .form-group,
        [dir="rtl"] .auth-desktop-grid,
        [dir="rtl"] .identity-cards,
        [dir="rtl"] .services-grid,
        [dir="rtl"] .features-grid,
        [dir="rtl"] .credibility-list {
          direction: rtl !important;
        }
        [dir="rtl"] .nav-links { flex-direction: row-reverse !important; }
        [dir="rtl"] .doc-fee { text-align: left !important; }
        [dir="rtl"] .appt-status { text-align: left !important; }
        [dir="rtl"] input, [dir="rtl"] select, [dir="rtl"] textarea {
          text-align: right !important;
          direction: rtl !important;
        }
        [dir="rtl"] .btn-primary, [dir="rtl"] .btn-outline,
        [dir="rtl"] .btn-nav-cta, [dir="rtl"] button {
          text-align: center !important;
        }
        [dir="rtl"] .fa, [dir="rtl"] .fas, [dir="rtl"] .far, [dir="rtl"] .fab {
          margin-left: 6px !important;
          margin-right: 0 !important;
        }
        [dir="rtl"] .cal-grid { direction: ltr !important; }
        [dir="rtl"] .time-slot { text-align: center !important; }
        [dir="rtl"] .bottom-nav { direction: ltr !important; }
        [dir="rtl"] .splash-logo { direction: rtl !important; text-align: center !important; }
        
        /* Hide Google Translate bar */
        .goog-te-banner-frame, .skiptranslate { display: none !important; }
        body { top: 0 !important; }
      `;
    } else {
      if (rtlStyle) rtlStyle.textContent = `
        .goog-te-banner-frame, .skiptranslate { display: none !important; }
        body { top: 0 !important; }
      `;
    }
  }

  // ─── Language Switch ──────────────────────────────────────────────────────
  function switchLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) lang = 'en';
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    applyDirection(lang);

    if (lang === 'en') {
      // Reset to English - remove Google Translate cookie
      triggerGoogleTranslate('en');
      // Also remove the translation overlay
      const frame = document.querySelector('.goog-te-banner-frame');
      if (frame) frame.style.display = 'none';
      document.body.style.top = '0';
    } else {
      triggerGoogleTranslate(lang);
    }

    // Dispatch event for custom handlers
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    return true;
  }

  function getCurrentLang() {
    return currentLang;
  }

  // ─── Initialize ───────────────────────────────────────────────────────────
  function initI18n() {
    applyDirection(currentLang);
    initGoogleTranslate();
  }

  // Expose globally
  window.i18n = {
    switchLanguage,
    getCurrentLang,
    init: initI18n,
    SUPPORTED_LANGS,
    RTL_LANGS
  };

  // Override setLanguage from patient app
  window.setLanguage = function(lang) {
    switchLanguage(lang);
  };

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n);
  } else {
    initI18n();
  }
})();
