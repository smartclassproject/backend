const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    uploadedById: { type: mongoose.Schema.Types.ObjectId, required: true },
    uploadedByModel: { type: String, enum: ['AdminUser', 'TeacherUser', 'StudentUser', 'ParentUser'], required: true },
    context: { type: String, required: true, trim: true },
    storagePath: { type: String, required: true, trim: true },
    publicUrl: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    category: { type: String, enum: ['image', 'video', 'document', 'other'], required: true },
    originalName: { type: String, trim: true },
    extension: { type: String, trim: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

schema.index({ schoolId: 1, context: 1, createdAt: -1 });
schema.index({ uploadedById: 1, uploadedByModel: 1, createdAt: -1 });

module.exports = mongoose.model('FileAsset', schema);
