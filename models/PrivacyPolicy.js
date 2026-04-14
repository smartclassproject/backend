const mongoose = require('mongoose');

const privacyPolicySchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' }, // optional: null means global
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 50000 },
    version: { type: String, trim: true, maxlength: 40 },
    isActive: { type: Boolean, default: true },
    publishedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true }
);

privacyPolicySchema.index({ schoolId: 1, isActive: 1, publishedAt: -1 });

module.exports = mongoose.model('PrivacyPolicy', privacyPolicySchema);
