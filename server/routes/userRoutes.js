import express from 'express';
import {
  getUsers,
  createUser,
  resendInvite,
  deleteUser,
  updateUser,
  sendPasswordReset,
  toggleUserStatus,
} from '../controllers/userController.js';
import { protect, adminOnly, superAdminOnly, verifiedOnly } from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

router.route('/')
  .get(protect, adminOnly, getUsers)
  .post(protect, adminOnly, verifiedOnly, createUser);

// Superadmin only routes
router.put('/:id/role', protect, superAdminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { role },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Role updated', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/resend-invite', protect, adminOnly, verifiedOnly, resendInvite);

// Superadmins send a reset link rather than choosing a password themselves —
// no admin-known credential, and the user is never locked out of their own account.
router.post('/:id/send-reset', protect, superAdminOnly, verifiedOnly, sendPasswordReset);
router.put('/:id/status', protect, superAdminOnly, toggleUserStatus);

// Admin and superadmin routes
router.route('/:id')
  .delete(protect, adminOnly, deleteUser)
  .put(protect, superAdminOnly, updateUser);

export default router;