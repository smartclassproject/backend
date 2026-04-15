const mongoose = require('mongoose');

const SEASONS = ['fall', 'spring', 'summer', 'winter'];

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  /** Stable key: e.g. `fall-2026`, `school-wide`, `legacy-2026-t1`. Unique with school + student. */
  feeBucketKey: { type: String, required: true, trim: true, maxlength: 64 },
  /** Set for cohort-scoped fees (bulk or future single-student cohort). Omitted for legacy / school-wide rows. */
  enrollmentSeason: { type: String, enum: SEASONS },
  enrollmentCohortYear: { type: Number, min: 2000, max: 2100 },
  academicYear: { type: Number, min: 2000, max: 2100 },
  term: { type: Number, min: 1, max: 6 },
  currency: { type: String, default: 'RWF', uppercase: true, trim: true, maxlength: 10 },
  totalAmountDue: { type: Number, required: true, min: 0, default: 0 },
  totalAmountPaid: { type: Number, required: true, min: 0, default: 0 },
  balance: { type: Number, required: true, min: 0, default: 0 },
  status: { type: String, enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'UNDER_REVIEW'], default: 'UNPAID' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
}, { timestamps: true });

schema.index({ schoolId: 1, studentId: 1, feeBucketKey: 1 }, { unique: true });
schema.index({ schoolId: 1, status: 1 });

schema.pre('validate', function(next) {
  if (!this.feeBucketKey) {
    if (this.enrollmentSeason && this.enrollmentCohortYear != null && this.enrollmentCohortYear !== '') {
      const s = String(this.enrollmentSeason).toLowerCase();
      this.feeBucketKey = `${s}-${Number(this.enrollmentCohortYear)}`;
      this.enrollmentSeason = s;
    } else if (this.academicYear != null || this.term != null) {
      this.feeBucketKey = `legacy-${this.academicYear ?? 'null'}-t${this.term ?? 'null'}`;
    } else {
      this.feeBucketKey = 'school-wide';
    }
  }
  this.balance = Math.max(0, (this.totalAmountDue || 0) - (this.totalAmountPaid || 0));
  if (this.balance === 0 && this.totalAmountDue > 0) this.status = 'PAID';
  else if ((this.totalAmountPaid || 0) === 0) this.status = 'UNPAID';
  else this.status = 'PARTIALLY_PAID';
  next();
});

module.exports = mongoose.model('StudentFeeAccount', schema);
