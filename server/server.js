import dotenv from 'dotenv';

import connectDB from './config/db.js';
import createApp from './app.js';

dotenv.config();

// Fail fast on a missing or weak JWT secret rather than signing forgeable tokens.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET is missing or too short (need >= 32 chars). Set a strong secret in the environment.');
  process.exit(1);
}

connectDB();

const app = createApp();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
