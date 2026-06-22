import Material from '../models/Material.js';
import Activity from '../models/Activity.js';
import sendEmail from '../utils/sendEmail.js';

export const getMaterials = async (req, res) => {
  try {
    const materials = await Material.find().populate('location').populate('category');
    res.status(200).json(materials);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getMaterialById = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id).populate('location').populate('category');
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }
    res.status(200).json(material);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching material', error: error.message });
  }
};

export const createMaterial = async (req, res) => {
  try {
    const material = await Material.create(req.body);

    try {
      await Activity.create({
        type: 'material_added',
        message: `Material "${material.name}" was added`,
        user: req.user?.email,
      });
      sendEmail({
        to: 'stephenwaldrip90@gmail.com',
        subject: '📦 New Material Added',
        html: `<p><strong>${req.user?.email}</strong> added a new material: <strong>${material.name}</strong> (Qty: ${material.quantity})</p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    if (material.quantity < 5) {
      try {
        await Activity.create({
          type: 'low_inventory',
          message: `Low inventory alert: "${material.name}" has only ${material.quantity} left`,
          user: req.user?.email,
        });
        sendEmail({
          to: 'stephenwaldrip90@gmail.com',
          subject: '⚠️ Low Inventory Alert',
          html: `<p>The item <strong>${material.name}</strong> is running low (only ${material.quantity} left).</p>`,
        });
      } catch (emailErr) {
        console.warn('Low inventory email failed:', emailErr.message);
      }
    }

    res.status(201).json(material);
  } catch (error) {
    res.status(400).json({ message: 'Error creating material', error: error.message });
  }
};

export const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Material.findByIdAndUpdate(id, req.body, { new: true });

    if (!updated) {
      return res.status(404).json({ message: 'Material not found' });
    }

    try {
      await Activity.create({
        type: 'material_updated',
        message: `Material "${updated.name}" was updated`,
        user: req.user?.email,
      });
      sendEmail({
        to: 'stephenwaldrip90@gmail.com',
        subject: '✏️ Material Updated',
        html: `<p><strong>${req.user?.email}</strong> updated material: <strong>${updated.name}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    if (updated.quantity < 5) {
      try {
        await Activity.create({
          type: 'low_inventory',
          message: `Low inventory alert: "${updated.name}" has only ${updated.quantity} left`,
          user: req.user?.email,
        });
        sendEmail({
          to: 'stephenwaldrip90@gmail.com',
          subject: '⚠️ Low Inventory Alert',
          html: `<p>The item <strong>${updated.name}</strong> is running low (only ${updated.quantity} left).</p>`,
        });
      } catch (emailErr) {
        console.warn('Low inventory email failed:', emailErr.message);
      }
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating material', error: error.message });
  }
};

export const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Material.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Material not found' });
    }

    try {
      await Activity.create({
        type: 'material_deleted',
        message: `Material "${deleted.name}" was deleted`,
        user: req.user?.email,
      });
      sendEmail({
        to: 'stephenwaldrip90@gmail.com',
        subject: '🗑️ Material Deleted',
        html: `<p><strong>${req.user?.email}</strong> deleted material: <strong>${deleted.name}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    res.status(200).json({ message: 'Material deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting material', error: error.message });
  }
};