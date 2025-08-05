const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     WeeklySession:
 *       type: object
 *       required:
 *         - day
 *         - startTime
 *         - endTime
 *       properties:
 *         day:
 *           type: string
 *           enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *           description: The day of the week
 *         startTime:
 *           type: string
 *           format: time
 *           description: The start time of the session (HH:MM format)
 *         endTime:
 *           type: string
 *           format: time
 *           description: The end time of the session (HH:MM format)
 *       example:
 *         day: "Monday"
 *         startTime: "09:00"
 *         endTime: "10:30"
 *     
 *     CourseSchedule:
 *       type: object
 *       required:
 *         - courseId
 *         - schoolId
 *         - classroom
 *         - teacherId
 *         - startDate
 *         - endDate
 *         - weeklySessions
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the course schedule
 *         courseId:
 *           type: string
 *           description: The course ID this schedule belongs to
 *         schoolId:
 *           type: string
 *           description: The school ID this schedule belongs to
 *         classroom:
 *           type: string
 *           description: The classroom where the course is held
 *         teacherId:
 *           type: string
 *           description: The teacher ID assigned to this course
 *         startDate:
 *           type: string
 *           format: date
 *           description: The start date of the semester/term
 *         endDate:
 *           type: string
 *           format: date
 *           description: The end date of the semester/term
 *         weeklySessions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/WeeklySession'
 *           description: The weekly recurring sessions
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the schedule was created
 *       example:
 *         courseId: "507f1f77bcf86cd799439013"
 *         schoolId: "507f1f77bcf86cd799439011"
 *         classroom: "Room 101"
 *         teacherId: "507f1f77bcf86cd799439014"
 *         startDate: "2024-01-15"
 *         endDate: "2024-05-15"
 *         weeklySessions:
 *           - day: "Monday"
 *             startTime: "09:00"
 *             endTime: "10:30"
 *           - day: "Wednesday"
 *             startTime: "09:00"
 *             endTime: "10:30"
 */

const weeklySessionSchema = new mongoose.Schema({
  day: {
    type: String,
    required: [true, 'Day is required'],
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
  }
}, { _id: false });

const courseScheduleSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required']
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required']
  },
  classroom: {
    type: String,
    required: [true, 'Classroom is required'],
    trim: true,
    maxlength: [50, 'Classroom cannot exceed 50 characters']
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, 'Teacher ID is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  weeklySessions: {
    type: [weeklySessionSchema],
    required: [true, 'Weekly sessions are required'],
    validate: {
      validator: function(sessions) {
        return sessions.length > 0;
      },
      message: 'At least one weekly session is required'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxStudents: {
    type: Number,
    min: [1, 'Max students must be at least 1'],
    default: 30
  },
  currentStudents: {
    type: Number,
    default: 0,
    min: [0, 'Current students cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for attendance count for this schedule
courseScheduleSchema.virtual('attendanceCount', {
  ref: 'Attendance',
  localField: '_id',
  foreignField: 'scheduleId',
  count: true
});

// Virtual to check if schedule is currently active
courseScheduleSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now && this.isActive;
});

// Virtual for available seats
courseScheduleSchema.virtual('availableSeats').get(function() {
  return this.maxStudents - this.currentStudents;
});

// Method to validate time conflicts
courseScheduleSchema.methods.hasTimeConflict = function(otherSchedule) {
  if (this._id.equals(otherSchedule._id)) return false;
  
  const thisStart = new Date(this.startDate);
  const thisEnd = new Date(this.endDate);
  const otherStart = new Date(otherSchedule.startDate);
  const otherEnd = new Date(otherSchedule.endDate);
  
  // Check if date ranges overlap
  if (thisStart > otherEnd || thisEnd < otherStart) return false;
  
  // Check if any weekly sessions overlap
  for (const thisSession of this.weeklySessions) {
    for (const otherSession of otherSchedule.weeklySessions) {
      if (thisSession.day === otherSession.day) {
        // Check if time ranges overlap
        if (thisSession.startTime < otherSession.endTime && 
            thisSession.endTime > otherSession.startTime) {
          return true;
        }
      }
    }
  }
  
  return false;
};

// Indexes for better query performance
courseScheduleSchema.index({ schoolId: 1 });
courseScheduleSchema.index({ courseId: 1 });
courseScheduleSchema.index({ teacherId: 1 });
courseScheduleSchema.index({ classroom: 1 });
courseScheduleSchema.index({ startDate: 1, endDate: 1 });
courseScheduleSchema.index({ isActive: 1 });

module.exports = mongoose.model('CourseSchedule', courseScheduleSchema); 