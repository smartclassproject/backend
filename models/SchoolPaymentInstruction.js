const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, unique: true },
  bankName: { type: String, trim: true, maxlength: 120 },
  bankAccountName: { type: String, trim: true, maxlength: 120 },
  bankAccountNumber: { type: String, trim: true, maxlength: 120 },
  momoNumber: { type: String, trim: true, maxlength: 40 },
  momoAccountName: { type: String, trim: true, maxlength: 120 },
  instructionsText: { type: String, trim: true, maxlength: 2000 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('SchoolPaymentInstruction', schema);
