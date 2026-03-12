const mongoose = require('mongoose');

/**
 * TermResult - End-of-term exam and discipline marks per student per course.
 * One record per student per course per term per academic year.
 * Teachers submit exam marks and discipline marks; school views report cards.
 */
const termResultSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required']
  },
  academicYear: {
    type: Number,
    required: [true, 'Academic year is required'],
    min: [2000, 'Academic year must be 2000 or later'],
    max: [2100, 'Academic year must be 2100 or earlier']
  },
  term: {
    type: Number,
    required: [true, 'Term number is required'],
    min: [1, 'Term must be at least 1'],
    max: [6, 'Term cannot exceed 6']
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required']
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseSchedule',
    required: false
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, 'Teacher ID is required']
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required']
  },
  examMarks: {
    type: Number,
    required: [true, 'Exam marks are required'],
    min: [0, 'Exam marks cannot be negative'],
    max: [100, 'Exam marks cannot exceed 100']
  },
  disciplineMarks: {
    type: Number,
    required: [true, 'Discipline marks are required'],
    min: [0, 'Discipline marks cannot be negative'],
    max: [100, 'Discipline marks cannot exceed 100']
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [500, 'Remarks cannot exceed 500 characters']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// One result per student per course per term per year
termResultSchema.index(
  { schoolId: 1, academicYear: 1, term: 1, courseId: 1, studentId: 1 },
  { unique: true }
);
termResultSchema.index({ schoolId: 1, academicYear: 1, term: 1 });
termResultSchema.index({ studentId: 1, academicYear: 1 });
termResultSchema.index({ teacherId: 1 });
termResultSchema.index({ courseId: 1 });

module.exports = mongoose.model('TermResult', termResultSchema);
