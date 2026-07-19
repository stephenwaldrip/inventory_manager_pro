import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Activity from '../models/Activity.js';
import sendEmail from '../utils/sendEmail.js';
import { html } from '../utils/html.js';
import { generateToken, hashToken } from '../utils/tokens.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Reject anything that isn't a plain non-empty string. Prevents NoSQL
// operator injection (e.g. { "$gt": "" }) reaching Mongoose queries.
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

const VERIFY_EXPIRY_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

const verificationEmail = (verifyUrl) => ({
  subject: '✅ Confirm your email address',
  html: html`
    <p>Welcome to Inventory Manager Pro. Confirm this address to finish setting up your account.</p>
    <p>This link expires in 24 hours.</p>
    <a href="${verifyUrl}" style="background:#3b82f6;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">Confirm Email</a>
    <p>If you didn't sign up, you can ignore this email.</p>
  `,
});

router.post('/register', async (req, res) => {
  const { name, email, password, organizationName } = req.body;

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return res.status(400).json({ message: 'Valid email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  if (!isNonEmptyString(organizationName)) {
    return res.status(400).json({ message: 'Organization name is required' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    // Build a URL-safe slug, adding a suffix if that slug is taken.
    const baseSlug = organizationName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let suffix = 0;
    while (await Organization.findOne({ slug })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const organization = await Organization.create({ name: organizationName, slug });

    const verifyToken = generateToken();

    // Whoever registers owns the new org.
    const user = await User.create({
      name,
      email,
      password,
      role: 'superadmin',
      tenantId: organization._id,
      verifyToken: hashToken(verifyToken),
      verifyTokenExpires: Date.now() + VERIFY_EXPIRY_MS,
      // Signup sends the first verification mail, so the cooldown starts here.
      verifySentAt: new Date(),
    });

    organization.createdBy = user._id;
    await organization.save();

    try {
      await Activity.create({
        tenantId: organization._id,
        type: 'user_added',
        message: `Organization "${organization.name}" created by ${email}`,
        user: email,
      });

      sendEmail({
        to: user.email,
        subject: '🎉 Welcome to Inventory Manager Pro',
        html: html`
          <p>Your organization <strong>${organization.name}</strong> is ready.</p>
          <p>You're signed in as <strong>${user.email}</strong> with full owner access, so you can start adding inventory right away.</p>
          <p>Confirm your email address (see the separate email) to unlock inviting your team.</p>
          <a href="${process.env.CLIENT_URL}/login" style="background:#3b82f6;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">Open Inventory Manager Pro</a>
        `,
      });

      sendEmail({
        to: user.email,
        ...verificationEmail(`${process.env.CLIENT_URL}/verify-email/${verifyToken}`),
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, email: user.email, tenantId: organization._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      token,
      user: { email: user.email, role: user.role },
      organization: { name: organization.name, slug: organization.slug },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    if (user.active === false) {
      return res.status(403).json({ message: 'Account is suspended. Contact your administrator.' });
    }

    try {
      await Activity.create({
        tenantId: user.tenantId,
        type: 'user_login',
        message: `"${email}" logged in`,
        user: email,
      });
    } catch (actErr) {
      console.warn('Activity failed:', actErr.message);
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, email: user.email, tenantId: user.tenantId },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user: { email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot password - sends reset email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  // Always return the same generic response so the endpoint can't be used to
  // enumerate which emails have accounts.
  const genericResponse = { message: 'If an account exists for that email, a reset link has been sent.' };

  try {
    if (!isNonEmptyString(email)) return res.json(genericResponse);

    const user = await User.findOne({ email });
    if (!user) return res.json(genericResponse);

    const token = generateToken();
    // Store only a hash of the token; the raw token goes out by email.
    user.resetPasswordToken = hashToken(token);
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

    sendEmail({
      to: user.email,
      subject: '🔑 Password Reset Request',
      html: html`
        <p>You requested a password reset for your Inventory Manager Pro account.</p>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="background:#3b82f6;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">Reset Password</a>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });

    res.json(genericResponse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password - validates token and updates password
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!isNonEmptyString(password) || password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    // Reaching this point means they opened a link sent to their address, so
    // the address is proven — an invitee never needs a separate verification.
    user.emailVerified = true;
    user.invitedAt = undefined;
    await user.save();

    sendEmail({
      to: user.email,
      subject: '✅ Password Reset Successful',
      html: html`<p>Your Inventory Manager Pro password has been successfully reset. If you didn't do this, contact your admin immediately.</p>`,
    });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm an email address. Idempotent-ish: a token is single-use, but an
// already-verified user hitting a stale link gets a success, not an error.
router.post('/verify-email/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({
      verifyToken: hashToken(token),
      verifyTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Verification link is invalid or has expired' });
    }

    user.emailVerified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Re-send the verification email for the signed-in user. The /api/auth IP
// limiter already slows bulk abuse; this cooldown is per-account, so rotating
// source addresses doesn't buy an attacker extra mail to a single inbox.
router.post('/resend-verification', protect, async (req, res) => {
  try {
    const user = req.user; // protect() already loaded the document
    if (user.emailVerified) return res.json({ message: 'Email is already verified' });

    const elapsed = Date.now() - (user.verifySentAt?.getTime() ?? 0);
    if (elapsed < RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        message: 'A verification email was just sent. Check your inbox, then try again shortly.',
        retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000),
      });
    }

    const verifyToken = generateToken();
    user.verifyToken = hashToken(verifyToken);
    user.verifyTokenExpires = Date.now() + VERIFY_EXPIRY_MS;
    user.verifySentAt = new Date();
    await user.save();

    const sent = await sendEmail({
      to: user.email,
      ...verificationEmail(`${process.env.CLIENT_URL}/verify-email/${verifyToken}`),
    });

    if (!sent) return res.status(502).json({ message: 'Could not send the verification email' });
    res.json({ message: 'Verification email sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
