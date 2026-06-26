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

const router = express.Router();

// All category routes require an authenticated user.
router.route('/')
  .get(protect, getCategories)
  .post(protect, createCategory);

router.route('/:id')
  .get(protect, getCategoryById)
  .put(protect, updateCategory)
  .delete(protect, deleteCategory);

export default router;
