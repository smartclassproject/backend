const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminUser:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - role
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the admin user
 *         email:
 *           type: string
 *           format: email
 *           description: The email address of the admin user
 *         password:
 *           type: string
 *           description: The hashed password
 *         name:
 *           type: string
 *           description: The full name of the admin user
 *         phone:
 *           type: string
 *           description: The phone number of the admin user
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           description: The status of the admin user
 *           default: active
 *         role:
 *           type: string
 *           enum: [super_admin, school_admin]
 *           description: The role of the admin user
 *         schoolId:
 *           type: string
 *           description: The school ID (only for school_admin role)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the admin user was created
 *       example:
 *         email: "admin@smartclass.com"
 *         password: "password123"
 *         role: "super_admin"
 */

const adminUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [4, 'Password must be at least 4 characters long']
  },
  name: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  role: {
    type: String,
    enum: ['super_admin', 'school_admin'],
    required: [true, 'Role is required'],
    default: 'school_admin'
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: function() {
      return this.role === 'school_admin';
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password before saving
adminUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
adminUserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without password)
adminUserSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Index for better query performance
adminUserSchema.index({ email: 1 });
adminUserSchema.index({ role: 1 });
adminUserSchema.index({ schoolId: 1 });

module.exports = mongoose.model('AdminUser', adminUserSchema); 