const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Major:
 *       type: object
 *       required:
 *         - schoolId
 *         - name
 *         - code
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the major
 *         schoolId:
 *           type: string
 *           description: The school ID this major belongs to
 *         name:
 *           type: string
 *           description: The name of the major/program
 *         code:
 *           type: string
 *           description: The code of the major/program
 *         description:
 *           type: string
 *           description: The description of the major/program
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the major was created
 *       example:
 *         schoolId: "507f1f77bcf86cd799439011"
 *         name: "Computer Science"
 *         code: "CS"
 *         description: "Bachelor of Science in Computer Science"
 */

const majorSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required']
  },
  name: {
    type: String,
    required: [true, 'Major name is required'],
    trim: true,
    maxlength: [100, 'Major name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Major code is required'],
    trim: true,
    uppercase: true,
    maxlength: [10, 'Major code cannot exceed 10 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
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

// Virtual for students count in this major
majorSchema.virtual('studentsCount', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'majorId',
  count: true
});

// Virtual for courses count in this major
majorSchema.virtual('coursesCount', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'majorId',
  count: true
});

// Compound index for unique major code per school
majorSchema.index({ schoolId: 1, code: 1 }, { unique: true });
majorSchema.index({ schoolId: 1, name: 1 });

module.exports = mongoose.model('Major', majorSchema); 