// server/routes/reports.js
import express from 'express';
import Material from '../models/Material.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Mirrors the threshold materialsController uses for low-inventory alerts.
// Kept as one constant so the report and the emails can't drift apart.
const LOW_STOCK_THRESHOLD = 5;

// GET /api/reports/inventory?category=<name>&lowStockOnly=true
// Read-only, so it is deliberately not behind requireActiveSubscription —
// a lapsed org can still see and print its own data, matching materialsRoutes.
router.get('/inventory', protect, async (req, res) => {
  try {
    const { category, lowStockOnly } = req.query;
    const onlyLow = lowStockOnly === 'true';

    const materials = await Material.find({ tenantId: req.tenantId })
      .populate('location')
      .populate('category')
      .lean();

    // Flatten the refs to display strings here rather than in the component,
    // so the print view never has to reach through a possibly-null populate.
    const rows = materials
      .map((m) => ({
        _id: m._id,
        name: m.name,
        type: m.type || '—',
        quantity: m.quantity || 0,
        categoryName: m.category?.name || 'Uncategorized',
        locationName: m.location?.name || 'Unassigned',
        notes: m.notes || '',
        isLow: (m.quantity || 0) < LOW_STOCK_THRESHOLD,
      }))
      .filter((r) => (category && category !== 'all' ? r.categoryName === category : true))
      .filter((r) => (onlyLow ? r.isLow : true))
      .sort(
        (a, b) =>
          a.categoryName.localeCompare(b.categoryName) || a.name.localeCompare(b.name)
      );

    res.json({
      generatedAt: new Date(),
      threshold: LOW_STOCK_THRESHOLD,
      filters: { category: category || 'all', lowStockOnly: onlyLow },
      summary: {
        totalMaterials: rows.length,
        totalUnits: rows.reduce((sum, r) => sum + r.quantity, 0),
        lowStockCount: rows.filter((r) => r.isLow).length,
        categoryCount: new Set(rows.map((r) => r.categoryName)).size,
      },
      items: rows,
    });
  } catch (err) {
    console.error('Inventory report failed:', err.message);
    res.status(500).json({ message: 'Failed to build report' });
  }
});

export default router;