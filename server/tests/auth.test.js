// Integration tests for the auth routes and the protect middleware.
// Uses Node's built-in test runner (native ESM) + supertest against an
// in-memory MongoDB, so nothing touches a real database or sends real email.
import { test, before, after, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

// Set env before importing the app so config reads the right values.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.CLIENT_URL = 'http://localhost:3000';
delete process.env.RESEND_API_KEY; // ensure sendEmail no-ops

const { default: createApp } = await import('../app.js');
const { default: User } = await import('../models/User.js');
const { default: Organization } = await import('../models/Organization.js');
const { default: Material } = await import('../models/Material.js');

let mongod;
let app;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Build declared indexes (e.g. the unique org slug) so constraints are enforced.
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

// Registers a fresh org+owner and returns { token, email }.
async function registerOrg(overrides = {}) {
  const body = {
    name: 'Owner',
    email: `owner-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'supersecret',
    organizationName: `Org ${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body);
  return { res, body };
}

// Registers an org and marks the owner's email confirmed, which is what the
// real flow requires before they can invite anyone. Tests that care about the
// verification gate itself use registerOrg directly.
async function registerVerifiedOrg(overrides = {}) {
  const result = await registerOrg(overrides);
  await User.updateOne({ email: result.body.email }, { emailVerified: true });
  return result;
}

describe('POST /api/auth/register', () => {
  test('creates an organization and superadmin owner, returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'supersecret',
      organizationName: 'Acme Widgets',
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.token, 'expected a JWT in the response');
    assert.equal(res.body.user.email, 'ada@example.com');
    assert.equal(res.body.user.role, 'superadmin');
    assert.equal(res.body.organization.slug, 'acme-widgets');

    const user = await User.findOne({ email: 'ada@example.com' });
    assert.equal(user.role, 'superadmin');
    // Password must be hashed, never stored in plaintext.
    assert.notEqual(user.password, 'supersecret');

    const org = await Organization.findOne({ slug: 'acme-widgets' });
    assert.ok(org);
    assert.equal(String(org.createdBy), String(user._id));
    assert.equal(String(user.tenantId), String(org._id));
  });

  test('rejects a duplicate email', async () => {
    await registerOrg({ email: 'dup@example.com' });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Two',
      email: 'dup@example.com',
      password: 'supersecret',
      organizationName: 'Another Org',
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /already exists/i);
  });

  test('rejects a password shorter than 8 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'short@example.com',
      password: 'abc',
      organizationName: 'Shorty',
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /at least 8/i);
  });

  test('requires an organization name', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'noorg@example.com',
      password: 'supersecret',
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /organization name/i);
  });

  test('rejects a non-string (NoSQL injection) email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: { $gt: '' },
      password: 'supersecret',
      organizationName: 'Injection Co',
    });
    assert.equal(res.status, 400);
  });

  test('enforces the unique org slug at the database level', async () => {
    await Organization.create({ name: 'First', slug: 'shared-slug' });
    await assert.rejects(
      () => Organization.create({ name: 'Second', slug: 'shared-slug' }),
      (err) => err.code === 11000, // MongoDB duplicate key error
    );
  });

  test('generates unique slugs when org names collide', async () => {
    const first = await request(app).post('/api/auth/register').send({
      email: 'a@example.com',
      password: 'supersecret',
      organizationName: 'Same Name',
    });
    const second = await request(app).post('/api/auth/register').send({
      email: 'b@example.com',
      password: 'supersecret',
      organizationName: 'Same Name',
    });
    assert.equal(first.body.organization.slug, 'same-name');
    assert.equal(second.body.organization.slug, 'same-name-1');
  });
});

