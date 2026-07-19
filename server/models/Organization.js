import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        // Billing state. The organization is the billing entity, not the user —
        // owners can change without the subscription moving.
        //
        // Everything here is a mirror of Stripe, written only by the webhook.
        // Stripe is the source of truth; treating our copy as authoritative is
        // how apps end up granting access to someone who cancelled.
        stripeCustomerId: { type: String, index: true },
        stripeSubscriptionId: { type: String, index: true },

        // Which tier they bought. Null means they have never subscribed.
        plan: {
            type: String,
            enum: ['starter', 'pro', 'enterprise', null],
            default: null,
        },

        // Mirrors Stripe's subscription status verbatim rather than collapsing
        // it to a boolean, so dunning states stay distinguishable from a real
        // cancellation.
        subscriptionStatus: {
            type: String,
            enum: [
                'active', 'trialing', 'past_due', 'canceled',
                'incomplete', 'incomplete_expired', 'unpaid', 'paused', null,
            ],
            default: null,
        },

        currentPeriodEnd: { type: Date },
        cancelAtPeriodEnd: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export default mongoose.model('Organization', organizationSchema);