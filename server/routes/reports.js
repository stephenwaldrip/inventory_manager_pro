import express from 'express';
import Item from '../models/Item.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/inventory', auth, async (req, res) => {
  try {
    const { category, lowStockOnly } = req.query;

    const match = { user: req.user.id };
    if (category && category !== 'all') match.category = category;

    const items = await Item.find(match).sort({ category: 1, name: 1 }).lean();

    const rows = items
      .map(i => ({
        ...i,
        value: (i.quantity || 0) * (i.price || 0),
        isLow: (i.quantity || 0) <= (i.lowStockThreshold ?? 5),
      }))
      .filter(i => (lowStockOnly === 'true' ? i.isLow : true));

    res.json({
      generatedAt: new Date(),
      filters: { category: category || 'all', lowStockOnly: lowStockOnly === 'true' },
      summary: {
        totalItems: rows.length,
        totalUnits: rows.reduce((s, i) => s + (i.quantity || 0), 0),
        totalValue: rows.reduce((s, i) => s + i.value, 0),
        lowStockCount: rows.filter(i => i.isLow).length,
      },
      items: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to build report' });
  }
});

export default router;