describe('POST /api/auth/login', () => {
  test('logs in with correct credentials and returns a token', async () => {
    await registerOrg({ email: 'login@example.com', password: 'supersecret' });
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'supersecret',
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, 'login@example.com');
  });

  test('rejects a wrong password with 401', async () => {
    await registerOrg({ email: 'wrongpw@example.com', password: 'supersecret' });
    const res = await request(app).post('/api/auth/login').send({
      email: 'wrongpw@example.com',
      password: 'notthepassword',
    });
    assert.equal(res.status, 401);
    assert.match(res.body.message, /invalid email or password/i);
  });

  test('rejects an unknown user with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost@example.com',
      password: 'supersecret',
    });
    assert.equal(res.status, 401);
  });

  test('rejects missing credentials with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@example.com' });
    assert.equal(res.status, 401);
  });

  test('does not allow NoSQL operator injection to bypass login', async () => {
    await registerOrg({ email: 'target@example.com', password: 'supersecret' });
    const res = await request(app).post('/api/auth/login').send({
      email: { $gt: '' },
      password: { $gt: '' },
    });
    assert.equal(res.status, 401);
    assert.ok(!res.body.token);
  });

  test('blocks a suspended account with 403', async () => {
    await registerOrg({ email: 'suspended@example.com', password: 'supersecret' });
    await User.updateOne({ email: 'suspended@example.com' }, { active: false });
    const res = await request(app).post('/api/auth/login').send({
      email: 'suspended@example.com',
      password: 'supersecret',
    });
    assert.equal(res.status, 403);
    assert.match(res.body.message, /suspended/i);
  });
});

