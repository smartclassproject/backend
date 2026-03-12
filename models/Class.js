const mongoose = require('mongoose');

/**
 * Class - A class/cohort within a school (e.g. "Senior 1 A", "Grade 10 B").
 * Students are assigned to a class. Used for filtering and report cards.
 */
const classSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required']
  },
  name: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
    maxlength: [50, 'Class name cannot exceed 50 characters']
  },
  code: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [15, 'Class code cannot exceed 15 characters'],
    required: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

classSchema.index({ schoolId: 1 });
classSchema.index({ schoolId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
