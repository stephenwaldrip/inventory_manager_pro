import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['material_added', 'material_updated', 'material_deleted', 'user_login', 'user_added', 'low_inventory'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    user: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Activity', activitySchema);