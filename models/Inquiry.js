const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'responses.authorModel' },
  authorModel: { type: String, enum: ['AdminUser', 'StudentUser', 'ParentUser'], required: true },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const inquirySchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  requesterId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'requesterModel' },
  requesterModel: { type: String, enum: ['StudentUser', 'ParentUser'], required: true },
  requesterType: { type: String, enum: ['STUDENT', 'PARENT'], required: true },
  subject: { type: String, required: true, trim: true, maxlength: 200 },
  category: { type: String, enum: ['fees', 'academics', 'discipline', 'general'], default: 'general' },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], default: 'OPEN' },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  responses: { type: [responseSchema], default: [] }
}, { timestamps: true });

inquirySchema.index({ schoolId: 1, status: 1, createdAt: -1 });
inquirySchema.index({ requesterId: 1, requesterModel: 1, createdAt: -1 });

module.exports = mongoose.model('Inquiry', inquirySchema);
