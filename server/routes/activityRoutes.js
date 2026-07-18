import express from 'express';
import Activity from '../models/Activity.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const activities = await Activity.find({ tenantId: req.tenantId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;