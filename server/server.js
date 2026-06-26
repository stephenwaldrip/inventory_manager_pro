import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

import connectDB from './config/db.js';
import materialsRoutes from './routes/materialsRoutes.js';
import locationsRoutes from './routes/locationsRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoriesRoutes from './routes/categoriesRoutes.js';
import authRoutes from './routes/authRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';

dotenv.config();

// Fail fast on a missing or weak JWT secret rather than signing forgeable tokens.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET is missing or too short (need >= 32 chars). Set a strong secret in the environment.');
  process.exit(1);
}

connectDB();

const app = express();

app.disable('x-powered-by');
app.use(helmet());
// Lock CORS to the known client origin in production; fall back to permissive in dev.
app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize());

// Throttle auth endpoints to slow brute-force and reset-spam.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});
app.use('/api/auth', authLimiter);

// Health check route — keeps Render free tier awake via cron ping
app.get('/api/health', (req, res) => {
  console.log(`Health check pinged at ${new Date().toISOString()}`);
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/materials', materialsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/announcements', announcementRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});