import { useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const money = (cents) => `$${(cents / 100).toFixed(0)}`;

// Copy for each Stripe status. Anything unmapped falls through to a neutral
// line rather than showing a raw status string to a customer.
const STATUS_COPY = {
  active: { tone: 'ok', text: 'Your subscription is active.' },
  trialing: { tone: 'ok', text: 'You are on a free trial.' },
  past_due: {
    tone: 'warn',
    text: "We couldn't take the last payment. Update your card to avoid losing access.",
  },
  canceled: { tone: 'bad', text: 'Your subscription has ended. Resubscribe to make changes.' },
  unpaid: { tone: 'bad', text: 'Your subscription is unpaid. Resubscribe to make changes.' },
  paused: { tone: 'warn', text: 'Your subscription is paused.' },
};

const TONES = {
  ok: { backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#15803d' },
  warn: { backgroundColor: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' },
  bad: { backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b' },
};

function BillingPage() {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [interval, setInterval] = useState('month');
  const [busy, setBusy] = useState('');

  const isOwner = user?.role === 'superadmin';

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      axiosInstance.get('/billing/plans'),
      axiosInstance.get('/billing/subscription'),
    ])
      .then(([planRes, subRes]) => {
        if (cancelled) return;
        setPlans(planRes.data);
        setSubscription(subRes.data);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load billing information.');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Checkout returns here with a query flag. Clear it after reporting, so a
  // refresh doesn't repeat the message.
  useEffect(() => {
    const outcome = searchParams.get('checkout');
    if (!outcome) return;

    if (outcome === 'success') {
      // Entitlement arrives by webhook, which may land after the redirect.
      toast.success('Payment received. Your plan will update momentarily.');
    } else if (outcome === 'cancelled') {
      toast.info?.('Checkout cancelled.');
    }

    searchParams.delete('checkout');
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subscribe = async (planKey) => {
    setBusy(planKey);
    try {
      const res = await axiosInstance.post('/billing/checkout', { plan: planKey, interval });
      // Full navigation, not a router push — Checkout is hosted by Stripe.
      window.location.assign(res.data.url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start checkout.');
      setBusy('');
    }
  };

  const openPortal = async () => {
    setBusy('portal');
    try {
      const res = await axiosInstance.post('/billing/portal');
      window.location.assign(res.data.url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open the billing portal.');
      setBusy('');
    }
  };

  const status = subscription?.status;
  // An expired trial still reports status 'trialing', so trust canWrite over
  // the raw status — otherwise a locked-out org is told it's still trialing.
  const lockedOut = subscription && subscription.canWrite === false;
  const copy = lockedOut
    ? {
        tone: 'bad',
        text:
          status === 'trialing'
            ? 'Your free trial has ended. Choose a plan to make changes again.'
            : 'Your subscription has ended. Choose a plan to make changes again.',
      }
    : STATUS_COPY[status];
  const renews = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : null;

  const card = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  };

  const button = (bg, disabled) => ({
    padding: '10px 16px',
    backgroundColor: disabled ? '#cbd5e1' : bg,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    width: '100%',
  });

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>Billing</h1>
        <p style={{ color: '#64748b', marginTop: '4px' }}>Manage your subscription and plan</p>
      </div>

      {copy && (
        <div style={{ ...TONES[copy.tone], borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '14px' }}>
            <strong>{copy.text}</strong>
            {renews && (
              <div style={{ marginTop: '4px', opacity: 0.85 }}>
                {subscription.cancelAtPeriodEnd ? 'Access ends' : 'Renews'} on {renews}
              </div>
            )}
          </div>
          {isOwner && subscription?.plan && (
            <button onClick={openPortal} disabled={busy === 'portal'} style={{ ...button('#0f172a', busy === 'portal'), width: 'auto' }}>
              {busy === 'portal' ? 'Opening…' : 'Manage billing'}
            </button>
          )}
        </div>
      )}

      {!isOwner && (
        <div style={{ ...card, marginBottom: '24px', color: '#64748b', fontSize: '14px' }}>
          Only the organization owner can change the subscription.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
        {['month', 'year'].map((option) => (
          <button
            key={option}
            onClick={() => setInterval(option)}
            style={{
              padding: '8px 20px',
              borderRadius: '999px',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: interval === option ? '#3b82f6' : 'white',
              color: interval === option ? 'white' : '#64748b',
            }}
          >
            {option === 'month' ? 'Monthly' : 'Annual'}
            {option === 'year' && <span style={{ marginLeft: '6px', fontSize: '12px' }}>2 months free</span>}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {plans.map((plan) => {
          const current = subscription?.plan === plan.key;
          return (
            <div
              key={plan.key}
              style={{
                ...card,
                border: current ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{plan.name}</h2>
                  {current && (
                    <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
                      Current
                    </span>
                  )}
                </div>
                <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>{plan.blurb}</p>
              </div>

              <div>
                <span style={{ fontSize: '30px', fontWeight: '700', color: '#1e293b' }}>
                  {money(plan.amounts[interval])}
                </span>
                <span style={{ color: '#64748b', fontSize: '14px' }}>
                  /{interval === 'month' ? 'mo' : 'yr'}
                </span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#475569', fontSize: '14px', display: 'grid', gap: '6px' }}>
                <li>✓ {plan.limits.users === null ? 'Unlimited' : `Up to ${plan.limits.users}`} users</li>
                <li>✓ {plan.limits.materials === null ? 'Unlimited' : `Up to ${plan.limits.materials}`} materials</li>
              </ul>

              <button
                onClick={() => subscribe(plan.key)}
                disabled={!isOwner || current || Boolean(busy)}
                style={{ ...button('#3b82f6', !isOwner || current || Boolean(busy)), marginTop: 'auto' }}
              >
                {current ? 'Current plan' : busy === plan.key ? 'Starting…' : 'Choose ' + plan.name}
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: '24px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
        Questions about billing?{' '}
        
          href="mailto:support@rhyamtechco.com?subject=Billing%20question"
          style={{ color: '#3b82f6', textDecoration: 'none' }}
        >
          Contact support
        </a>
      </p>
    </div>
  );
}

export default BillingPage;