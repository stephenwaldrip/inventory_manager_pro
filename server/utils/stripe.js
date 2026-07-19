import Stripe from 'stripe';

// A restricted key (rk_) is the default here rather than a secret key: this
// integration only needs Checkout, Billing and Customer Portal scopes, and a
// leaked rk_ cannot be used to move money or read the whole account.
const key = process.env.STRIPE_SECRET_KEY;

// Pin the API version so a Stripe-side upgrade can't silently change response
// shapes underneath us.
export const stripe = key
  ? new Stripe(key, { apiVersion: '2026-06-24.dahlia' })
  : null;

export const stripeEnabled = () => Boolean(stripe);

// Tags Checkout Sessions so flows can be compared in the Dashboard. The suffix
// is fixed rather than random per-call: a stable label is what makes the
// grouping useful.
export const INTEGRATION_IDENTIFIER = 'imp-checkout-qkzrvwmt';

export default stripe;
