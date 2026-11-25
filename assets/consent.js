// Analytics consent banner and conditional Google Analytics (gtag.js) loader.
const GA_ID = 'G-BZ4EJZ20FJ';
const CONSENT_KEY = 'eee_analytics_consent';

let gtagLoaded = false;
let bannerEl = null;

function loadGtag() {
  // Re-enable analytics even if gtag was loaded by an earlier Accept.
  window[`ga-disable-${GA_ID}`] = false;
  if (gtagLoaded) return;
  gtagLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    anonymize_ip: true,
    page_path: location.pathname + location.search,
    send_page_view: true,
  });

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
}

function removeBanner() {
  if (bannerEl && bannerEl.parentNode) {
    bannerEl.parentNode.removeChild(bannerEl);
  }
  bannerEl = null;
}

function showBanner() {
  if (bannerEl) {
    bannerEl.focus();
    return;
  }

  bannerEl = document.createElement('aside');
  bannerEl.className = 'consent-bar';
  bannerEl.setAttribute('aria-label', 'Analytics cookie consent');
  bannerEl.tabIndex = -1;

  const p = document.createElement('p');
  p.appendChild(document.createTextNode('We use privacy-friendly Google Analytics (IP anonymized) to see which club pages help students most. '));
  const link = document.createElement('a');
  link.href = 'privacy.html';
  link.textContent = 'Privacy policy';
  p.appendChild(link);
  p.appendChild(document.createTextNode('.'));

  const actions = document.createElement('div');
  actions.className = 'consent-actions';

  const declineBtn = document.createElement('button');
  declineBtn.type = 'button';
  declineBtn.className = 'btn ghost sm';
  declineBtn.textContent = 'Decline';
  declineBtn.addEventListener('click', () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'declined');
    } catch (_e) { /* storage disabled */ }
    window[`ga-disable-${GA_ID}`] = true;
    removeBanner();
    window.dispatchEvent(new Event('eee:consent-decided'));
  });

  const acceptBtn = document.createElement('button');
  acceptBtn.type = 'button';
  acceptBtn.className = 'btn sm';
  acceptBtn.textContent = 'Accept';
  acceptBtn.addEventListener('click', () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch (_e) { /* storage disabled */ }
    removeBanner();
    loadGtag();
    window.dispatchEvent(new Event('eee:consent-decided'));
  });

  actions.append(declineBtn, acceptBtn);
  bannerEl.append(p, actions);
  document.body.appendChild(bannerEl);
}

export function initConsent() {
  let choice = null;
  try {
    choice = localStorage.getItem(CONSENT_KEY);
  } catch (_e) {
    choice = null;
  }

  if (choice === 'accepted') {
    loadGtag();
  } else if (choice === 'declined') {
    window[`ga-disable-${GA_ID}`] = true;
  } else {
    showBanner();
  }
}

export function openConsentBanner() {
  showBanner();
  if (bannerEl) bannerEl.focus();
}

window.EEEConsent = { open: openConsentBanner };
