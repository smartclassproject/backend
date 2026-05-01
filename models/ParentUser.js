const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const parentUserSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  studentIdRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentId: { type: String, required: true, trim: true, index: true },
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  createdByRole: { type: String, default: null, trim: true },
  createdByModel: { type: String, default: null, trim: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true },
  phoneNumber: { type: String, trim: true },
  password: { type: String },
  passwordSetup: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastLogin: Date
}, { timestamps: true });

parentUserSchema.index({ schoolId: 1, studentIdRef: 1, firstName: 1 }, { unique: true });

parentUserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('ParentUser', parentUserSchema);
