import Material from '../models/Material.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Get all materials
// @route   GET /api/materials
// @access  Private
export const getMaterials = async (req, res) => {
  try {
    const materials = await Material.find().populate('location');
    res.status(200).json(materials);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get a single material by ID
// @route   GET /api/materials/:id
// @access  Private
export const getMaterialById = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id).populate('location');

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    res.status(200).json(material);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching material', error: error.message });
  }
};

// @desc    Create a new material
// @route   POST /api/materials
// @access  Private
export const createMaterial = async (req, res) => {
  try {
    const material = await Material.create(req.body);

    // Optional: trigger low inventory check on creation
    if (material.quantity < 5) {
      await sendEmail({
        to: 'you@example.com', // You can dynamically replace this later
        subject: '⚠️ Low Inventory Alert',
        html: `<p>The item <strong>${material.name}</strong> is running low (only ${material.quantity} left).</p>`,
      });
    }

    res.status(201).json(material);
  } catch (error) {
    res.status(400).json({ message: 'Error creating material', error: error.message });
  }
};

// @desc    Update a material
// @route   PUT /api/materials/:id
// @access  Private
export const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Material.findByIdAndUpdate(id, req.body, { new: true });

    if (!updated) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // 🔔 Send low inventory email
    if (updated.quantity < 5) {
      await sendEmail({
        to: 'you@example.com', // You can change to admin or config
        subject: '⚠️ Low Inventory Alert',
        html: `<p>The item <strong>${updated.name}</strong> is running low (only ${updated.quantity} left).</p>`,
      });
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating material', error: error.message });
  }
};

// @desc    Delete a material
// @route   DELETE /api/materials/:id
// @access  Private
export const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Material.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Material not found' });
    }

    res.status(200).json({ message: 'Material deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting material', error: error.message });
  }
};
