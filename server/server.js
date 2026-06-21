import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import connectDB from './config/db.js';
import materialsRoutes from './routes/materialsRoutes.js';
import locationsRoutes from './routes/locationsRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoriesRoutes from './routes/categoriesRoutes.js';
import authRoutes from './routes/authRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Health check route — keeps Render free tier awake via cron ping
app.get('/api/health', (req, res) => {
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