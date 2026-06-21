import express from 'express';
import {
  getUsers,
  createUser,
  deleteUser,
} from '../controllers/userController.js';
import { protect, adminOnly, superAdminOnly } from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

router.route('/')
  .get(protect, adminOnly, getUsers)
  .post(protect, adminOnly, createUser);

router.route('/:id')
  .delete(protect, adminOnly, deleteUser);

router.put('/:id/role', protect, superAdminOnly, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Role updated', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;