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
import { requireActiveSubscription, enforceLimit } from '../middleware/subscriptionMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

const seatCount = (tenantId) => User.countDocuments({ tenantId });

router.route('/')
  .get(protect, adminOnly, getUsers)
  .post(
    protect,
    adminOnly,
    verifiedOnly,
    requireActiveSubscription,
    enforceLimit('users', seatCount),
    createUser
  );

// Superadmin only routes
router.put('/:id/role', protect, superAdminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const target = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!target) return res.status(404).json({ message: 'User not found' });

    // Demoting the only superadmin orphans the org — this endpoint cannot
    // grant 'superadmin', so the seat could never be refilled.
    if (target.role === 'superadmin') {
      const superadmins = await User.countDocuments({ tenantId: req.tenantId, role: 'superadmin' });
      if (superadmins <= 1) {
        return res.status(409).json({
          message: 'This is the only superadmin. Promote another one before changing this role.',
        });
      }
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