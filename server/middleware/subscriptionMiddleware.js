import Organization from '../models/Organization.js';
import { limitsFor, UNLIMITED } from '../config/plans.js';

// Statuses that still entitle an org to write. past_due is deliberately
// included: Stripe is still retrying the card, and locking someone out on the
// first failed charge punishes an expired card the same as a refusal to pay.
const WRITING_STATUSES = new Set(['active', 'trialing', 'past_due']);

export const hasWriteAccess = (org) => {
  if (!org || !WRITING_STATUSES.has(org.subscriptionStatus)) return false;

  // A signup trial is ours, not Stripe's: no subscription exists to expire it,
  // so nothing would ever move it off 'trialing'. Enforce the end date here or
  // the free trial silently becomes a free forever.
  //
  // Only applied when Stripe knows nothing about this org. For a real
  // subscription, status is authoritative and currentPeriodEnd is just the
  // renewal date — a webhook that lands late must not lock a paying customer out.
  if (!org.stripeSubscriptionId) {
    return Boolean(org.currentPeriodEnd && org.currentPeriodEnd.getTime() > Date.now());
  }

  return true;
};

// Blocks writes for an org without a live subscription while leaving reads
// alone, so a lapsed customer can still see and export their own data.
//
// Mount on mutating routes only. 402 is the signal the client uses to show the
// resubscribe banner, so it must not be reused for anything else.
export const requireActiveSubscription = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.tenantId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    if (hasWriteAccess(org)) {
      req.organization = org;
      return next();
    }

    return res.status(402).json({
      message: 'Your subscription is not active. Resubscribe to make changes.',
      subscriptionRequired: true,
      plan: org.plan,
      subscriptionStatus: org.subscriptionStatus,
    });
  } catch (err) {
    console.error('Subscription check failed:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Refuses a write that would push the org past its tier's ceiling. Counting is
// done server-side against the live collection rather than a stored counter,
// which cannot drift.
export const enforceLimit = (resource, countDocuments) => async (req, res, next) => {
  try {
    const org = req.organization || (await Organization.findById(req.tenantId));
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const limit = limitsFor(org.plan)[resource];
    if (limit === UNLIMITED) return next();

    const used = await countDocuments(req.tenantId);
    if (used >= limit) {
      return res.status(403).json({
        message: `Your plan allows ${limit} ${resource}. Upgrade to add more.`,
        planLimitReached: true,
        resource,
        limit,
        used,
      });
    }

    next();
  } catch (err) {
    console.error('Limit check failed:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
