const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * @swagger
 * components:
 *   schemas:
 *     TeacherUser:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - teacherId
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the teacher user
 *         email:
 *           type: string
 *           format: email
 *           description: The email address of the teacher user
 *         password:
 *           type: string
 *           description: The hashed password
 *         teacherId:
 *           type: string
 *           description: The Teacher ID this user is linked to
 *         isActive:
 *           type: boolean
 *           description: Whether the account is active
 *           default: true
 *         passwordSetup:
 *           type: boolean
 *           description: Whether the password has been set up
 *           default: false
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: The last login date
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the teacher user was created
 *       example:
 *         email: "teacher@yourschool.com"
 *         password: "password123"
 *         teacherId: "507f1f77bcf86cd799439011"
 */

const teacherUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: false, // Password is not required initially
    minlength: [4, 'Password must be at least 4 characters long']
  },
  defaultPassword: {
    type: String,
    required: false // Store the default password (hashed) for first-time login check
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, 'Teacher ID is required'],
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  passwordSetup: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Method to compare password
teacherUserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    // If password is not set, try defaultPassword as fallback
    if (this.defaultPassword) {
      return await bcrypt.compare(candidatePassword, this.defaultPassword);
    }
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without password)
teacherUserSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Index for better query performance
teacherUserSchema.index({ email: 1 });
teacherUserSchema.index({ teacherId: 1 });

module.exports = mongoose.model('TeacherUser', teacherUserSchema);
