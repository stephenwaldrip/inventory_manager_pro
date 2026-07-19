// Integration tests for subscription gating, plan limits and the Stripe
// webhook. Runs against an in-memory MongoDB and never reaches Stripe: the
// only Stripe code exercised is signature verification, which is local crypto.
import { test, before, after, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.CLIENT_URL = 'http://localhost:3000';
delete process.env.RESEND_API_KEY;

// A syntactically valid test key so the Stripe SDK constructs. No request ever
// leaves the process; constructEvent verifies signatures locally.
process.env.STRIPE_SECRET_KEY = 'rk_test_' + 'x'.repeat(24);
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_' + 'y'.repeat(32);
process.env.STRIPE_PRICE_STARTER_MONTH = 'price_starter_month';
process.env.STRIPE_PRICE_PRO_MONTH = 'price_pro_month';

const { default: createApp } = await import('../app.js');
const { default: User } = await import('../models/User.js');
const { default: Organization } = await import('../models/Organization.js');
const { default: Material } = await import('../models/Material.js');

let mongod;
let app;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Organization.syncIndexes();
  await User.syncIndexes();
  app = createApp();
});

after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) await c.deleteMany({});
});

async function registerOrg(overrides = {}) {
  const body = {
    name: 'Owner',
    email: `owner-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'supersecret',
    organizationName: `Org ${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body);
  await User.updateOne({ email: body.email }, { emailVerified: true });
  return { token: res.body.token, email: body.email };
}

const orgOf = async (email) => {
  const user = await User.findOne({ email });
  return Organization.findById(user.tenantId);
};

describe('trial access', () => {
  test('a new organization starts on a trial and can write', async () => {
    const { token, email } = await registerOrg();

    const org = await orgOf(email);
    assert.equal(org.subscriptionStatus, 'trialing');
    assert.ok(org.currentPeriodEnd > new Date());

    const res = await request(app)
      .post('/api/materials')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bolt', type: 'Fastener', quantity: 10 });

    assert.equal(res.status, 201);
  });

  test('an expired trial blocks writes but still allows reads', async () => {
    const { token, email } = await registerOrg();
    const org = await orgOf(email);

    // Seed a material while still on trial, so there is something to read back.
    await Material.create({ name: 'Existing', type: 'Fastener', tenantId: org._id, quantity: 1 });

    await Organization.findByIdAndUpdate(org._id, {
      currentPeriodEnd: new Date(Date.now() - 1000),
    });

    const write = await request(app)
      .post('/api/materials')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Blocked', type: 'Fastener', quantity: 1 });

    assert.equal(write.status, 402);
    assert.equal(write.body.subscriptionRequired, true);
    assert.equal(await Material.countDocuments({ name: 'Blocked' }), 0);

    const read = await request(app)
      .get('/api/materials')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(read.status, 200, 'a lapsed org must still reach its own data');
    assert.equal(read.body.length, 1);
  });

  test('a paid subscription is not locked out by a stale period end', async () => {
    const { token, email } = await registerOrg();
    const org = await orgOf(email);

    // Status is authoritative once Stripe owns the subscription; a period end
    // in the past just means a renewal webhook has not landed yet.
    await Organization.findByIdAndUpdate(org._id, {
      stripeSubscriptionId: 'sub_123',
      subscriptionStatus: 'active',
      plan: 'pro',
      currentPeriodEnd: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .post('/api/materials')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Still Allowed', type: 'Fastener', quantity: 1 });

    assert.equal(res.status, 201);
  });

  test('past_due keeps write access while Stripe retries the card', async () => {
    const { token, email } = await registerOrg();
    const org = await orgOf(email);
    await Organization.findByIdAndUpdate(org._id, {
      stripeSubscriptionId: 'sub_123',
      subscriptionStatus: 'past_due',
      plan: 'starter',
    });

    const res = await request(app)
      .post('/api/materials')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Grace', type: 'Fastener', quantity: 1 });

    assert.equal(res.status, 201);
  });

  test('a cancelled subscription blocks writes', async () => {
    const { token, email } = await registerOrg();
    const org = await orgOf(email);
    await Organization.findByIdAndUpdate(org._id, {
      stripeSubscriptionId: 'sub_123',
      subscriptionStatus: 'canceled',
      plan: 'pro',
    });

    const res = await request(app)
      .post('/api/materials')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nope', type: 'Fastener', quantity: 1 });

    assert.equal(res.status, 402);
  });
});

describe('plan limits', () => {
  test('the starter seat limit refuses the fourth user', async () => {
    const { token, email } = await registerOrg();
    const org = await orgOf(email);
    await Organization.findByIdAndUpdate(org._id, {
      stripeSubscriptionId: 'sub_123',
      subscriptionStatus: 'active',
      plan: 'starter', // 3 users
    });

    // The owner is seat 1, so two invites fit and the third does not.
    for (const n of [2, 3]) {
      const ok = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `User ${n}`, email: `user${n}@example.com`, role: 'user' });
      assert.equal(ok.status, 201, `seat ${n} should fit`);
    }

    const over = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Too Many', email: 'toomany@example.com', role: 'user' });

    assert.equal(over.status, 403);
    assert.equal(over.body.planLimitReached, true);
    assert.equal(over.body.limit, 3);
    assert.equal(await User.countDocuments({ email: 'toomany@example.com' }), 0);
  });

  test('an unlimited tier does not cap seats', async () => {
    const { token, email } = await registerOrg();
    const org = await orgOf(email);
    await Organization.findByIdAndUpdate(org._id, {
      stripeSubscriptionId: 'sub_123',
      subscriptionStatus: 'active',
      plan: 'enterprise',
    });

    for (const n of [2, 3, 4, 5]) {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `User ${n}`, email: `ent${n}@example.com`, role: 'user' });
      assert.equal(res.status, 201, `seat ${n} should fit on enterprise`);
    }
  });
});

