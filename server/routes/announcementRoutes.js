import express from 'express';
import Announcement from '../models/Announcement.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ pinned: -1, createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, message, pinned } = req.body;
    const announcement = await Announcement.create({
      title,
      message,
      pinned,
      postedBy: req.user?.email,
    });
    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;