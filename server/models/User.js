import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  name: { type: String },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'user'],
    default: 'user',
  },
  active: {
    type: Boolean,
    default: true,
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  // Proof the person controls this address — set by clicking a verification
  // link, or by accepting an invite (which requires reading the same inbox).
  emailVerified: { type: Boolean, default: false },
  verifyToken: { type: String },
  verifyTokenExpires: { type: Date },
  // Per-account throttle for resends. The IP limiter on /api/auth doesn't bind
  // an attacker rotating addresses, and each resend sends mail on our behalf.
  verifySentAt: { type: Date },

  // Set when an admin invites someone, cleared when they accept. Combined with
  // emailVerified this is what makes an invite "pending".
  invitedAt: { type: Date },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

export default mongoose.model('User', userSchema);