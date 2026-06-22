import Category from '../models/Category.js';
import Activity from '../models/Activity.js';
import sendEmail from '../utils/sendEmail.js';

const ADMIN_EMAIL = 'stephenwaldrip90@gmail.com';

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const newCategory = new Category({ name });
    await newCategory.save();

    try {
      await Activity.create({
        type: 'material_added',
        message: `Category "${name}" was created`,
        user: req.user?.email,
      });
      sendEmail({
        to: ADMIN_EMAIL,
        subject: '🗂️ New Category Created',
        html: `<p><strong>${req.user?.email}</strong> created a new category: <strong>${name}</strong></p>`,
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
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    category.name = name || category.name;
    await category.save();

    try {
      await Activity.create({
        type: 'material_updated',
        message: `Category "${category.name}" was updated`,
        user: req.user?.email,
      });
      sendEmail({
        to: ADMIN_EMAIL,
        subject: '✏️ Category Updated',
        html: `<p><strong>${req.user?.email}</strong> updated category: <strong>${category.name}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    res.json(category);
  } catch (err) {