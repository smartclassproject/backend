const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  academicYear: { type: Number, min: 2000, max: 2100 },
  term: { type: Number, min: 1, max: 6 },
  currency: { type: String, default: 'RWF', uppercase: true, trim: true, maxlength: 10 },
  totalAmountDue: { type: Number, required: true, min: 0, default: 0 },
  totalAmountPaid: { type: Number, required: true, min: 0, default: 0 },
  balance: { type: Number, required: true, min: 0, default: 0 },
  status: { type: String, enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'UNDER_REVIEW'], default: 'UNPAID' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
}, { timestamps: true });

schema.index({ schoolId: 1, studentId: 1, academicYear: 1, term: 1 }, { unique: true });
schema.index({ schoolId: 1, status: 1 });

schema.pre('validate', function(next) {
  this.balance = Math.max(0, (this.totalAmountDue || 0) - (this.totalAmountPaid || 0));
  if (this.balance === 0 && this.totalAmountDue > 0) this.status = 'PAID';
  else if ((this.totalAmountPaid || 0) === 0) this.status = 'UNPAID';
  else this.status = 'PARTIALLY_PAID';
  next();
});

module.exports = mongoose.model('StudentFeeAccount', schema);
