const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true, trim: true, maxlength: 5000 },
  targetAudience: [{ type: String, enum: ['ALL', 'TEACHERS', 'STUDENTS', 'PARENTS'], default: 'ALL' }],
  publishAt: { type: Date, default: Date.now },
  expiresAt: Date,
  isPinned: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'createdByModel', required: true },
  createdByModel: { type: String, enum: ['AdminUser', 'TeacherUser', 'SchoolStaff'], default: 'AdminUser' },
  createdByRole: { type: String, default: null, trim: true }
}, { timestamps: true });

announcementSchema.index({ schoolId: 1, isActive: 1, publishAt: -1 });
announcementSchema.index({ isPinned: 1, publishAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
