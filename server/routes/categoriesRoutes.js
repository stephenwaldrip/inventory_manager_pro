// server/routes/categoriesRoutes.js
import express from 'express';
import {
  getCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireActiveSubscription } from '../middleware/subscriptionMiddleware.js';

const router = express.Router();

// All category routes require an authenticated user. Reads stay open to a
// lapsed org; every write is gated.
router.route('/')
  .get(protect, getCategories)
  .post(protect, requireActiveSubscription, createCategory);

router.route('/:id')
  .get(protect, getCategoryById)
  .put(protect, requireActiveSubscription, updateCategory)
  .delete(protect, requireActiveSubscription, deleteCategory);

export default router;
