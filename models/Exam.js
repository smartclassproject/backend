const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Exam:
 *       type: object
 *       required:
 *         - schoolId
 *         - courseId
 *         - scheduleId
 *         - teacherId
 *         - title
 *         - examDate
 *         - examTime
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the exam
 *         schoolId:
 *           type: string
 *           description: The school ID this exam belongs to
 *         courseId:
 *           type: string
 *           description: The course ID this exam belongs to
 *         scheduleId:
 *           type: string
 *           description: The schedule ID this exam belongs to
 *         teacherId:
 *           type: string
 *           description: The teacher ID who created this exam
 *         title:
 *           type: string
 *           description: The title of the exam
 *         description:
 *           type: string
 *           description: Additional description or instructions
 *         examDate:
 *           type: string
 *           format: date
 *           description: The date of the exam
 *         examTime:
 *           type: string
 *           format: time
 *           description: The time of the exam (HH:MM format)
 *         duration:
 *           type: number
 *           description: Duration of exam in minutes
 *         maxScore:
 *           type: number
 *           description: Maximum score for the exam
 *         reportUrl:
 *           type: string
 *           description: URL to the exam report file
 *         isPublished:
 *           type: boolean
 *           description: Whether the exam is published to students
 *           default: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the exam was created
 *       example:
 *         schoolId: "507f1f77bcf86cd799439011"
 *         courseId: "507f1f77bcf86cd799439012"
 *         scheduleId: "507f1f77bcf86cd799439013"
 *         teacherId: "507f1f77bcf86cd799439014"
 *         title: "Midterm Exam"
 *         description: "Covering chapters 1-5"
 *         examDate: "2024-03-15"
 *         examTime: "09:00"
 *         duration: 120
 *         maxScore: 100
 *         isPublished: true
 */

const examSchema = new mongoose.Schema({
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
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseSchedule',
    required: false // Made optional - exams don't need to be tied to a schedule
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, 'Teacher ID is required']
  },
  title: {
    type: String,
    required: [true, 'Exam title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  examDate: {
    type: Date,
    required: [true, 'Exam date is required']
  },
  examTime: {
    type: String,
    required: [true, 'Exam time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Exam time must be in HH:MM format']
  },
  duration: {
    type: Number,
    min: [1, 'Duration must be at least 1 minute'],
    max: [480, 'Duration cannot exceed 480 minutes (8 hours)'],
    default: 120
  },
  maxScore: {
    type: Number,
    min: [1, 'Max score must be at least 1'],
    default: 100
  },
  reportUrl: {
    type: String,
    trim: true
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
examSchema.index({ schoolId: 1 });
examSchema.index({ courseId: 1 });
examSchema.index({ scheduleId: 1 });
examSchema.index({ teacherId: 1 });
examSchema.index({ examDate: 1 });
examSchema.index({ isPublished: 1 });

module.exports = mongoose.model('Exam', examSchema);
