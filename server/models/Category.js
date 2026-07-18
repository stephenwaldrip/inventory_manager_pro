// server/models/Category.js
import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Name must be unique within an org, not globally
CategorySchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.model('Category', CategorySchema);