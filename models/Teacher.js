const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Teacher:
 *       type: object
 *       required:
 *         - schoolId
 *         - name
 *         - email
 *         - phone
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the teacher
 *         schoolId:
 *           type: string
 *           description: The school ID this teacher belongs to
 *         name:
 *           type: string
 *           description: The full name of the teacher
 *         email:
 *           type: string
 *           format: email
 *           description: The email address of the teacher
 *         phone:
 *           type: string
 *           description: The phone number of the teacher
 *         profileUrl:
 *           type: string
 *           description: The URL to the teacher's profile photo
 *         department:
 *           type: string
 *           description: The department the teacher belongs to
 *         specialization:
 *           type: string
 *           description: The teacher's area of specialization
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the teacher was created
 *       example:
 *         schoolId: "507f1f77bcf86cd799439011"
 *         name: "Dr. Jane Smith"
 *         email: "jane.smith@school.edu"
 *         phone: "+1234567890"
 *         department: "Computer Science"
 *         specialization: "Software Engineering"
 */

const teacherSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required']
  },
  name: {
    type: String,
    required: [true, 'Teacher name is required'],
    trim: true,
    maxlength: [100, 'Teacher name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  profileUrl: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters']
  },
  specialization: {
    type: String,
    trim: true,
    maxlength: [200, 'Specialization cannot exceed 200 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  hireDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for schedules count for this teacher
teacherSchema.virtual('schedulesCount', {
  ref: 'CourseSchedule',
  localField: '_id',
  foreignField: 'teacherId',
  count: true
});

// Virtual for active schedules count for this teacher
teacherSchema.virtual('activeSchedulesCount', {
  ref: 'CourseSchedule',
  localField: '_id',
  foreignField: 'teacherId',
  count: true,
  match: { 
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  }
});

// Indexes for better query performance
teacherSchema.index({ schoolId: 1 });
teacherSchema.index({ email: 1 });
teacherSchema.index({ name: 1 });
teacherSchema.index({ department: 1 });
teacherSchema.index({ isActive: 1 });

module.exports = mongoose.model('Teacher', teacherSchema); 