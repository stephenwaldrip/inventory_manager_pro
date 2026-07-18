import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

import materialsRoutes from './routes/materialsRoutes.js';
import locationsRoutes from './routes/locationsRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoriesRoutes from './routes/categoriesRoutes.js';
import authRoutes from './routes/authRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';

// Builds and returns the configured Express app without connecting to the
// database or opening a listener. Kept separate from server.js so tests can
// import the app and drive it in-process.
export default function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  // Lock CORS to the known client origin in production; fall back to permissive in dev.
  app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
  app.use(express.json({ limit: '10kb' }));
  app.use(mongoSanitize());

  // Throttle auth endpoints to slow brute-force and reset-spam.
  // Disabled under test so a suite of auth requests isn't blocked by the limit.
  if (process.env.NODE_ENV !== 'test') {
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many attempts. Please try again later.' },
    });
    app.use('/api/auth', authLimiter);
  }

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

  return app;
}
