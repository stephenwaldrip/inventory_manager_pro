// The plan catalog. Limits live here, never on the client — the client may
// hide a button, but the server is what actually refuses the write.
//
// Stripe holds one Product per tier (Starter, Pro, Enterprise) with a monthly
// and an annual Price attached. Tiers must be separate Products: Checkout and
// invoices show the Product name on each line item, so sharing one Product
// across tiers makes every line read the same and customers can't tell plans
// apart.
//
// Price IDs come from the environment so the same code runs against a test
// sandbox and live without a rebuild.

const UNLIMITED = Infinity;

export const PLANS = {
  starter: {
    key: 'starter',
    name: 'Starter',
    blurb: 'For a small team getting organised.',
    amounts: { month: 1900, year: 19000 },
    limits: { users: 3, materials: 500 },
    prices: {
      month: process.env.STRIPE_PRICE_STARTER_MONTH,
      year: process.env.STRIPE_PRICE_STARTER_YEAR,
    },
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    blurb: 'For growing teams that need room to move.',
    amounts: { month: 4900, year: 49000 },
    limits: { users: 15, materials: UNLIMITED },
    prices: {
      month: process.env.STRIPE_PRICE_PRO_MONTH,
      year: process.env.STRIPE_PRICE_PRO_YEAR,
    },
  },
  enterprise: {
    key: 'enterprise',
    name: 'Enterprise',
    blurb: 'Unlimited everything.',
    amounts: { month: 9900, year: 99000 },
    limits: { users: UNLIMITED, materials: UNLIMITED },
    prices: {
      month: process.env.STRIPE_PRICE_ENTERPRISE_MONTH,
      year: process.env.STRIPE_PRICE_ENTERPRISE_YEAR,
    },
  },
};

export const PLAN_KEYS = Object.keys(PLANS);

export const isValidPlan = (key) => Object.prototype.hasOwnProperty.call(PLANS, key);

export const isValidInterval = (interval) => interval === 'month' || interval === 'year';

// Maps a Stripe Price back to a tier, so a webhook can tell us what someone
// actually bought without trusting anything the client sent.
export const planForPriceId = (priceId) => {
  if (!priceId) return null;
  for (const plan of Object.values(PLANS)) {
    if (plan.prices.month === priceId || plan.prices.year === priceId) return plan;
  }
  return null;
};

// An org with no subscription still has limits — otherwise a lapsed account
// could be topped up with data it never paid for. Falls back to the smallest
// tier's ceiling.
export const limitsFor = (planKey) => (PLANS[planKey] || PLANS.starter).limits;

export { UNLIMITED };
