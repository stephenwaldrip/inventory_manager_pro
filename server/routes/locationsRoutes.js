// server/routes/locationsRoutes.js
import express from 'express';
import {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../controllers/locationsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getLocations)
  .post(protect, createLocation);

router.route('/:id')
  .get(protect, getLocationById)
  .put(protect, updateLocation)
  .delete(protect, deleteLocation);

export default router;
