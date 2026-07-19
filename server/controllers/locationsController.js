import Location from '../models/Location.js';
import Activity from '../models/Activity.js';
import sendEmail from '../utils/sendEmail.js';
import { html } from '../utils/html.js';

const createLocation = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ message: 'Name is required' });

    // Uniqueness is per-org, so check within this tenant only.
    const locationExists = await Location.findOne({ name, tenantId: req.tenantId });
    if (locationExists) return res.status(400).json({ message: 'Location already exists' });

    const location = await Location.create({ name, description, tenantId: req.tenantId });

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'material_added',
        message: `Location "${name}" was created`,
        user: req.user?.email,
      });
      sendEmail({
        to: req.user?.email,
        subject: '📍 New Location Created',
        html: html`<p><strong>${req.user?.email}</strong> created a new location: <strong>${name}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    res.status(201).json(location);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLocations = async (req, res) => {
  try {
    const locations = await Location.find({ tenantId: req.tenantId });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLocationById = async (req, res) => {
  try {
    const location = await Location.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!location) return res.status(404).json({ message: 'Location not found' });
    res.json(location);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateLocation = async (req, res) => {
  try {
    // Strip tenantId so an update can't move a doc to another org.
    const { tenantId, ...updates } = req.body;
    const location = await Location.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      updates,
      { new: true }
    );
    if (!location) return res.status(404).json({ message: 'Location not found' });

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'material_updated',
        message: `Location "${location.name}" was updated`,
        user: req.user?.email,
      });
      sendEmail({
        to: req.user?.email,
        subject: '✏️ Location Updated',
        html: html`<p><strong>${req.user?.email}</strong> updated location: <strong>${location.name}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    res.json(location);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteLocation = async (req, res) => {
  try {
    const location = await Location.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!location) return res.status(404).json({ message: 'Location not found' });

    try {
      await Activity.create({
        tenantId: req.tenantId,
        type: 'material_deleted',
        message: `Location "${location.name}" was deleted`,
        user: req.user?.email,
      });
      sendEmail({
        to: req.user?.email,
        subject: '🗑️ Location Deleted',
        html: html`<p><strong>${req.user?.email}</strong> deleted location: <strong>${location.name}</strong></p>`,
      });
    } catch (actErr) {
      console.warn('Activity/email failed:', actErr.message);
    }

    res.json({ message: 'Location deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  createLocation,
  getLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
};