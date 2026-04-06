const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  submittedByType: { type: String, enum: ['PARENT', 'STUDENT'], required: true },
  submittedById: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'submittedByModel' },
  submittedByModel: { type: String, enum: ['ParentUser', 'StudentUser'], required: true },
  amountSubmitted: { type: Number, required: true, min: 0.01 },
  paymentMethod: { type: String, enum: ['BANK_TRANSFER', 'MOMO', 'CASH_REFERENCE'], required: true },
  paymentReference: { type: String, trim: true, maxlength: 200 },
  paidAt: Date,
  proofUrl: { type: String, trim: true },
  notes: { type: String, trim: true, maxlength: 2000 },
  verificationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  verifiedAt: Date,
  rejectionReason: { type: String, trim: true, maxlength: 1000 }
}, { timestamps: true });

schema.index({ schoolId: 1, verificationStatus: 1, createdAt: -1 });
schema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.model('FeePaymentSubmission', schema);
