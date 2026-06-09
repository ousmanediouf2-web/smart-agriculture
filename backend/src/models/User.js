const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'farmer', 'viewer'], default: 'farmer' },
  phone: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  isValidated: { type: Boolean, default: false }, // ← admin doit valider le compte
  lastLogin: Date,
  notificationPrefs: {
    sms: { type: Boolean, default: true },
    critical: { type: Boolean, default: true },
    daily: { type: Boolean, default: false }
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(pwd) {
  return bcrypt.compare(pwd, this.password);
};

module.exports = mongoose.model('User', userSchema);
