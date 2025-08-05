const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       required:
 *         - schoolId
 *         - majorId
 *         - name
 *         - code
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the course
 *         schoolId:
 *           type: string
 *           description: The school ID this course belongs to
 *         majorId:
 *           type: string
 *           description: The major ID this course belongs to
 *         name:
 *           type: string
 *           description: The name of the course
 *         code:
 *           type: string
 *           description: The code of the course
 *         description:
 *           type: string
 *           description: The description of the course
 *         credits:
 *           type: number
 *           description: The number of credits for this course
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the course was created
 *       example:
 *         schoolId: "507f1f77bcf86cd799439011"
 *         majorId: "507f1f77bcf86cd799439012"
 *         name: "Introduction to Programming"
 *         code: "CS101"
 *         description: "Basic programming concepts and practices"
 *         credits: 3
 */

const courseSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required']
  },
  majorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Major',
    required: [true, 'Major ID is required']
  },
  name: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true,
    maxlength: [100, 'Course name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Course code is required'],
    trim: true,
    uppercase: true,
    maxlength: [15, 'Course code cannot exceed 15 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  credits: {
    type: Number,
    min: [1, 'Credits must be at least 1'],
    max: [10, 'Credits cannot exceed 10'],
    default: 3
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

// Virtual for schedules count for this course
courseSchema.virtual('schedulesCount', {
  ref: 'CourseSchedule',
  localField: '_id',
  foreignField: 'courseId',
  count: true
});

// Virtual for attendance count for this course
courseSchema.virtual('attendanceCount', {
  ref: 'Attendance',
  localField: '_id',
  foreignField: 'courseId',
  count: true
});

// Compound index for unique course code per school
courseSchema.index({ schoolId: 1, code: 1 }, { unique: true });
courseSchema.index({ schoolId: 1, majorId: 1 });
courseSchema.index({ majorId: 1 });

module.exports = mongoose.model('Course', courseSchema); 