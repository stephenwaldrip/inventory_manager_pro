import ReactGA from 'react-ga4';

const GA_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;

// Google Ads conversion for a completed subscription (Purchase action).
const ADS_CONVERSION_SEND_TO = 'AW-18375556132/mxltCO_stt0cEKT4krpE';

let initialized = false;

export function initGA() {
  if (!GA_ID) return;
  if (initialized) return;
  ReactGA.initialize(GA_ID);
  initialized = true;
}

export function trackPageview(path) {
  if (!GA_ID || !initialized) return;
  ReactGA.send({ hitType: 'pageview', page: path });
}

export function trackEvent(category, action, label) {
  if (!GA_ID || !initialized) return;
  ReactGA.event({ category, action, ...(label ? { label } : {}) });
}

// Fire the Google Ads conversion. Independent of react-ga4 — it relies on the
// gtag loaded in index.html, so it must not be gated behind GA_ID/initialized.
function trackAdsConversion(value, currency = 'USD') {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', 'conversion', {
    send_to: ADS_CONVERSION_SEND_TO,
    ...(value != null ? { value, currency } : {}),
  });
}

export function trackSubscription(value) {
  // GA4 event (only when react-ga4 is up).
  if (GA_ID && initialized) {
    ReactGA.event({ category: 'billing', action: 'subscription_completed' });
  }
  // Google Ads conversion (fires regardless of react-ga4 state).
  trackAdsConversion(value);
}