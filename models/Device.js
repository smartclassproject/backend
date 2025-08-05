const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Device:
 *       type: object
 *       required:
 *         - schoolId
 *         - classroom
 *         - location
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the device
 *         schoolId:
 *           type: string
 *           description: The school ID this device belongs to
 *         classroom:
 *           type: string
 *           description: The classroom where the device is installed
 *         location:
 *           type: string
 *           description: The physical location description of the device
 *         isActive:
 *           type: boolean
 *           description: Whether the device is currently active
 *           default: true
 *         installedAt:
 *           type: string
 *           format: date-time
 *           description: When the device was installed
 *         deviceType:
 *           type: string
 *           description: The type of RFID device
 *           default: "RFID Reader"
 *         serialNumber:
 *           type: string
 *           description: The device serial number
 *         model:
 *           type: string
 *           description: The device model
 *         manufacturer:
 *           type: string
 *           description: The device manufacturer
 *           default: "US"
 *         firmwareVersion:
 *           type: string
 *           description: The firmware version of the device
 *         lastMaintenance:
 *           type: string
 *           format: date-time
 *           description: The last maintenance date
 *         nextMaintenance:
 *           type: string
 *           format: date-time
 *           description: The next scheduled maintenance date
 *         status:
 *           type: string
 *           enum: [Operational, Maintenance, Offline, Error]
 *           description: The current status of the device
 *           default: "Operational"
 *         batteryLevel:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: Battery level percentage
 *           default: 100
 *         signalStrength:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: Signal strength percentage
 *         lastSeen:
 *           type: string
 *           format: date-time
 *           description: When the device was last seen online
 *         notes:
 *           type: string
 *           description: Additional notes about the device
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the device was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the device was last updated
 *       example:
 *         schoolId: "507f1f77bcf86cd799439011"
 *         classroom: "Room 101"
 *         location: "Main entrance, left side"
 *         isActive: true
 *         deviceType: "RFID Reader"
 *         serialNumber: "RFID-2024-001"
 *         model: "RFID-2000"
 *         manufacturer: "US"
 *         firmwareVersion: "v2.1.0"
 *         status: "Operational"
 *         batteryLevel: 85
 *         signalStrength: 95
 */

const deviceSchema = new mongoose.Schema({
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
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  installedAt: {
    type: Date,
    default: Date.now
  },
  deviceType: {
    type: String,
    trim: true,
    maxlength: [50, 'Device type cannot exceed 50 characters'],
    default: 'RFID Reader'
  },
  serialNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Serial number cannot exceed 50 characters']
  },
  model: {
    type: String,
    trim: true,
    maxlength: [100, 'Model cannot exceed 100 characters']
  },
  manufacturer: {
    type: String,
    trim: true,
    maxlength: [100, 'Manufacturer cannot exceed 100 characters'],
    default: 'SmartClass'
  },
  firmwareVersion: {
    type: String,
    trim: true,
    maxlength: [20, 'Firmware version cannot exceed 20 characters']
  },
  lastMaintenance: {
    type: Date
  },
  nextMaintenance: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Operational', 'Maintenance', 'Offline', 'Error'],
    default: 'Operational'
  },
  batteryLevel: {
    type: Number,
    min: [0, 'Battery level cannot be negative'],
    max: [100, 'Battery level cannot exceed 100'],
    default: 100
  },
  signalStrength: {
    type: Number,
    min: [0, 'Signal strength cannot be negative'],
    max: [100, 'Signal strength cannot exceed 100']
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for attendance count from this device
deviceSchema.virtual('attendanceCount', {
  ref: 'Attendance',
  localField: '_id',
  foreignField: 'deviceId',
  count: true
});

// Virtual for recent attendance count (last 7 days)
deviceSchema.virtual('recentAttendanceCount', {
  ref: 'Attendance',
  localField: '_id',
  foreignField: 'deviceId',
  count: true,
  match: { 
    checkInTime: { 
      $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
    } 
  }
});

// Virtual for device age
deviceSchema.virtual('deviceAge').get(function() {
  const now = new Date();
  const installed = new Date(this.installedAt);
  const diffTime = Math.abs(now - installed);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for maintenance status
deviceSchema.virtual('maintenanceStatus').get(function() {
  if (!this.nextMaintenance) return 'No maintenance scheduled';
  
  const now = new Date();
  const nextMaintenance = new Date(this.nextMaintenance);
  const diffTime = nextMaintenance - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Overdue';
  if (diffDays <= 7) return 'Due soon';
  return 'Up to date';
});

// Method to update device status
deviceSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  this.lastSeen = new Date();
  return this.save();
};

// Method to record maintenance
deviceSchema.methods.recordMaintenance = function() {
  this.lastMaintenance = new Date();
  this.nextMaintenance = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
  this.status = 'Operational';
  return this.save();
};

// Pre-save middleware to set next maintenance if not set
deviceSchema.pre('save', function(next) {
  if (this.isNew && !this.nextMaintenance) {
    this.nextMaintenance = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
  }
  next();
});

// Indexes for better query performance
deviceSchema.index({ schoolId: 1 });
deviceSchema.index({ classroom: 1 });
deviceSchema.index({ isActive: 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ serialNumber: 1 });
deviceSchema.index({ lastSeen: 1 });
deviceSchema.index({ nextMaintenance: 1 });

module.exports = mongoose.model('Device', deviceSchema); 