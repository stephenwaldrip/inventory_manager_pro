import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import Activity from '../models/Activity.js';
import sendEmail from '../utils/sendEmail.js';

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
    const { name, email, password, role } = req.body;
    // Email is globally unique (one email, one org), so this check stays unscoped.
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const safeRole = role === 'superadmin' ? 'user' : role;
    const user = await User.create({
      name,
      email,
      password,
      role: safeRole,
      tenantId: req.tenantId,
    });

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'user_added',
        message: `New user "${email}" was created with role: ${safeRole}`,
        user: req.user?.email,
      });
      sendEmail({
        to: req.user?.email,
        subject: '👤 New User Created',
        html: `<p><strong>${req.user?.email}</strong> created a new user: <strong>${email}</strong> with role: <strong>${safeRole}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    res.status(201).json({ message: 'User created', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUser = async (req, res) => {
  try {
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
        html: `<p><strong>${req.user?.email}</strong> deleted user: <strong>${user.email}</strong></p>`,
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
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { name, email },
      { new: true }
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
        html: `<p><strong>${req.user?.email}</strong> updated user: <strong>${user.email}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { password: hashed },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'user_added',
        message: `Password was reset for "${user.email}"`,
        user: req.user?.email,
      });
      sendEmail({
        to: user.email,
        subject: '🔑 Password Reset',
        html: `<p>Your Inventory Manager Pro password was reset by an administrator.</p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!user) return res.status(404).json({ message: 'User not found' });

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
        html: `<p><strong>${req.user?.email}</strong> ${user.active ? 'activated' : 'suspended'} user: <strong>${user.email}</strong></p>`,
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