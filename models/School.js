const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     School:
 *       type: object
 *       required:
 *         - name
 *         - location
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the school
 *         name:
 *           type: string
 *           description: The name of the school
 *         location:
 *           type: string
 *           description: The location/address of the school
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the school was created
 *       example:
 *         name: "ABC High School"
 *         location: "123 Main Street, City, State"
 */

const schoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'School name is required'],
    trim: true,
    maxlength: [100, 'School name cannot exceed 100 characters']
  },
  location: {
    type: String,
    required: [true, 'School location is required'],
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  numberOfTerms: {
    type: Number,
    default: 3,
    min: [1, 'At least 1 term is required'],
    max: [6, 'Cannot exceed 6 terms']
  },
  /** Which enrollment seasons (Fall/Spring/…) appear on student registration. School admin editable. */
  enrollmentSemestersEnabled: {
    type: [String],
    default: () => ['fall', 'spring', 'summer', 'winter'],
    validate: {
      validator(arr) {
        if (!Array.isArray(arr) || arr.length < 1) return false;
        const allowed = new Set(['fall', 'spring', 'summer', 'winter']);
        return arr.every((s) => allowed.has(String(s).toLowerCase()));
      },
      message: 'At least one valid season (fall, spring, summer, winter) is required'
    }
  },
  /** Optional default season when opening “add student” (must be in enrollmentSemestersEnabled). */
  defaultEnrollmentSemester: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator(v) {
        if (v === undefined || v === null || v === '') return true;
        return ['fall', 'spring', 'summer', 'winter'].includes(v);
      },
      message: 'Invalid default enrollment semester'
    }
  },
  /** Used in auto-generated student IDs (2–6 alphanumeric, uppercase). */
  shortCode: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [6, 'Short code cannot exceed 6 characters'],
    unique: true,
    sparse: true,
    match: [/^[A-Z0-9]{2,6}$/, 'Short code must be 2–6 letters or digits']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for students count
schoolSchema.virtual('studentsCount', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'schoolId',
  count: true
});

// Virtual for teachers count
schoolSchema.virtual('teachersCount', {
  ref: 'Teacher',
  localField: '_id',
  foreignField: 'schoolId',
  count: true
});

// Virtual for devices count
schoolSchema.virtual('devicesCount', {
  ref: 'Device',
  localField: '_id',
  foreignField: 'schoolId',
  count: true
});

// Index for better query performance
schoolSchema.index({ name: 1 });
schoolSchema.index({ location: 1 });

module.exports = mongoose.model('School', schoolSchema); 