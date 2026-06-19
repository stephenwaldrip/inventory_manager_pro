// server/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

// GET all categories
router.get('/', getCategories);

// POST create a new category
router.post('/', createCategory);

// GET a single category by ID
router.get('/:id', getCategoryById);

// PUT update a category by ID
router.put('/:id', updateCategory);

// DELETE a category by ID
router.delete('/:id', deleteCategory);

module.exports = router;
