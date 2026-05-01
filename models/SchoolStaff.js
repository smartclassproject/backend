const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const STAFF_ROLES = [
  'MATRON',
  'PATRON',
  'ACCOUNTANT',
  'DIRECTOR_OF_STUDIES',
  'DISCIPLINE_MASTER',
  'LIBRARIAN',
  'OTHER',
];

const schoolStaffSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 4,
    },
    staffRole: {
      type: String,
      enum: STAFF_ROLES,
      required: true,
    },
    customRoleTitle: {
      type: String,
      trim: true,
      default: '',
    },
    modules: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
    },
    createdByRole: {
      type: String,
      enum: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
      default: 'SCHOOL_ADMIN',
    },
    updatedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

schoolStaffSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

schoolStaffSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

schoolStaffSchema.methods.getPublicProfile = function getPublicProfile() {
  const staff = this.toObject();
  delete staff.password;
  return staff;
};

module.exports = mongoose.model('SchoolStaff', schoolStaffSchema);
