import Category from '../models/Category.js';
import Activity from '../models/Activity.js';
import sendEmail from '../utils/sendEmail.js';
import { html } from '../utils/html.js';

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ tenantId: req.tenantId });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    // Uniqueness is per-org, so check within this tenant only.
    const exists = await Category.findOne({ name, tenantId: req.tenantId });
    if (exists) return res.status(400).json({ message: 'Category already exists' });

    const newCategory = new Category({ name, tenantId: req.tenantId });
    await newCategory.save();

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'material_added',
        message: `Category "${name}" was created`,
        user: req.user?.email,
      });
      sendEmail({
        to: req.user?.email,
        subject: '🗂️ New Category Created',
        html: html`<p><strong>${req.user?.email}</strong> created a new category: <strong>${name}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    category.name = name || category.name;
    await category.save();

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'material_updated',
        message: `Category "${category.name}" was updated`,
        user: req.user?.email,
      });
      sendEmail({
        to: req.user?.email,
        subject: '✏️ Category Updated',
        html: html`<p><strong>${req.user?.email}</strong> updated category: <strong>${category.name}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    await category.deleteOne();

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'material_deleted',
        message: `Category "${category.name}" was deleted`,
        user: req.user?.email,
      });
      sendEmail({
        to: req.user?.email,
        subject: '🗑️ Category Deleted',
        html: html`<p><strong>${req.user?.email}</strong> deleted category: <strong>${category.name}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};