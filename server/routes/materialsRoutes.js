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

const router = express.Router();

router.route('/')
  .get(protect, getMaterials)
  .post(protect, createMaterial);

router.route('/:id')
  .get(protect, getMaterialById)
  .put(protect, updateMaterial)
  .delete(protect, deleteMaterial);

export default router;
