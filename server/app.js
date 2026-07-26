import express from 'express';
import Material from '../models/Material.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Matches the alert threshold in materialsController so the report and the
// low-inventory emails never disagree about what counts as low.
const LOW_STOCK_THRESHOLD = 5;

router.get('/inventory', protect, async (req, res) => {
  try {
    const { category, lowStockOnly } = req.query;

    const materials = await Material.find({ tenantId: req.tenantId })
      .populate('location')
      .populate('category')
      .lean();

    const rows = materials
      .map((m) => ({
        _id: m._id,
        name: m.name,
        type: m.type,
        quantity: m.quantity || 0,
        categoryName: m.category?.name || 'Uncategorized',
        locationName: m.location?.name || 'Unassigned',
        isLow: (m.quantity || 0) < LOW_STOCK_THRESHOLD,
      }))
      .filter((r) => (category && category !== 'all' ? r.categoryName === category : true))
      .filter((r) => (lowStockOnly === 'true' ? r.isLow : true))
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName) || a.name.localeCompare(b.name));

    res.json({
      generatedAt: new Date(),
      filters: { category: category || 'all', lowStockOnly: lowStockOnly === 'true' },
      summary: {
        totalMaterials: rows.length,
        totalUnits: rows.reduce((s, r) => s + r.quantity, 0),
        lowStockCount: rows.filter((r) => r.isLow).length,
      },
      items: rows,
    });
  } catch (err) {
    console.error('Inventory report failed:', err.message);
    res.status(500).json({ message: 'Failed to build report' });
  }
});

export default router;