describe('password reset flow', () => {
  test('forgot-password returns a generic message for an unknown email', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({
      email: 'nobody@example.com',
    });
    assert.equal(res.status, 200);
    assert.match(res.body.message, /if an account exists/i);
  });

  test('forgot-password sets a reset token for a known user', async () => {
    await registerOrg({ email: 'reset@example.com', password: 'supersecret' });
    const res = await request(app).post('/api/auth/forgot-password').send({
      email: 'reset@example.com',
    });
    assert.equal(res.status, 200);
    const user = await User.findOne({ email: 'reset@example.com' });
    assert.ok(user.resetPasswordToken, 'expected a stored reset token hash');
    assert.ok(user.resetPasswordExpires > Date.now());
  });

  test('reset-password rejects a short password', async () => {
    const res = await request(app).post('/api/auth/reset-password/anytoken').send({
      password: 'abc',
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /at least 8/i);
  });

  test('reset-password rejects an invalid token', async () => {
    const res = await request(app).post('/api/auth/reset-password/badtoken').send({
      password: 'brandnewpassword',
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /invalid or has expired/i);
  });
});

describe('protect middleware', () => {
  test('rejects a request with no token', async () => {
    const res = await request(app).get('/api/materials');
    assert.equal(res.status, 401);
    assert.match(res.body.message, /no token/i);
  });

  test('rejects a request with a malformed/invalid token', async () => {
    const res = await request(app)
      .get('/api/materials')
      .set('Authorization', 'Bearer not-a-real-jwt');
    assert.equal(res.status, 401);
    assert.match(res.body.message, /token failed/i);
  });

  test('allows a request carrying a valid token', async () => {
    const { res: reg } = await registerOrg();
    const res = await request(app)
      .get('/api/materials')
      .set('Authorization', `Bearer ${reg.body.token}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });
});

describe('POST /api/users (admin invite)', () => {
  test('creates the user with an invite token and no admin-chosen password', async () => {
    const { res: reg } = await registerVerifiedOrg();

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ name: 'Invitee', email: 'invitee@example.com', role: 'user' });

    assert.equal(res.status, 201);

    const created = await User.findOne({ email: 'invitee@example.com' });
    assert.ok(created, 'user should exist');
    assert.ok(created.resetPasswordToken, 'invite token should be stored');
    // Stored as a sha256 hash, never the raw token.
    assert.match(created.resetPasswordToken, /^[a-f0-9]{64}$/);
    assert.ok(created.resetPasswordExpires > Date.now());
  });

  test('never returns the password or invite token hash', async () => {
    const { res: reg } = await registerVerifiedOrg();

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ name: 'Invitee', email: 'leak-check@example.com', role: 'user' });

    assert.equal(res.status, 201);
    assert.equal(res.body.user.password, undefined);
    assert.equal(res.body.user.resetPasswordToken, undefined);
    assert.equal(res.body.user.resetPasswordExpires, undefined);
  });

  test('the invited user cannot log in until the invite is accepted', async () => {
    const { res: reg } = await registerVerifiedOrg();
    await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ name: 'Invitee', email: 'nologin@example.com', role: 'user' });

    // No password was ever chosen, so nothing the caller supplies should work.
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nologin@example.com', password: 'supersecret' });

    assert.equal(res.status, 401);
  });

  test('accepting the invite sets a password and clears the token', async () => {
    const { res: reg } = await registerVerifiedOrg();
    await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ name: 'Invitee', email: 'accepts@example.com', role: 'user' });

    // The raw token only exists in the email, so drive the flow the way the
    // reset endpoint does: issue a known token against the same field.
    const rawToken = 'a'.repeat(64);
    const { hashToken } = await import('../utils/tokens.js');
    await User.updateOne(
      { email: 'accepts@example.com' },
      { resetPasswordToken: hashToken(rawToken), resetPasswordExpires: Date.now() + 60000 }
    );

    const accepted = await request(app)
      .post(`/api/auth/reset-password/${rawToken}`)
      .send({ password: 'brandnewpassword' });
    assert.equal(accepted.status, 200);

    const updated = await User.findOne({ email: 'accepts@example.com' });
    assert.equal(updated.resetPasswordToken, undefined);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'accepts@example.com', password: 'brandnewpassword' });
    assert.equal(login.status, 200);
    assert.ok(login.body.token);
  });
});

describe('email HTML escaping', () => {
  test('escapes interpolated values but not literal markup', async () => {
    const { html } = await import('../utils/html.js');
    const name = '<script>alert(1)</script>';
    const out = html`<p>Hello <strong>${name}</strong></p>`;

    assert.equal(
      out,
      '<p>Hello <strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong></p>'
    );
  });

  test('escapes attribute-breaking quotes', async () => {
    const { html } = await import('../utils/html.js');
    const url = 'http://x/"><img onerror=alert(1) src=x>';
    const out = html`<a href="${url}">go</a>`;

    assert.ok(!out.includes('<img'), 'must not emit an injected tag');
    assert.ok(out.includes('&quot;'));
  });

  test('renders null and undefined as empty, not as the literal words', async () => {
    const { html } = await import('../utils/html.js');
    assert.equal(html`<p>${undefined}${null}</p>`, '<p></p>');
  });
});

describe('POST /api/users/:id/resend-invite', () => {
  test('replaces the previous invite token', async () => {
    const { res: reg } = await registerVerifiedOrg();
    await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ name: 'Invitee', email: 'resend@example.com', role: 'user' });

    const before = await User.findOne({ email: 'resend@example.com' });

    const res = await request(app)
      .post(`/api/users/${before._id}/resend-invite`)
      .set('Authorization', `Bearer ${reg.body.token}`);

    // Email is a no-op in tests (no RESEND_API_KEY), so the handler reports
    // the send failure — but the token must still have been rotated.
    assert.equal(res.status, 502);

    const after = await User.findOne({ email: 'resend@example.com' });
    assert.notEqual(after.resetPasswordToken, before.resetPasswordToken);
    assert.ok(after.resetPasswordExpires > Date.now());
  });

  test('cannot resend an invite for another organization\'s user', async () => {
    const orgA = await registerVerifiedOrg({ email: 'ra-owner@example.com' });
    const orgB = await registerVerifiedOrg({ email: 'rb-owner@example.com' });

    await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${orgA.res.body.token}`)
      .send({ name: 'A User', email: 'a-invitee@example.com', role: 'user' });

    const target = await User.findOne({ email: 'a-invitee@example.com' });

    const res = await request(app)
      .post(`/api/users/${target._id}/resend-invite`)
      .set('Authorization', `Bearer ${orgB.res.body.token}`);

    assert.equal(res.status, 404);
  });
});

describe('email verification', () => {
  test('a new org owner starts unverified with a token issued', async () => {
    await registerOrg({ email: 'unverified@example.com' });
    const user = await User.findOne({ email: 'unverified@example.com' });

    assert.equal(user.emailVerified, false);
    assert.match(user.verifyToken, /^[a-f0-9]{64}$/);
    assert.ok(user.verifyTokenExpires > Date.now());
  });

  test('an unverified owner cannot invite teammates', async () => {
    const { res: reg } = await registerOrg();

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ name: 'Nope', email: 'nope@example.com', role: 'user' });

    assert.equal(res.status, 403);
    assert.equal(res.body.emailVerificationRequired, true);
    assert.equal(await User.countDocuments({ email: 'nope@example.com' }), 0);
  });

  test('verifying with a valid token flips the flag and consumes it', async () => {
    const { res: reg } = await registerOrg({ email: 'verifyme@example.com' });

    const rawToken = 'b'.repeat(64);
    const { hashToken } = await import('../utils/tokens.js');
    await User.updateOne(
      { email: 'verifyme@example.com' },
      { verifyToken: hashToken(rawToken), verifyTokenExpires: Date.now() + 60000 }
    );

    const res = await request(app).post(`/api/auth/verify-email/${rawToken}`);
    assert.equal(res.status, 200);

    const user = await User.findOne({ email: 'verifyme@example.com' });
    assert.equal(user.emailVerified, true);
    assert.equal(user.verifyToken, undefined);

    // The same token cannot be replayed.
    const replay = await request(app).post(`/api/auth/verify-email/${rawToken}`);
    assert.equal(replay.status, 400);

    // And inviting now works.
    const invite = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ name: 'Now Allowed', email: 'allowed@example.com', role: 'user' });
    assert.equal(invite.status, 201);
  });

  test('rejects an expired verification token', async () => {
    await registerOrg({ email: 'expired@example.com' });

    const rawToken = 'c'.repeat(64);
    const { hashToken } = await import('../utils/tokens.js');
    await User.updateOne(
      { email: 'expired@example.com' },
      { verifyToken: hashToken(rawToken), verifyTokenExpires: Date.now() - 1000 }
    );

    const res = await request(app).post(`/api/auth/verify-email/${rawToken}`);
    assert.equal(res.status, 400);
    assert.equal((await User.findOne({ email: 'expired@example.com' })).emailVerified, false);
  });

  test('accepting an invite verifies the email without a separate step', async () => {
    const { res: reg } = await registerVerifiedOrg();
    await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ name: 'Invitee', email: 'autoverify@example.com', role: 'user' });

    const rawToken = 'd'.repeat(64);
    const { hashToken } = await import('../utils/tokens.js');
    await User.updateOne(
      { email: 'autoverify@example.com' },
      { resetPasswordToken: hashToken(rawToken), resetPasswordExpires: Date.now() + 60000 }
    );

    const res = await request(app)
      .post(`/api/auth/reset-password/${rawToken}`)
      .send({ password: 'brandnewpassword' });
    assert.equal(res.status, 200);

    const user = await User.findOne({ email: 'autoverify@example.com' });
    assert.equal(user.emailVerified, true);
    assert.equal(user.invitedAt, undefined, 'invite should no longer be pending');
  });

  test('resend-invite refuses once the user has accepted', async () => {
    const { res: reg } = await registerVerifiedOrg();
    await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ name: 'Done', email: 'accepted@example.com', role: 'user' });

    await User.updateOne({ email: 'accepted@example.com' }, { emailVerified: true });
    const target = await User.findOne({ email: 'accepted@example.com' });

    const res = await request(app)
      .post(`/api/users/${target._id}/resend-invite`)
      .set('Authorization', `Bearer ${reg.body.token}`);

    assert.equal(res.status, 409);
  });

  test('resend-verification is throttled per account', async () => {
    const { res: reg, body } = await registerOrg();

    // Registration already sent one, so an immediate resend is inside the window.
    const tooSoon = await request(app)
      .post('/api/auth/resend-verification')
      .set('Authorization', `Bearer ${reg.body.token}`);

    assert.equal(tooSoon.status, 429);
    assert.ok(tooSoon.body.retryAfterSeconds > 0);

    // Age the last-sent stamp past the cooldown and it goes through, with a
    // freshly issued token replacing the old one.
    const before = await User.findOne({ email: body.email });
    await User.updateOne({ email: body.email }, { verifySentAt: new Date(Date.now() - 61 * 1000) });

    const ok = await request(app)
      .post('/api/auth/resend-verification')
      .set('Authorization', `Bearer ${reg.body.token}`);

    // Email no-ops in tests, so the handler reports the send failure — the
    // point here is that it got past the cooldown and reissued a token.
    assert.equal(ok.status, 502);
    const after = await User.findOne({ email: body.email });
    assert.notEqual(after.verifyToken, before.verifyToken, 'expected a new token');
  });

  test('resend-verification is a no-op once already verified', async () => {
    const { res: reg, body } = await registerVerifiedOrg();
    const before = await User.findOne({ email: body.email });

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .set('Authorization', `Bearer ${reg.body.token}`);

    // Short-circuits before the mail layer, so this one really is a 200.
    assert.equal(res.status, 200);
    assert.match(res.body.message, /already verified/i);

    // No new token was issued, and the cooldown stamp is untouched.
    const after = await User.findOne({ email: body.email });
    assert.equal(after.verifySentAt.getTime(), before.verifySentAt.getTime());
  });
});

