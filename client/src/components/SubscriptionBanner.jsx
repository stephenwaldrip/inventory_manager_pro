import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';

// Explains a read-only lockout up front, rather than leaving someone to
// discover it by having a save fail. Shown on every page, so the explanation
// is wherever they hit the wall.
function SubscriptionBanner() {
  const [subscription, setSubscription] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    axiosInstance
      .get('/billing/subscription')
      .then((res) => {
        if (!cancelled) setSubscription(res.data);
      })
      .catch(() => {
        // A failure here must not break the page it sits above.
        if (!cancelled) setSubscription(null);
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (!subscription) return null;

  // canWrite comes from the same function the write middleware uses, so the
  // banner cannot disagree with what the server actually allows.
  const locked = subscription.canWrite === false;
  const failing = !locked && subscription.status === 'past_due';

  // Trials are surfaced only near the end, so the banner doesn't nag from day one.
  const trialEndsSoon =
    !locked &&
    subscription.status === 'trialing' &&
    subscription.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd) - Date.now() < 3 * 24 * 60 * 60 * 1000;

  if (!locked && !failing && !trialEndsSoon) return null;
  // The billing page states all of this itself, in more detail.
  if (location.pathname === '/billing') return null;

  const tone = locked
    ? { backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b' }
    : { backgroundColor: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' };

  let message;
  if (locked) {
    message = 'Your subscription has ended. You can still view and export your data, but changes are disabled.';
  } else if (failing) {
    message = "We couldn't take your last payment. Update your card to avoid losing access.";
  } else {
    const days = Math.max(
      0,
      Math.ceil((new Date(subscription.currentPeriodEnd) - Date.now()) / (24 * 60 * 60 * 1000))
    );
    message = `Your free trial ends in ${days} day${days === 1 ? '' : 's'}.`;
  }

  return (
    <div style={{ ...tone, borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '14px' }}>{message}</span>
      <Link
        to="/billing"
        style={{ padding: '8px 14px', backgroundColor: locked ? '#dc2626' : '#f59e0b', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}
      >
        {locked ? 'Resubscribe' : 'Manage billing'}
      </Link>
    </div>
  );
}

export default SubscriptionBanner;
