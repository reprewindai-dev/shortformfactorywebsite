// Cookie Consent Banner with Google Analytics Consent Mode
(function() {
  'use strict';

  const CONSENT_KEY = 'cookieConsent';
  let bannerEl = null;
  let resizeHandler = null;

  const consentGiven = localStorage.getItem(CONSENT_KEY);
  const shouldShowBanner = consentGiven !== 'accepted';

  if (!shouldShowBanner) {
    grantConsent();
    updateBannerVisibility(false);
  } else {
    if (consentGiven === 'declined') {
      denyConsent();
    }
    showConsentBanner();
  }

  window.SFFCookieConsent = {
    reset() {
      localStorage.removeItem(CONSENT_KEY);
      denyConsent();
      showConsentBanner();
    }
  };

  function showConsentBanner() {
    if (bannerEl) return;

    bannerEl = document.createElement('div');
    bannerEl.id = 'cookie-consent-banner';
    bannerEl.setAttribute('role', 'dialog');
    bannerEl.setAttribute('aria-live', 'polite');
    bannerEl.setAttribute('aria-label', 'Cookie consent banner');
    bannerEl.innerHTML = `
      <div class="cookie-consent-content">
        <p class="cookie-consent-text">
          We use cookies to analyze site traffic and improve your experience.
          <a href="/privacy" class="cookie-consent-link">Privacy Policy</a>
        </p>
        <div class="cookie-consent-buttons" role="group" aria-label="Cookie consent options">
          <button type="button" id="cookie-accept" class="cookie-btn cookie-btn-accept">Accept</button>
          <button type="button" id="cookie-decline" class="cookie-btn cookie-btn-decline">Decline</button>
        </div>
      </div>
    `;

    document.body.appendChild(bannerEl);
    requestAnimationFrame(() => updateBannerVisibility(true));

    resizeHandler = () => updateBannerVisibility(true);
    window.addEventListener('resize', resizeHandler, { passive: true });

    bannerEl.querySelector('#cookie-accept').addEventListener('click', acceptCookies);
    bannerEl.querySelector('#cookie-decline').addEventListener('click', declineCookies);
  }

  function acceptCookies() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    grantConsent();
    hideBanner();
  }

  function declineCookies() {
    localStorage.setItem(CONSENT_KEY, 'declined');
    denyConsent();
    hideBanner();
  }

  function hideBanner() {
    if (!bannerEl) {
      updateBannerVisibility(false);
      return;
    }

    bannerEl.style.opacity = '0';
    const bannerToRemove = bannerEl;
    bannerEl = null;
    setTimeout(() => {
      bannerToRemove.remove();
      updateBannerVisibility(false);
    }, 300);

    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
  }

  function updateBannerVisibility(visible) {
    const height = visible && bannerEl ? bannerEl.offsetHeight : 0;
    const detail = { visible, height };
    window.__cookieConsentVisibility = detail;
    window.dispatchEvent(new CustomEvent('cookie-consent:visibility', { detail }));
  }

  function grantConsent() {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted'
      });
    }
  }

  function denyConsent() {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied'
      });
    }
  }
})();
