// Reports any Organization records that share a slug.
//
// Run BEFORE relying on the unique slug index in production — if duplicates
// exist, Mongoose's index build will fail until they're resolved.
//
//   node scripts/checkDuplicateSlugs.js
//
// Exits 0 when clean, 1 when duplicates are found (so it can gate a deploy).
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import Organization from '../models/Organization.js';

dotenv.config();

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost/inventory';
  await mongoose.connect(uri);
  console.log(`Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

  const duplicates = await Organization.aggregate([
    { $group: { _id: '$slug', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ]);

  if (duplicates.length === 0) {
    console.log('✅ No duplicate organization slugs found. Safe to enforce the unique index.');
    return 0;
  }

  console.error(`❌ Found ${duplicates.length} duplicated slug(s):\n`);
  for (const d of duplicates) {
    console.error(`  slug "${d._id}" — ${d.count} organizations:`);
    for (const id of d.ids) console.error(`      ${id}`);
  }
  console.error('\nResolve these (rename/remove) before the unique index can build.');
  return 1;
}

main()
  .then(async (code) => {
    await mongoose.disconnect();
    process.exit(code);
  })
  .catch(async (err) => {
    console.error('Error running duplicate-slug check:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
