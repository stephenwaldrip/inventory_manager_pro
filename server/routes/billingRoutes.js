import express from 'express';
import Organization from '../models/Organization.js';
import { protect, superAdminOnly } from '../middleware/authMiddleware.js';
import { hasWriteAccess } from '../middleware/subscriptionMiddleware.js';
import { stripe, stripeEnabled, INTEGRATION_IDENTIFIER } from '../utils/stripe.js';
import { PLANS, isValidPlan, isValidInterval, planForPriceId } from '../config/plans.js';

const router = express.Router();

const notConfigured = (res) =>
  res.status(503).json({ message: 'Billing is not configured on this server' });

// Public: the pricing table. Amounts and limits come from the same catalog the
// server enforces, so the page can never advertise a limit that isn't real.
router.get('/plans', (req, res) => {
  res.json(
    Object.values(PLANS).map(({ key, name, blurb, amounts, limits }) => ({
      key,
      name,
      blurb,
      amounts,
      limits: {
        users: limits.users === Infinity ? null : limits.users,
        materials: limits.materials === Infinity ? null : limits.materials,
      },
    }))
  );
});

// The current org's billing state, for the banner and the billing page.
router.get('/subscription', protect, async (req, res) => {
  try {
    const org = await Organization.findById(req.tenantId).select(
      'name plan subscriptionStatus currentPeriodEnd cancelAtPeriodEnd stripeSubscriptionId'
    );
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    res.json({
      plan: org.plan,
      status: org.subscriptionStatus,
      currentPeriodEnd: org.currentPeriodEnd,
      cancelAtPeriodEnd: org.cancelAtPeriodEnd,
      // Reported rather than left for the client to re-derive. An expired trial
      // still reads as status 'trialing', so any client-side reimplementation of
      // the rule drifts from the middleware that actually enforces it.
      canWrite: hasWriteAccess(org),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Starts Checkout. Only the owner can commit the org to a bill.
router.post('/checkout', protect, superAdminOnly, async (req, res) => {
  if (!stripeEnabled()) return notConfigured(res);

  const { plan, interval = 'month' } = req.body;

  // The client sends a tier name, never a price ID — otherwise anyone could
  // post the ID of a cheaper price and buy the top tier for it.
  if (!isValidPlan(plan)) return res.status(400).json({ message: 'Unknown plan' });
  if (!isValidInterval(interval)) return res.status(400).json({ message: 'Unknown billing interval' });

  const priceId = PLANS[plan].prices[interval];
  if (!priceId) {
    return res.status(503).json({ message: `No ${interval}ly price configured for the ${plan} plan` });
  }

  try {
    const org = await Organization.findById(req.tenantId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    // Reuse the customer across subscriptions so billing history stays in one
    // place instead of fragmenting across duplicate customers.
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: org.name,
        metadata: { organizationId: String(org._id) },
      });
      customerId = customer.id;
      org.stripeCustomerId = customerId;
      await org.save();
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // payment_method_types is deliberately omitted so Stripe can offer every
      // eligible method from Dashboard settings. Hardcoding ['card'] would lock
      // out methods that convert better.
      allow_promotion_codes: true,
      client_reference_id: String(org._id),
      // The webhook trusts this over anything the browser reports back.
      subscription_data: { metadata: { organizationId: String(org._id) } },
      integration_identifier: INTEGRATION_IDENTIFIER,
      success_url: `${process.env.CLIENT_URL}/billing?checkout=success`,
      cancel_url: `${process.env.CLIENT_URL}/billing?checkout=cancelled`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout session failed:', err.message);
    res.status(502).json({ message: 'Could not start checkout' });
  }
});

// Hands off to the Customer Portal for upgrades, downgrades, cancellation and
// card updates, rather than rebuilding all of that badly.
router.post('/portal', protect, superAdminOnly, async (req, res) => {
  if (!stripeEnabled()) return notConfigured(res);

  try {
    const org = await Organization.findById(req.tenantId);
    if (!org?.stripeCustomerId) {
      return res.status(409).json({ message: 'This organization has no billing account yet' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${process.env.CLIENT_URL}/billing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Portal session failed:', err.message);
    res.status(502).json({ message: 'Could not open the billing portal' });
  }
});

// Copies a Stripe subscription onto the org. Every field we gate on comes from
// the Stripe object, never from the client.
const applySubscription = async (subscription) => {
  const organizationId =
    subscription.metadata?.organizationId ||
    (await Organization.findOne({ stripeCustomerId: subscription.customer }))?._id;

  if (!organizationId) {
    console.warn('Subscription with no organization:', subscription.id);
    return;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id;
  const plan = planForPriceId(priceId);

  // A subscription that has ended entitles nothing, whatever tier it was.
  const periodEnd = subscription.items?.data?.[0]?.current_period_end;

  await Organization.findByIdAndUpdate(organizationId, {
    stripeCustomerId: subscription.customer,
    stripeSubscriptionId: subscription.id,
    plan: plan?.key ?? null,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  });
};

// Stripe calls this. Exported rather than mounted on the router because it
// needs a raw body parser and must be registered before express.json() —
// signature verification hashes the exact bytes Stripe sent, so any JSON
// round-trip before this point invalidates every signature.
export const webhookHandler = async (req, res) => {
  if (!stripeEnabled()) return notConfigured(res);

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set — refusing unverified webhooks');
    return res.status(503).json({ message: 'Webhook not configured' });
  }

  let event;
  try {
    // Unverified, this endpoint would let anyone grant themselves a plan by
    // POSTing a fake subscription event.
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret);
  } catch (err) {
    console.warn('Rejected webhook with a bad signature:', err.message);
    return res.status(400).json({ message: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await applySubscription(event.data.object);
        break;

      case 'checkout.session.completed': {
        // Checkout only tells us a purchase happened; re-read the subscription
        // so the stored state matches Stripe rather than a point-in-time echo.
        const session = event.data.object;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await applySubscription(subscription);
        }
        break;
      }

      default:
        break; // Unhandled types are still acked, or Stripe retries forever.
    }

    res.json({ received: true });
  } catch (err) {
    // A 500 makes Stripe retry, which is what we want for a transient failure.
    console.error('Webhook handling failed:', err.message);
    res.status(500).json({ message: 'Webhook handling failed' });
  }
};

export default router;
