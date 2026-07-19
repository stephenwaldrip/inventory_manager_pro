import express from 'express';
import Announcement from '../models/Announcement.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { requireActiveSubscription } from '../middleware/subscriptionMiddleware.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const announcements = await Announcement.find({ tenantId: req.tenantId })
      .sort({ pinned: -1, createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', protect, adminOnly, requireActiveSubscription, async (req, res) => {
  try {
    const { title, message, pinned } = req.body;
    const announcement = await Announcement.create({
      title,
      message,
      pinned,
      postedBy: req.user?.email,
      tenantId: req.tenantId,
    });
    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', protect, adminOnly, requireActiveSubscription, async (req, res) => {
  try {
    const deleted = await Announcement.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!deleted) return res.status(404).json({ message: 'Announcement not found' });
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;