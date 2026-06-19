// server/routes/userRoutes.js
import express from 'express';
import {
  getUsers,
  createUser,
  deleteUser,
} from '../controllers/userController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, adminOnly, getUsers)
  .post(protect, adminOnly, createUser);

router.route('/:id')
  .delete(protect, adminOnly, deleteUser);

export default router;
