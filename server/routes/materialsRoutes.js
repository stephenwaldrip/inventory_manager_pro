// server/routes/materialsRoutes.js
import express from 'express';
import {
  getMaterials,
  createMaterial,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
} from '../controllers/materialsController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireActiveSubscription, enforceLimit } from '../middleware/subscriptionMiddleware.js';
import Material from '../models/Material.js';

const router = express.Router();

const materialCount = (tenantId) => Material.countDocuments({ tenantId });

// Reads stay open to a lapsed org so they can still see and export their own
// data; only writes are gated.
router.route('/')
  .get(protect, getMaterials)
  .post(protect, requireActiveSubscription, enforceLimit('materials', materialCount), createMaterial);

router.route('/:id')
  .get(protect, getMaterialById)
  .put(protect, requireActiveSubscription, updateMaterial)
  .delete(protect, requireActiveSubscription, deleteMaterial);

export default router;
