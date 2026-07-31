// Fires the subscription conversion event once, when the billing page loads in
// its success state (?checkout=success — the success_url your Stripe checkout
// handler redirects to).
//
// Use it from BillingPage instead of calling trackSubscription() inline:
//   import { useCheckoutConversion } from '../hooks/useCheckoutConversion';
//   ...
//   useCheckoutConversion();
//
// A ref guards against double-firing on re-render. Reads the param from
// react-router's location so it stays correct under hash routing (likely for
// the Capacitor build).

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackSubscription } from '../utils/analytics';

export function useCheckoutConversion() {
  const location = useLocation();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const params = new URLSearchParams(location.search);
    if (params.get('checkout') === 'success') {
      trackSubscription();
      fired.current = true;
    }
  }, [location.search]);
}