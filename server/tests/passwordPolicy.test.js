// Unit tests for the password policy: length floor plus the HIBP breach check.
// The breach check's fetch is stubbed so nothing touches the network.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

process.env.NODE_ENV = 'test';

const { isPasswordBreached, validateNewPassword, MIN_PASSWORD_LENGTH } = await import(
  '../utils/passwordPolicy.js'
);

const sha1Upper = (s) => crypto.createHash('sha1').update(s, 'utf8').digest('hex').toUpperCase();

// Builds a fake HIBP range response for a password, letting the test say how
// many times that password's suffix should appear (0 = present-but-padding).
const stubFetchFor = (password, count) => async () => ({
  ok: true,
  text: async () => {
    const suffix = sha1Upper(password).slice(5);
    return [`0000000000000000000000000000000000A:3`, `${suffix}:${count}`, `FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0`].join('\r\n');
  },
});

describe('validateNewPassword — length', () => {
  test('rejects a password shorter than the minimum', async () => {
    const r = await validateNewPassword('short');
    assert.equal(r.ok, false);
    assert.match(r.message, /at least 8 characters/);
  });

  test('rejects a non-string password', async () => {
    const r = await validateNewPassword(undefined);
    assert.equal(r.ok, false);
  });

  test('accepts a long password (breach check skipped in test mode)', async () => {
    const r = await validateNewPassword('a-perfectly-long-passphrase');
    assert.deepEqual(r, { ok: true });
  });

  test('MIN_PASSWORD_LENGTH is exported and enforced at the boundary', async () => {
    const exact = 'x'.repeat(MIN_PASSWORD_LENGTH);
    assert.equal((await validateNewPassword(exact)).ok, true);
    assert.equal((await validateNewPassword(exact.slice(1))).ok, false);
  });
});

describe('isPasswordBreached — HIBP k-anonymity parsing', () => {
  test('returns true when the suffix is present with a non-zero count', async () => {
    const pw = 'password1';
    const hit = await isPasswordBreached(pw, { fetchImpl: stubFetchFor(pw, 4823) });
    assert.equal(hit, true);
  });

  test('treats a count of 0 (padding) as not breached', async () => {
    const pw = 'a-unique-passphrase';
    const hit = await isPasswordBreached(pw, { fetchImpl: stubFetchFor(pw, 0) });
    assert.equal(hit, false);
  });

  test('returns false when the suffix is absent from the range', async () => {
    const fetchImpl = async () => ({ ok: true, text: async () => 'ABCDE:2\r\nFGHIJ:9' });
    assert.equal(await isPasswordBreached('anything-here', { fetchImpl }), false);
  });

  test('fails open (false) on a non-OK response', async () => {
    const fetchImpl = async () => ({ ok: false, text: async () => '' });
    assert.equal(await isPasswordBreached('anything-here', { fetchImpl }), false);
  });

  test('fails open (false) when the request throws / times out', async () => {
    const fetchImpl = async () => {
      throw new Error('network down');
    };
    assert.equal(await isPasswordBreached('anything-here', { fetchImpl }), false);
  });
});

describe('validateNewPassword — breach integration', () => {
  test('rejects a breached password when a fetch stub is injected', async () => {
    const pw = 'letmein123';
    const r = await validateNewPassword(pw, { fetchImpl: stubFetchFor(pw, 99) });
    assert.equal(r.ok, false);
    assert.match(r.message, /data breach/i);
  });

  test('accepts a long, non-breached password with the check active', async () => {
    const pw = 'an-unbreached-passphrase-42';
    const r = await validateNewPassword(pw, { fetchImpl: stubFetchFor(pw, 0) });
    assert.deepEqual(r, { ok: true });
  });
});
