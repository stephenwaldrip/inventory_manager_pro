import User from '../models/User.js';
import Activity from '../models/Activity.js';
import sendEmail from '../utils/sendEmail.js';
import { html } from '../utils/html.js';
import { generateToken, hashToken } from '../utils/tokens.js';

// Invites often arrive outside working hours, so give them a full week
// rather than the 1 hour a self-service password reset gets.
const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Matches the self-service /forgot-password window.
const RESET_EXPIRY_MS = 60 * 60 * 1000;

export const getUsers = async (req, res) => {
  try {
    const users = await User.find({ tenantId: req.tenantId }).select('-password');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    // Without this a missing address falls through to a schema validation
    // error and surfaces as a 500, which reads as "our fault" to the caller.
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }

    // Email is globally unique (one email, one org), so this check stays unscoped.
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const safeRole = role === 'superadmin' ? 'user' : role;
    const inviteToken = generateToken();

    const user = await User.create({
      name,
      email,
      // The admin never picks a password. This placeholder is random and
      // discarded unused — the account is unreachable until the invite is
      // accepted, which is what makes it safe to leave set.
      password: generateToken(),
      role: safeRole,
      tenantId: req.tenantId,
      resetPasswordToken: hashToken(inviteToken),
      resetPasswordExpires: Date.now() + INVITE_EXPIRY_MS,
      invitedAt: new Date(),
    });

    const inviteUrl = `${process.env.CLIENT_URL}/reset-password/${inviteToken}?invite=1`;

    // Awaited, unlike the other notifications here: if the invite doesn't go
    // out the user has no way in, so the admin needs to know to resend.
    const invited = await sendEmail({
      to: email,
      subject: '👋 You have been invited to Inventory Manager Pro',
      html: html`
        <p><strong>${req.user?.email || 'An administrator'}</strong> created an Inventory Manager Pro account for you.</p>
        <p>Choose a password to activate it. This link expires in 7 days.</p>
        <a href="${inviteUrl}" style="background:#3b82f6;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">Set Your Password</a>
        <p>If you weren't expecting this, you can ignore this email.</p>
      `,
    });

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'user_added',
        message: `New user "${email}" was invited with role: ${safeRole}`,
        user: req.user?.email,
      });
      sendEmail({
        to: req.user?.email,
        subject: '👤 New User Created',
        html: html`<p><strong>${req.user?.email}</strong> invited a new user: <strong>${email}</strong> with role: <strong>${safeRole}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    // Never echo the password hash or the invite token hash back to the client.
    const { password: _pw, resetPasswordToken: _rt, resetPasswordExpires: _re, ...safeUser } =
      user.toObject();

    res.status(201).json({
      message: invited
        ? 'User created and invite sent'
        : 'User created, but the invite email could not be sent',
      inviteSent: invited,
      user: safeUser,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Issues a fresh invite token and re-sends the link. Used when the first
// invite bounced, was deleted, or expired before the user got to it.
export const resendInvite = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Someone who already accepted has a password of their own; re-inviting
    // them would invalidate it and send a confusing email.
    if (user.emailVerified) {
      return res.status(409).json({ message: 'This user has already accepted their invite' });
    }

    const inviteToken = generateToken();
    user.resetPasswordToken = hashToken(inviteToken);
    user.resetPasswordExpires = Date.now() + INVITE_EXPIRY_MS;
    user.invitedAt = new Date();
    await user.save();

    const inviteUrl = `${process.env.CLIENT_URL}/reset-password/${inviteToken}?invite=1`;

    const sent = await sendEmail({
      to: user.email,
      subject: '👋 Your Inventory Manager Pro invite',
      html: html`
        <p><strong>${req.user?.email || 'An administrator'}</strong> re-sent your invite to Inventory Manager Pro.</p>
        <p>Choose a password to activate your account. This link expires in 7 days and replaces any earlier one.</p>
        <a href="${inviteUrl}" style="background:#3b82f6;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">Set Your Password</a>
      `,
    });

    if (!sent) return res.status(502).json({ message: 'Could not send the invite email' });
    res.status(200).json({ message: 'Invite re-sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// An org with no superadmin is unrecoverable: the role endpoint only grants
// 'user' and 'admin', so nobody can ever be promoted back into the seat.
const isLastSuperadmin = async (user, tenantId) => {
  if (user.role !== 'superadmin') return false;
  const remaining = await User.countDocuments({ tenantId, role: 'superadmin' });
  return remaining <= 1;
};

export const deleteUser = async (req, res) => {
  try {
    const target = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!target) return res.status(404).json({ message: 'User not found' });

    // adminOnly admits plain admins, who must not be able to remove the owner.
    if (target.role === 'superadmin' && req.user?.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only a superadmin can remove another superadmin' });
    }
    if (await isLastSuperadmin(target, req.tenantId)) {
      return res.status(409).json({
        message: 'This is the only superadmin. Promote another one before removing this account.',
      });
    }

    const user = await User.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'user_added',
        message: `User "${user.email}" was deleted`,
        user: req.user?.email,
      });
      sendEmail({
        to: req.user?.email,
        subject: '🗑️ User Deleted',
        html: html`<p><strong>${req.user?.email}</strong> deleted user: <strong>${user.email}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, email } = req.body;

    const existing = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!existing) return res.status(404).json({ message: 'User not found' });

    // Verified status belongs to the address that was proven, not to the row.
    // Moving someone to a new address has to re-prove it, or an admin could
    // hand any address a verified badge — and with it the right to send mail.
    const update = { name, email };
    const normalized = typeof email === 'string' ? email.trim().toLowerCase() : undefined;
    if (normalized && normalized !== existing.email) {
      // Email is globally unique, so a collision can come from another org we
      // cannot see. Check unscoped, but only ever report that it is taken —
      // saying more would leak membership of an organization to an outsider.
      const taken = await User.exists({ email: normalized, _id: { $ne: existing._id } });
      if (taken) {
        return res.status(400).json({ message: 'That email address is already in use' });
      }

      update.emailVerified = false;
      update.verifyToken = undefined;
      update.verifyTokenExpires = undefined;
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      update,
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'user_added',
        message: `User "${user.email}" details were updated`,
        user: req.user?.email,
      });
      sendEmail({
        to: req.user?.email,
        subject: '✏️ User Updated',
        html: html`<p><strong>${req.user?.email}</strong> updated user: <strong>${user.email}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    res.status(200).json(user);
  } catch (err) {
    // Two concurrent updates can both pass the check above; the unique index
    // is the real arbiter, and losing that race is still the caller's 400.
    if (err.code === 11000) {
      return res.status(400).json({ message: 'That email address is already in use' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Sends the user a reset link instead of letting an admin pick the password.
// The admin never learns the credential, and the account stays recoverable by
// its owner alone.
export const sendPasswordReset = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const token = generateToken();
    user.resetPasswordToken = hashToken(token);
    user.resetPasswordExpires = Date.now() + RESET_EXPIRY_MS;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

    const sent = await sendEmail({
      to: user.email,
      subject: '🔑 Password Reset',
      html: html`
        <p>An administrator asked us to help you reset your Inventory Manager Pro password.</p>
        <p>Choose a new password using the link below. It expires in 1 hour.</p>
        <a href="${resetUrl}" style="background:#3b82f6;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">Reset Password</a>
        <p>If you weren't expecting this, contact your administrator.</p>
      `,
    });

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'user_added',
        message: `Password reset link sent to "${user.email}"`,
        user: req.user?.email,
      });
    } catch (actErr) {
      console.warn('Activity failed:', actErr.message);
    }

    if (!sent) return res.status(502).json({ message: 'Could not send the reset email' });
    res.status(200).json({ message: 'Reset link sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Suspending blocks login, so the only superadmin doing this to themselves
    // locks the organization out with nobody left who can undo it.
    if (user.active && (await isLastSuperadmin(user, req.tenantId))) {
      return res.status(409).json({
        message: 'This is the only superadmin. Promote another one before suspending this account.',
      });
    }

    user.active = !user.active;
    await user.save();

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'user_added',
        message: `User "${user.email}" was ${user.active ? 'activated' : 'suspended'}`,
        user: req.user?.email,
      });
      sendEmail({
        to: req.user?.email,
        subject: `${user.active ? '✅ User Activated' : '🚫 User Suspended'}`,
        html: html`<p><strong>${req.user?.email}</strong> ${user.active ? 'activated' : 'suspended'} user: <strong>${user.email}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    res.status(200).json({ message: `User ${user.active ? 'activated' : 'deactivated'}`, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export default undefined;