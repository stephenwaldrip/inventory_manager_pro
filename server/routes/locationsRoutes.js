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
import { requireActiveSubscription } from '../middleware/subscriptionMiddleware.js';

const router = express.Router();

// Reads stay open to a lapsed org; every write is gated.
router.route('/')
  .get(protect, getLocations)
  .post(protect, requireActiveSubscription, createLocation);

router.route('/:id')
  .get(protect, getLocationById)
  .put(protect, requireActiveSubscription, updateLocation)
  .delete(protect, requireActiveSubscription, deleteLocation);

export default router;
