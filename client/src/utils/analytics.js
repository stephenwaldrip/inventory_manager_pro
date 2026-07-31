import ReactGA from 'react-ga4';

const GA_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;

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

export function trackSubscription() {
  if (!GA_ID || !initialized) return;
  ReactGA.event({ category: 'billing', action: 'subscription_completed' });
}