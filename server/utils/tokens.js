import crypto from 'crypto';

// Raw token goes out by email; only the hash is ever stored.
export const generateToken = () => crypto.randomBytes(32).toString('hex');

export const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');
