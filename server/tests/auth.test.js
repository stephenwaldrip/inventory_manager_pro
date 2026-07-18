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
