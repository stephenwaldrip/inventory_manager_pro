// Reports incomplete configuration at boot, in one place.
//
// Every optional integration here degrades quietly by design: no Stripe key
// means billing routes answer "not configured", no Resend key means invites
// are skipped. That is the right runtime behaviour, but it makes a half
// configured deploy look completely healthy — the gap only surfaces when a
// customer hits it. This prints the gap into the startup logs instead.
//
// Fatal vs. warning is the distinction: fatal means the app cannot serve a
// correct response to anyone, warning means one feature is off.

const FATAL = [
  ['MONGO_URI', 'no database connection'],
  ['JWT_SECRET', 'cannot sign or verify auth tokens'],
];

const STRIPE_PRICES = [
  'STRIPE_PRICE_STARTER_MONTH',
  'STRIPE_PRICE_STARTER_YEAR',
  'STRIPE_PRICE_PRO_MONTH',
  'STRIPE_PRICE_PRO_YEAR',
  'STRIPE_PRICE_ENTERPRISE_MONTH',
  'STRIPE_PRICE_ENTERPRISE_YEAR',
];

const missing = (name) => !process.env[name];

const checkEnv = () => {
  const fatal = FATAL.filter(([name]) => missing(name));
  if (fatal.length) {
    for (const [name, effect] of fatal) {
      console.error(`FATAL: ${name} is not set — ${effect}.`);
    }
    process.exit(1);
  }

  if (!process.env.CLIENT_URL) {
    // Every emailed link and both Checkout redirect URLs are built from this,
    // so an unset value ships literal "undefined/..." links to customers.
    console.warn('WARN: CLIENT_URL is not set — email links and Stripe redirects will be broken.');
  }

  if (missing('STRIPE_SECRET_KEY')) {
    console.warn('WARN: STRIPE_SECRET_KEY is not set — billing is disabled; all billing routes return 503.');
  } else {
    // A key without a webhook secret is the dangerous shape: Checkout succeeds
    // and takes the customer's money, then the event that would grant access is
    // refused. Money in, no product.
    if (missing('STRIPE_WEBHOOK_SECRET')) {
      console.error(
        'WARN: STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is not — ' +
        'checkout will succeed and subscriptions will NEVER be applied.'
      );
    }

    const missingPrices = STRIPE_PRICES.filter(missing);
    if (missingPrices.length) {
      console.warn(`WARN: no price ID configured for: ${missingPrices.join(', ')} — those plans cannot be purchased.`);
    }

    if (process.env.STRIPE_SECRET_KEY.startsWith('sk_test') || process.env.STRIPE_SECRET_KEY.startsWith('rk_test')) {
      console.warn('WARN: Stripe is in TEST mode — no real payment will be taken.');
    }
  }

  if (missing('RESEND_API_KEY')) {
    console.warn('WARN: RESEND_API_KEY is not set — no email will be sent (verification, invites, password reset).');
  }
};

export default checkEnv;
