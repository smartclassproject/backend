const mongoose = require('mongoose');

/**
 * Material Schema for study materials (PDF, PPT, videos, images, etc.)
 */
const materialSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required']
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required']
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, 'Teacher ID is required']
  },
  title: {
    type: String,
    required: [true, 'Material title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    enum: ['pdf', 'ppt', 'pptx', 'video', 'image', 'document', 'other'],
    lowercase: true
  },
  fileUrl: {
    type: String,
    required: [true, 'File URL is required'],
    trim: true
  },
  fileName: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number, // Size in bytes
    min: [0, 'File size cannot be negative']
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
materialSchema.index({ schoolId: 1 });
materialSchema.index({ courseId: 1 });
materialSchema.index({ teacherId: 1 });
materialSchema.index({ fileType: 1 });
materialSchema.index({ isPublished: 1 });
materialSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Material', materialSchema);
