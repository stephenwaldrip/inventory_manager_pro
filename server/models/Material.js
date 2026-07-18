import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a material name'],
    },
    type: {
      type: String,
      required: [true, 'Please specify a type'],
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: false,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: false,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Material = mongoose.model('Material', materialSchema);
export default Material;