describe('billing endpoints', () => {
  test('the plan catalog is public and never exposes price IDs', async () => {
    const res = await request(app).get('/api/billing/plans');

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 3);
    assert.deepEqual(res.body.map((p) => p.key), ['starter', 'pro', 'enterprise']);
    assert.equal(JSON.stringify(res.body).includes('price_'), false, 'price IDs must not leak');
    // Unlimited is serialised as null rather than Infinity, which JSON drops.
    assert.equal(res.body[2].limits.users, null);
  });

  test('only a superadmin can start checkout', async () => {
    const { token, email } = await registerOrg();
    const org = await orgOf(email);
    await User.create({
      name: 'Plain', email: 'plain@example.com', password: 'supersecret',
      role: 'user', tenantId: org._id, emailVerified: true,
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'plain@example.com', password: 'supersecret' });

    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ plan: 'pro', interval: 'month' });

    assert.equal(res.status, 403);
    assert.ok(token);
  });

  test('checkout rejects an unknown plan before reaching Stripe', async () => {
    const { token } = await registerOrg();

    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'free-forever', interval: 'month' });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /unknown plan/i);
  });

  test('checkout rejects an unknown interval', async () => {
    const { token } = await registerOrg();

    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'pro', interval: 'decade' });

    assert.equal(res.status, 400);
  });

  test('subscription state is reported for the caller organization', async () => {
    const { token, email } = await registerOrg();
    const org = await orgOf(email);
    await Organization.findByIdAndUpdate(org._id, {
      stripeSubscriptionId: 'sub_1', subscriptionStatus: 'active', plan: 'pro',
    });

    const res = await request(app)
      .get('/api/billing/subscription')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.plan, 'pro');
    assert.equal(res.body.status, 'active');
  });
});

describe('stripe webhook', () => {
  // Mirrors Stripe's scheme so a correctly signed payload can be built without
  // the SDK's test helpers.
  const sign = (payload, secret = process.env.STRIPE_WEBHOOK_SECRET) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
    return `t=${timestamp},v1=${signature}`;
  };

  const subscriptionEvent = (organizationId, overrides = {}) =>
    JSON.stringify({
      id: 'evt_1',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_webhook',
          customer: 'cus_webhook',
          status: 'active',
          cancel_at_period_end: false,
          metadata: { organizationId: String(organizationId) },
          items: {
            data: [{
              price: { id: 'price_pro_month' },
              current_period_end: Math.floor(Date.now() / 1000) + 86400,
            }],
          },
          ...overrides,
        },
      },
    });

  test('an unsigned webhook is rejected', async () => {
    const res = await request(app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .send(subscriptionEvent(new mongoose.Types.ObjectId()));

    assert.equal(res.status, 400);
  });

  test('a webhook signed with the wrong secret is rejected', async () => {
    const payload = subscriptionEvent(new mongoose.Types.ObjectId());

    const res = await request(app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', sign(payload, 'whsec_' + 'z'.repeat(32)))
      .send(payload);

    assert.equal(res.status, 400);
  });

  test('a correctly signed subscription event updates the organization', async () => {
    const { email } = await registerOrg();
    const org = await orgOf(email);
    const payload = subscriptionEvent(org._id);

    const res = await request(app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', sign(payload))
      .send(payload);

    assert.equal(res.status, 200);

    const after = await Organization.findById(org._id);
    assert.equal(after.subscriptionStatus, 'active');
    assert.equal(after.plan, 'pro', 'plan is derived from the price, not the client');
    assert.equal(after.stripeSubscriptionId, 'sub_webhook');
    assert.equal(after.stripeCustomerId, 'cus_webhook');
  });

  test('a cancellation event revokes write access', async () => {
    const { token, email } = await registerOrg();
    const org = await orgOf(email);
    const payload = subscriptionEvent(org._id, { status: 'canceled' });

    await request(app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', sign(payload))
      .send(payload);

    assert.equal((await Organization.findById(org._id)).subscriptionStatus, 'canceled');

    const write = await request(app)
      .post('/api/materials')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'After Cancel', type: 'Fastener', quantity: 1 });

    assert.equal(write.status, 402);
  });
});

describe('entitlement reporting', () => {
  test('an expired trial reports canWrite false despite a trialing status', async () => {
    const { token, email } = await registerOrg();
    const org = await orgOf(email);
    await Organization.findByIdAndUpdate(org._id, {
      currentPeriodEnd: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .get('/api/billing/subscription')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    // The status alone would suggest they can still write, which is why the
    // client is given canWrite rather than re-deriving the rule.
    assert.equal(res.body.status, 'trialing');
    assert.equal(res.body.canWrite, false);
  });

  test('an active subscription reports canWrite true', async () => {
    const { token, email } = await registerOrg();
    const org = await orgOf(email);
    await Organization.findByIdAndUpdate(org._id, {
      stripeSubscriptionId: 'sub_1', subscriptionStatus: 'active', plan: 'pro',
    });

    const res = await request(app)
      .get('/api/billing/subscription')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.body.canWrite, true);
  });
});