describe('POST /api/users/:id/send-reset', () => {
  test('issues a reset token without the admin choosing a password', async () => {
    const orgOwner = await registerVerifiedOrg();
    const other = await registerOrg({ email: 'victim@example.com' });
    // Move the second user into the first org so it is a same-tenant target.
    const owner = await User.findOne({ email: orgOwner.body.email });
    await User.updateOne(
      { email: 'victim@example.com' },
      { tenantId: owner.tenantId, role: 'user', emailVerified: true }
    );
    const target = await User.findOne({ email: 'victim@example.com' });
    const passwordBefore = target.password;

    const res = await request(app)
      .post(`/api/users/${target._id}/send-reset`)
      .set('Authorization', `Bearer ${orgOwner.res.body.token}`);

    // Email no-ops in tests, so the handler reports the send failure.
    assert.equal(res.status, 502);

    const after = await User.findOne({ email: 'victim@example.com' });
    assert.match(after.resetPasswordToken, /^[a-f0-9]{64}$/);
    // Crucially, the existing password is untouched — the user is not locked out.
    assert.equal(after.password, passwordBefore);
    assert.ok(other.res.body.token);
  });

  test('the old admin-set-password endpoint is gone', async () => {
    const { res: reg } = await registerVerifiedOrg();
    const owner = await User.findOne({ email: reg.body.user.email });

    const res = await request(app)
      .put(`/api/users/${owner._id}/password`)
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ password: 'adminchosenpassword' });

    assert.equal(res.status, 404);
  });
});

describe('multi-tenant isolation', () => {
  test('a user cannot see another organization\'s materials', async () => {
    const orgA = await registerOrg({ email: 'a-owner@example.com' });
    const orgB = await registerOrg({ email: 'b-owner@example.com' });

    // Org A creates a material.
    const created = await request(app)
      .post('/api/materials')
      .set('Authorization', `Bearer ${orgA.res.body.token}`)
      .send({ name: 'Steel Bolt', type: 'hardware', quantity: 100 });
    assert.equal(created.status, 201);

    // Org A sees it.
    const listA = await request(app)
      .get('/api/materials')
      .set('Authorization', `Bearer ${orgA.res.body.token}`);
    assert.equal(listA.body.length, 1);

    // Org B must NOT see org A's material.
    const listB = await request(app)
      .get('/api/materials')
      .set('Authorization', `Bearer ${orgB.res.body.token}`);
    assert.equal(listB.status, 200);
    assert.equal(listB.body.length, 0);

    // And the created doc is tagged with org A's tenant, not supplied by client.
    const doc = await Material.findOne({ name: 'Steel Bolt' });
    const ownerA = await User.findOne({ email: 'a-owner@example.com' });
    assert.equal(String(doc.tenantId), String(ownerA.tenantId));
  });
});
