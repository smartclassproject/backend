const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Student:
 *       type: object
 *       required:
 *         - schoolId
 *         - name
 *         - studentId
 *         - cardId
 *         - majorId
 *         - class
 *         - age
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the student
 *         schoolId:
 *           type: string
 *           description: The school ID this student belongs to
 *         name:
 *           type: string
 *           description: The full name of the student
 *         studentId:
 *           type: string
 *           description: The unique student ID number
 *         cardId:
 *           type: string
 *           description: The RFID card identifier
 *         majorId:
 *           type: string
 *           description: The major/program ID this student is enrolled in
 *         class:
 *           type: string
 *           description: The class designation (A, B, C, etc.)
 *         age:
 *           type: number
 *           description: The age of the student
 *         profileUrl:
 *           type: string
 *           description: The URL to the student's profile photo
 *         email:
 *           type: string
 *           format: email
 *           description: The email address of the student
 *         phone:
 *           type: string
 *           description: The phone number of the student
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the student was created
 *       example:
 *         schoolId: "507f1f77bcf86cd799439011"
 *         name: "John Doe"
 *         studentId: "2024001"
 *         cardId: "RFID001"
 *         majorId: "507f1f77bcf86cd799439012"
 *         class: "A"
 *         age: 20
 *         email: "john.doe@student.edu"
 *         phone: "+1234567890"
 */

const studentSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required']
  },
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true,
    maxlength: [100, 'Student name cannot exceed 100 characters']
  },
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    trim: true,
    maxlength: [20, 'Student ID cannot exceed 20 characters']
  },
  cardId: {
    type: String,
    required: [true, 'RFID card ID is required'],
    trim: true,
    maxlength: [50, 'Card ID cannot exceed 50 characters']
  },
  majorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Major',
    required: [true, 'Major ID is required']
  },
  class: {
    type: String,
    required: [true, 'Class is required'],
    trim: true,
    maxlength: [10, 'Class cannot exceed 10 characters']
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [16, 'Age must be at least 16'],
    max: [100, 'Age cannot exceed 100']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  profileUrl: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for attendance count
studentSchema.virtual('attendanceCount', {
  ref: 'Attendance',
  localField: '_id',
  foreignField: 'studentId',
  count: true
});

// Virtual for present attendance count
studentSchema.virtual('presentCount', {
  ref: 'Attendance',
  localField: '_id',
  foreignField: 'studentId',
  count: true,
  match: { status: 'Present' }
});

// Virtual for absent attendance count
studentSchema.virtual('absentCount', {
  ref: 'Attendance',
  localField: '_id',
  foreignField: 'studentId',
  count: true,
  match: { status: 'Absent' }
});

// Virtual for late attendance count
studentSchema.virtual('lateCount', {
  ref: 'Attendance',
  localField: '_id',
  foreignField: 'studentId',
  count: true,
  match: { status: 'Late' }
});

// Indexes for better query performance
studentSchema.index({ schoolId: 1 });
studentSchema.index({ majorId: 1 });
studentSchema.index({ studentId: 1 });
studentSchema.index({ cardId: 1 });
studentSchema.index({ name: 1 });
studentSchema.index({ class: 1 });
studentSchema.index({ isActive: 1 });

module.exports = mongoose.model('Student', studentSchema); 