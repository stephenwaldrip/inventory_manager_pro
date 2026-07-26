import crypto from 'crypto';

export const MIN_PASSWORD_LENGTH = 8;

// SHA-1 the password and return the uppercase hex the HIBP range API speaks.
const sha1Hex = (s) => crypto.createHash('sha1').update(s, 'utf8').digest('hex').toUpperCase();

// Checks a password against HaveIBeenPwned's Pwned Passwords corpus using
// k-anonymity: only the first 5 hex chars of the SHA-1 are sent, the API
// returns every breached suffix under that prefix, and the match is done
// locally. The password (and its full hash) never leave this process.
//
// Fails OPEN — returns false on any timeout/network/parse error — so a
// third-party outage can't wedge signups and resets. The length rule still
// applies regardless, so a blocked breach check never lowers the floor.
export const isPasswordBreached = async (
  password,
  { fetchImpl = fetch, timeoutMs = 3000 } = {}
) => {
  const hash = sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
      // Padding pads the response to a uniform size so a network observer
      // can't infer the hit count from the payload length.
      headers: { 'Add-Padding': 'true' },
      signal: controller.signal,
    });
    if (!res.ok) return false;

    const text = await res.text();
    for (const line of text.split('\n')) {
      const [lineSuffix, count] = line.trim().split(':');
      // count 0 is padding the API injected — a real hit always has count > 0.
      if (lineSuffix === suffix && Number(count) > 0) return true;
    }
    return false;
  } catch (err) {
    console.warn('Breach check unavailable, allowing password:', err.message);
    return false;
  } finally {
    clearTimeout(timer);
  }
};

// The single gate every password-setting path runs through: registration,
// self-service reset, and invite acceptance. Returns { ok: true } or
// { ok: false, message } with a user-facing reason.
export const validateNewPassword = async (password, opts = {}) => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }

  // The integration suite runs offline, so skip the network round-trip unless a
  // test injects its own fetch to exercise this path deliberately.
  const skipBreach = process.env.NODE_ENV === 'test' && !opts.fetchImpl;
  if (!skipBreach && (await isPasswordBreached(password, opts))) {
    return {
      ok: false,
      message: 'This password has appeared in a known data breach. Please choose a different one.',
    };
  }

  return { ok: true };
};
