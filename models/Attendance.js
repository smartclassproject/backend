const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Attendance:
 *       type: object
 *       required:
 *         - studentId
 *         - deviceId
 *         - checkInTime
 *         - status
 *       description: For device check-ins, courseId/scheduleId/classroom/sessionDate may be omitted and will be inferred where possible by the system.
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the attendance record
 *         studentId:
 *           type: string
 *           description: The student ID
 *         courseId:
 *           type: string
 *           description: The course ID
 *         scheduleId:
 *           type: string
 *           description: The schedule ID
 *         deviceId:
 *           type: string
 *           description: The RFID device ID used for check-in
 *         classroom:
 *           type: string
 *           description: The classroom where attendance was taken
 *         checkInTime:
 *           type: string
 *           format: date-time
 *           description: The time when the student checked in
 *         status:
 *           type: string
 *           enum: [Present, Absent, Late]
 *           description: The attendance status
 *         notes:
 *           type: string
 *           description: Additional notes about the attendance
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the attendance record was created
 *       example:
 *         studentId: "507f1f77bcf86cd799439015"
 *         courseId: "507f1f77bcf86cd799439013"
 *         scheduleId: "507f1f77bcf86cd799439016"
 *         deviceId: "DEVICE001"
 *         classroom: "Room 101"
 *         checkInTime: "2024-01-15T09:05:00Z"
 *         status: "Present"
 *         notes: "Student arrived on time"
 */

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required']
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    index: true,
    // populated for multi-tenant filtering by school
  },
  majorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Major',
    index: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    // optional for device-based quick check-ins where schedule/course may not be known
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseSchedule',
    // optional for device-based quick check-ins
  },
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: [true, 'Device ID is required']
  },
  classroom: {
    type: String,
    trim: true,
    maxlength: [50, 'Classroom cannot exceed 50 characters']
  },
  date: { // alias used by some controllers - represents the raw check-in date
    type: Date
  },
  checkInTime: {
    type: Date,
    required: [true, 'Check-in time is required'],
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late'],
    default: 'Present'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  // Additional fields for better tracking
  sessionDate: {
    type: Date,
    // optional; pre-save will derive from `date` or `checkInTime` if not provided
  },
  sessionDay: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  sessionStartTime: {
    type: String,
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Session start time must be in HH:MM format']
  },
  sessionEndTime: {
    type: String,
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Session end time must be in HH:MM format']
  },
  // RFID specific fields
  cardId: {
    type: String,
    trim: true
  },
  deviceLocation: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for time difference from session start
attendanceSchema.virtual('timeDifference').get(function() {
  if (!this.sessionStartTime || !this.checkInTime) return null;
  
  const checkInTime = new Date(this.checkInTime);
  const sessionDate = new Date(this.sessionDate);
  const [hours, minutes] = this.sessionStartTime.split(':');
  const sessionStartTime = new Date(sessionDate);
  sessionStartTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  return Math.round((checkInTime - sessionStartTime) / (1000 * 60)); // Difference in minutes
});

// Virtual for attendance date (for grouping)
attendanceSchema.virtual('attendanceDate').get(function() {
  return this.checkInTime.toISOString().split('T')[0];
});

// Method to determine status based on check-in time
attendanceSchema.methods.determineStatus = function() {
  if (!this.sessionStartTime) return 'Present';
  
  const checkInTime = new Date(this.checkInTime);
  const sessionDate = new Date(this.sessionDate);
  const [hours, minutes] = this.sessionStartTime.split(':');
  const sessionStartTime = new Date(sessionDate);
  sessionStartTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  const timeDiff = Math.round((checkInTime - sessionStartTime) / (1000 * 60)); // minutes
  
  if (timeDiff <= 0) return 'Present';
  if (timeDiff <= 15) return 'Late';
  return 'Absent';
};

// Pre-save middleware to set session details and determine status
attendanceSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('checkInTime')) {
    // Prefer explicit `date` if provided (controllers sometimes use `date`), otherwise fallback to checkInTime
    if (!this.sessionDate) {
      if (this.date) this.sessionDate = new Date(this.date);
      else this.sessionDate = new Date(this.checkInTime);
    }

    // Set session day if not provided
    if (!this.sessionDay) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      this.sessionDay = days[this.sessionDate.getDay()];
    }

    // Auto-determine status if not manually set
    if (!this.isModified('status') || this.status === 'Present') {
      this.status = this.determineStatus();
    }
  }
  next();
});

// Compound index for unique attendance per student per session
attendanceSchema.index({ 
  studentId: 1, 
  scheduleId: 1, 
  sessionDate: 1 
}, { unique: true });

// Indexes for better query performance
attendanceSchema.index({ studentId: 1 });
attendanceSchema.index({ courseId: 1 });
attendanceSchema.index({ scheduleId: 1 });
attendanceSchema.index({ deviceId: 1 });
attendanceSchema.index({ classroom: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ checkInTime: 1 });
attendanceSchema.index({ sessionDate: 1 });
attendanceSchema.index({ cardId: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema); 