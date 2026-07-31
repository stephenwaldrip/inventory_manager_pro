// Fires a GA pageview whenever the route changes.
//
// Call this once from a component inside the Router (Layout is the natural
// spot). It can't live above <Router> because it uses useLocation.
 
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageview } from '../utils/analytics';
 
export function usePageTracking() {
  const location = useLocation();
 
  useEffect(() => {
    trackPageview(location.pathname + location.search);
  }, [location]);
}
 