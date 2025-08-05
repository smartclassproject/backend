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