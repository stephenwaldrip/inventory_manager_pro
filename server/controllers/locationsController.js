import Location from '../models/Location.js';
import Activity from '../models/Activity.js';
import sendEmail from '../utils/sendEmail.js';

const ADMIN_EMAIL = 'stephenwaldrip90@gmail.com';

const createLocation = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ message: 'Name is required' });

    const locationExists = await Location.findOne({ name });
    if (locationExists) return res.status(400).json({ message: 'Location already exists' });

    const location = await Location.create({ name, description });

    try {
      await Activity.create({
        type: 'material_added',
        message: `Location "${name}" was created`,
        user: req.user?.email,
      });
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: '📍 New Location Created',
        html: `<p><strong>${req.user?.email}</strong> created a new location: <strong>${name}</strong></p>`,
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
    const locations = await Location.find();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) return res.status(404).json({ message: 'Location not found' });
    res.json(location);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateLocation = async (req, res) => {
  try {
    const location = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!location) return res.status(404).json({ message: 'Location not found' });

    try {
      await Activity.create({
        type: 'material_updated',
        message: `Location "${location.name}" was updated`,
        user: req.user?.email,
      });
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: '✏️ Location Updated',
        html: `<p><strong>${req.user?.email}</strong> updated location: <strong>${location.name}</strong></p>`,
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
    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location) return res.status(404).json({ message: 'Location not found' });

    try {
      await Activity.create({
        type: 'material_deleted',
        message: `Location "${location.name}" was deleted`,
        user: req.user?.email,
      });
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: '🗑️ Location Deleted',
        html: `<p><strong>${req.user?.email}</strong> deleted location: <strong>${location.name}</strong></p>`,
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