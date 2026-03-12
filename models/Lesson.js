const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Lesson:
 *       type: object
 *       required:
 *         - schoolId
 *         - courseId
 *         - scheduleId
 *         - teacherId
 *         - title
 *         - lessonDate
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the lesson
 *         schoolId:
 *           type: string
 *           description: The school ID this lesson belongs to
 *         courseId:
 *           type: string
 *           description: The course ID this lesson belongs to
 *         scheduleId:
 *           type: string
 *           description: The schedule ID this lesson belongs to
 *         teacherId:
 *           type: string
 *           description: The teacher ID who created this lesson
 *         title:
 *           type: string
 *           description: The title of the lesson
 *         description:
 *           type: string
 *           description: Lesson content or description
 *         lessonDate:
 *           type: string
 *           format: date
 *           description: The date of the lesson
 *         materials:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the material
 *               url:
 *                 type: string
 *                 description: URL to the material
 *               type:
 *                 type: string
 *                 enum: [pdf, video, link, document]
 *                 description: Type of material
 *         isPublished:
 *           type: boolean
 *           description: Whether the lesson is published to students
 *           default: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the lesson was created
 *       example:
 *         schoolId: "507f1f77bcf86cd799439011"
 *         courseId: "507f1f77bcf86cd799439012"
 *         scheduleId: "507f1f77bcf86cd799439013"
 *         teacherId: "507f1f77bcf86cd799439014"
 *         title: "Introduction to JavaScript"
 *         description: "Basic concepts of JavaScript programming"
 *         lessonDate: "2024-03-10"
 *         materials:
 *           - name: "Lecture Slides"
 *             url: "https://example.com/slides.pdf"
 *             type: "pdf"
 *         isPublished: true
 */

const materialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Material name is required'],
    trim: true,
    maxlength: [200, 'Material name cannot exceed 200 characters']
  },
  url: {
    type: String,
    required: [true, 'Material URL is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['pdf', 'video', 'link', 'document'],
    default: 'link'
  }
}, { _id: false });

const lessonSchema = new mongoose.Schema({
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
    required: [true, 'Schedule ID is required']
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, 'Teacher ID is required']
  },
  title: {
    type: String,
    required: [true, 'Lesson title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  lessonDate: {
    type: Date,
    required: [true, 'Lesson date is required']
  },
  materials: {
    type: [materialSchema],
    default: []
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
lessonSchema.index({ schoolId: 1 });
lessonSchema.index({ courseId: 1 });
lessonSchema.index({ scheduleId: 1 });
lessonSchema.index({ teacherId: 1 });
lessonSchema.index({ lessonDate: 1 });
lessonSchema.index({ isPublished: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
