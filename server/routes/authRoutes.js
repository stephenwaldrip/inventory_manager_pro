import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Activity from '../models/Activity.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

// Reject anything that isn't a plain non-empty string. Prevents NoSQL
// operator injection (e.g. { "$gt": "" }) reaching Mongoose queries.
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

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

    // Whoever registers owns the new org.
    const user = await User.create({
      name,
      email,
      password,
      role: 'superadmin',
      tenantId: organization._id,
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
    } catch (actErr) {
      console.warn('Activity failed:', actErr.message);
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

    const token = crypto.randomBytes(32).toString('hex');
    // Store only a hash of the token; the raw token goes out by email.
    user.resetPasswordToken = hashToken(token);
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

    sendEmail({
      to: user.email,
      subject: '🔑 Password Reset Request',
      html: `
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
    await user.save();

    sendEmail({
      to: user.email,
      subject: '✅ Password Reset Successful',
      html: `<p>Your Inventory Manager Pro password has been successfully reset. If you didn't do this, contact your admin immediately.</p>`,
    });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;