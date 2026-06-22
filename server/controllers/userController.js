import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import Activity from '../models/Activity.js';
import sendEmail from '../utils/sendEmail.js';

const ADMIN_EMAIL = 'stephenwaldrip90@gmail.com';

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const safeRole = role === 'superadmin' ? 'user' : role;
    const user = await User.create({ name, email, password, role: safeRole });

    try {
      await Activity.create({
        type: 'user_added',
        message: `New user "${email}" was created with role: ${safeRole}`,
        user: req.user?.email,
      });
      sendEmail({
        to: ADMIN_EMAIL,
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
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    try {
      await Activity.create({
        type: 'user_added',
        message: `User "${user.email}" was deleted`,
        user: req.user?.email,
      });
      sendEmail({
        to: ADMIN_EMAIL,
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
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    try {
      await Activity.create({
        type: 'user_added',
        message: `User "${user.email}" details were updated`,
        user: req.user?.email,
      });
      sendEmail({
        to: ADMIN_EMAIL,
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
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { password: hashed },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    try {
      await Activity.create({
        type: 'user_added',
        message: `Password was reset for "${user.email}"`,
        user: req.user?.email,
      });
      sendEmail({
        to: ADMIN_EMAIL,
        subject: '🔑 Password Reset',
        html: `<p><strong>${req.user?.email}</strong> reset the password for: <strong>${user.email}</strong></p>`,
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
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.active = !user.active;
    await user.save();

    try {
      await Activity.create({
        type: 'user_added',
        message: `User "${user.email}" was ${user.active ? 'activated' : 'suspended'}`,
        user: req.user?.email,
      });
      sendEmail({
        to: ADMIN_EMAIL,
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