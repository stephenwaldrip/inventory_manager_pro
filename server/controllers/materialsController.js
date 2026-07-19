import Material from '../models/Material.js';
import Activity from '../models/Activity.js';
import sendEmail from '../utils/sendEmail.js';
import { html } from '../utils/html.js';

export const getMaterials = async (req, res) => {
  try {
    const materials = await Material.find({ tenantId: req.tenantId })
      .populate('location')
      .populate('category');
    res.status(200).json(materials);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getMaterialById = async (req, res) => {
  try {
    const material = await Material.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('location')
      .populate('category');
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
    // tenantId comes last so a client-supplied one in req.body can't override it.
    const material = await Material.create({ ...req.body, tenantId: req.tenantId });

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'material_added',
        message: `Material "${material.name}" was added`,
        user: req.user?.email,
      });
      sendEmail({
        to: req.user?.email,
        subject: '📦 New Material Added',
        html: html`<p><strong>${req.user?.email}</strong> added a new material: <strong>${material.name}</strong> (Qty: ${material.quantity})</p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    if (material.quantity < 5) {
      try {
        await Activity.create({
          tenantId: req.tenantId,
          type: 'low_inventory',
          message: `Low inventory alert: "${material.name}" has only ${material.quantity} left`,
          user: req.user?.email,
        });
        sendEmail({
          to: req.user?.email,
          subject: '⚠️ Low Inventory Alert',
          html: html`<p>The item <strong>${material.name}</strong> is running low (only ${material.quantity} left).</p>`,
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
    // Strip tenantId from the payload so an update can't move a doc to another org.
    const { tenantId, ...updates } = req.body;
    const updated = await Material.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId },
      updates,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Material not found' });
    }

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'material_updated',
        message: `Material "${updated.name}" was updated`,
        user: req.user?.email,
      });
      sendEmail({
        to: req.user?.email,
        subject: '✏️ Material Updated',
        html: html`<p><strong>${req.user?.email}</strong> updated material: <strong>${updated.name}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    if (updated.quantity < 5) {
      try {
        await Activity.create({
          tenantId: req.tenantId,
          type: 'low_inventory',
          message: `Low inventory alert: "${updated.name}" has only ${updated.quantity} left`,
          user: req.user?.email,
        });
        sendEmail({
          to: req.user?.email,
          subject: '⚠️ Low Inventory Alert',
          html: html`<p>The item <strong>${updated.name}</strong> is running low (only ${updated.quantity} left).</p>`,
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
    const deleted = await Material.findOneAndDelete({ _id: id, tenantId: req.tenantId });

    if (!deleted) {
      return res.status(404).json({ message: 'Material not found' });
    }

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'material_deleted',
        message: `Material "${deleted.name}" was deleted`,
        user: req.user?.email,
      });
      sendEmail({
        to: req.user?.email,
        subject: '🗑️ Material Deleted',
        html: html`<p><strong>${req.user?.email}</strong> deleted material: <strong>${deleted.name}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    res.status(200).json({ message: 'Material deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting material', error: error.message });
  }
};