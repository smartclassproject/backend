const { validationResult } = require('express-validator');

/**
 * Middleware to check for validation errors
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Validation rules for authentication
 */
const authValidation = {
  login: [
    { field: 'email', message: 'Email is required' },
    { field: 'email', message: 'Please enter a valid email', type: 'email' },
    { field: 'password', message: 'Password is required' },
    { field: 'password', message: 'Password must be at least 6 characters', min: 6 }
  ],
  
  register: [
    { field: 'email', message: 'Email is required' },
    { field: 'email', message: 'Please enter a valid email', type: 'email' },
    { field: 'password', message: 'Password is required' },
    { field: 'password', message: 'Password must be at least 6 characters', min: 6 },
    { field: 'role', message: 'Role is required' },
    { field: 'role', message: 'Role must be super_admin or school_admin', enum: ['super_admin', 'school_admin'] }
  ]
};

/**
 * Validation rules for school management
 */
const schoolValidation = {
  create: [
    { field: 'name', message: 'School name is required' },
    { field: 'name', message: 'School name cannot exceed 100 characters', max: 100 },
    { field: 'location', message: 'School location is required' },
    { field: 'location', message: 'Location cannot exceed 200 characters', max: 200 }
  ],
  
  update: [
    { field: 'name', message: 'School name cannot exceed 100 characters', max: 100, optional: true },
    { field: 'location', message: 'Location cannot exceed 200 characters', max: 200, optional: true }
  ]
};

/**
 * Validation rules for student management
 */
const studentValidation = {
  create: [
    { field: 'name', message: 'Student name is required' },
    { field: 'name', message: 'Student name cannot exceed 100 characters', max: 100 },
    { field: 'studentId', message: 'Student ID is required' },
    { field: 'studentId', message: 'Student ID cannot exceed 20 characters', max: 20 },
    { field: 'cardId', message: 'RFID card ID is required' },
    { field: 'cardId', message: 'Card ID cannot exceed 50 characters', max: 50 },
    { field: 'majorId', message: 'Major ID is required' },
    { field: 'class', message: 'Class is required' },
    { field: 'class', message: 'Class cannot exceed 10 characters', max: 10 },
    { field: 'age', message: 'Age is required' },
    { field: 'age', message: 'Age must be between 16 and 100', min: 16, max: 100 },
    { field: 'email', message: 'Please enter a valid email', type: 'email', optional: true },
    { field: 'phone', message: 'Phone number cannot exceed 20 characters', max: 20, optional: true }
  ],
  
  update: [
    { field: 'name', message: 'Student name cannot exceed 100 characters', max: 100, optional: true },
    { field: 'studentId', message: 'Student ID cannot exceed 20 characters', max: 20, optional: true },
    { field: 'cardId', message: 'Card ID cannot exceed 50 characters', max: 50, optional: true },
    { field: 'class', message: 'Class cannot exceed 10 characters', max: 10, optional: true },
    { field: 'age', message: 'Age must be between 16 and 100', min: 16, max: 100, optional: true },
    { field: 'email', message: 'Please enter a valid email', type: 'email', optional: true },
    { field: 'phone', message: 'Phone number cannot exceed 20 characters', max: 20, optional: true }
  ]
};

/**
 * Validation rules for teacher management
 */
const teacherValidation = {
  create: [
    { field: 'name', message: 'Teacher name is required' },
    { field: 'name', message: 'Teacher name cannot exceed 100 characters', max: 100 },
    { field: 'email', message: 'Email is required' },
    { field: 'email', message: 'Please enter a valid email', type: 'email' },
    { field: 'phone', message: 'Phone number is required' },
    { field: 'phone', message: 'Phone number cannot exceed 20 characters', max: 20 },
    { field: 'department', message: 'Department cannot exceed 100 characters', max: 100, optional: true },
    { field: 'specialization', message: 'Specialization cannot exceed 200 characters', max: 200, optional: true }
  ],
  
  update: [
    { field: 'name', message: 'Teacher name cannot exceed 100 characters', max: 100, optional: true },
    { field: 'email', message: 'Please enter a valid email', type: 'email', optional: true },
    { field: 'phone', message: 'Phone number cannot exceed 20 characters', max: 20, optional: true },
    { field: 'department', message: 'Department cannot exceed 100 characters', max: 100, optional: true },
    { field: 'specialization', message: 'Specialization cannot exceed 200 characters', max: 200, optional: true }
  ]
};

/**
 * Validation rules for course management
 */
const courseValidation = {
  create: [
    { field: 'name', message: 'Course name is required' },
    { field: 'name', message: 'Course name cannot exceed 100 characters', max: 100 },
    { field: 'code', message: 'Course code is required' },
    { field: 'code', message: 'Course code cannot exceed 15 characters', max: 15 },
    { field: 'majorId', message: 'Major ID is required' },
    { field: 'description', message: 'Description cannot exceed 500 characters', max: 500, optional: true },
    { field: 'credits', message: 'Credits must be between 1 and 10', min: 1, max: 10, optional: true }
  ],
  
  update: [
    { field: 'name', message: 'Course name cannot exceed 100 characters', max: 100, optional: true },
    { field: 'code', message: 'Course code cannot exceed 15 characters', max: 15, optional: true },
    { field: 'description', message: 'Description cannot exceed 500 characters', max: 500, optional: true },
    { field: 'credits', message: 'Credits must be between 1 and 10', min: 1, max: 10, optional: true }
  ]
};

/**
 * Validation rules for schedule management
 */
const scheduleValidation = {
  create: [
    { field: 'courseId', message: 'Course ID is required' },
    { field: 'classroom', message: 'Classroom is required' },
    { field: 'classroom', message: 'Classroom cannot exceed 50 characters', max: 50 },
    { field: 'teacherId', message: 'Teacher ID is required' },
    { field: 'startDate', message: 'Start date is required' },
    { field: 'endDate', message: 'End date is required' },
    { field: 'weeklySessions', message: 'Weekly sessions are required' },
    { field: 'weeklySessions', message: 'At least one weekly session is required', minLength: 1 },
    { field: 'maxStudents', message: 'Max students must be at least 1', min: 1, optional: true }
  ],
  
  update: [
    { field: 'classroom', message: 'Classroom cannot exceed 50 characters', max: 50, optional: true },
    { field: 'weeklySessions', message: 'At least one weekly session is required', minLength: 1, optional: true },
    { field: 'maxStudents', message: 'Max students must be at least 1', min: 1, optional: true }
  ]
};

/**
 * Validation rules for attendance
 */
const attendanceValidation = {
  create: [
    { field: 'studentId', message: 'Student ID is required' },
    { field: 'courseId', message: 'Course ID is required' },
    { field: 'scheduleId', message: 'Schedule ID is required' },
    { field: 'deviceId', message: 'Device ID is required' },
    { field: 'classroom', message: 'Classroom is required' },
    { field: 'classroom', message: 'Classroom cannot exceed 50 characters', max: 50 },
    { field: 'status', message: 'Status must be Present, Absent, or Late', enum: ['Present', 'Absent', 'Late'], optional: true },
    { field: 'notes', message: 'Notes cannot exceed 500 characters', max: 500, optional: true }
  ],
  
  update: [
    { field: 'status', message: 'Status must be Present, Absent, or Late', enum: ['Present', 'Absent', 'Late'], optional: true },
    { field: 'notes', message: 'Notes cannot exceed 500 characters', max: 500, optional: true }
  ]
};

/**
 * Validation rules for device management
 */
const deviceValidation = {
  create: [
    { field: 'classroom', message: 'Classroom is required' },
    { field: 'classroom', message: 'Classroom cannot exceed 50 characters', max: 50 },
    { field: 'location', message: 'Location is required' },
    { field: 'location', message: 'Location cannot exceed 200 characters', max: 200 },
    { field: 'deviceType', message: 'Device type cannot exceed 50 characters', max: 50, optional: true },
    { field: 'serialNumber', message: 'Serial number cannot exceed 50 characters', max: 50, optional: true },
    { field: 'model', message: 'Model cannot exceed 100 characters', max: 100, optional: true },
    { field: 'manufacturer', message: 'Manufacturer cannot exceed 100 characters', max: 100, optional: true },
    { field: 'notes', message: 'Notes cannot exceed 500 characters', max: 500, optional: true }
  ],
  
  update: [
    { field: 'classroom', message: 'Classroom cannot exceed 50 characters', max: 50, optional: true },
    { field: 'location', message: 'Location cannot exceed 200 characters', max: 200, optional: true },
    { field: 'deviceType', message: 'Device type cannot exceed 50 characters', max: 50, optional: true },
    { field: 'model', message: 'Model cannot exceed 100 characters', max: 100, optional: true },
    { field: 'manufacturer', message: 'Manufacturer cannot exceed 100 characters', max: 100, optional: true },
    { field: 'status', message: 'Status must be Operational, Maintenance, Offline, or Error', enum: ['Operational', 'Maintenance', 'Offline', 'Error'], optional: true },
    { field: 'batteryLevel', message: 'Battery level must be between 0 and 100', min: 0, max: 100, optional: true },
    { field: 'signalStrength', message: 'Signal strength must be between 0 and 100', min: 0, max: 100, optional: true },
    { field: 'notes', message: 'Notes cannot exceed 500 characters', max: 500, optional: true }
  ]
};

/**
 * Validation middleware functions for specific entities
 */

// Admin validation
const validateAdmin = (req, res, next) => {
  const { firstName, lastName, email, password, role, schoolId } = req.body;
  
  if (!firstName || firstName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'First name is required and must be at least 2 characters'
    });
  }
  
  if (!lastName || lastName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Last name is required and must be at least 2 characters'
    });
  }
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Valid email is required'
    });
  }
  
  if (!password || password.length < 4) {
    return res.status(400).json({
      success: false,
      message: 'Password is required and must be at least 4 characters'
    });
  }
  
  if (!role || !['super_admin', 'school_admin'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Valid role is required (super_admin or school_admin)'
    });
  }
  
  if (role === 'school_admin' && !schoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required for school admin'
    });
  }
  
  next();
};

const validateAdminUpdate = (req, res, next) => {
  const { firstName, lastName, email, role, schoolId } = req.body;
  
  if (firstName && firstName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'First name must be at least 2 characters'
    });
  }
  
  if (lastName && lastName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Last name must be at least 2 characters'
    });
  }
  
  if (email && !email.includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Valid email is required'
    });
  }
  
  if (role && !['super_admin', 'school_admin'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Valid role is required (super_admin or school_admin)'
    });
  }
  
  next();
};

// Device validation
const validateDevice = (req, res, next) => {
  const { schoolId, classroom, location, serialNumber } = req.body;
  
  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required'
    });
  }
  
  if (!classroom || classroom.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Classroom is required and must be at least 2 characters'
    });
  }
  
  if (!location || location.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Device location is required and must be at least 2 characters'
    });
  }
  
  if (serialNumber && serialNumber.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Serial number must be at least 3 characters if provided'
    });
  }
  
  next();
};

const validateDeviceUpdate = (req, res, next) => {
  const { classroom, location, serialNumber, deviceType, model, manufacturer, firmwareVersion, status, batteryLevel, signalStrength, notes } = req.body;
  
  if (classroom && classroom.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Classroom must be at least 2 characters'
    });
  }
  
  if (location && location.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Device location must be at least 2 characters'
    });
  }
  
  if (serialNumber && serialNumber.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Serial number must be at least 3 characters'
    });
  }
  
  if (deviceType && deviceType.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Device type must be at least 2 characters'
    });
  }
  
  if (model && model.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Model must be at least 2 characters'
    });
  }
  
  if (manufacturer && manufacturer.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Manufacturer must be at least 2 characters'
    });
  }
  
  if (firmwareVersion && firmwareVersion.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Firmware version must be at least 2 characters'
    });
  }
  
  if (status && !['Operational', 'Maintenance', 'Offline', 'Error'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status must be Operational, Maintenance, Offline, or Error'
    });
  }
  
  if (batteryLevel !== undefined && (batteryLevel < 0 || batteryLevel > 100)) {
    return res.status(400).json({
      success: false,
      message: 'Battery level must be between 0 and 100'
    });
  }
  
  if (signalStrength !== undefined && (signalStrength < 0 || signalStrength > 100)) {
    return res.status(400).json({
      success: false,
      message: 'Signal strength must be between 0 and 100'
    });
  }
  
  if (notes && notes.trim().length > 500) {
    return res.status(400).json({
      success: false,
      message: 'Notes cannot exceed 500 characters'
    });
  }
  
  next();
};

// Student validation
const validateStudent = (req, res, next) => {
  const { firstName, lastName, studentId, rfidCardId, majorId, enrollmentYear } = req.body;
  
  if (!firstName || firstName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'First name is required and must be at least 2 characters'
    });
  }
  
  if (!lastName || lastName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Last name is required and must be at least 2 characters'
    });
  }
  
  if (!studentId || studentId.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Student ID is required and must be at least 3 characters'
    });
  }
  
  if (!rfidCardId || rfidCardId.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'RFID card ID is required and must be at least 3 characters'
    });
  }
  
  if (!majorId) {
    return res.status(400).json({
      success: false,
      message: 'Major ID is required'
    });
  }
  
  if (!enrollmentYear || enrollmentYear < 2000 || enrollmentYear > new Date().getFullYear() + 1) {
    return res.status(400).json({
      success: false,
      message: 'Valid enrollment year is required'
    });
  }
  
  next();
};

const validateStudentUpdate = (req, res, next) => {
  const { firstName, lastName, studentId, rfidCardId, enrollmentYear } = req.body;
  
  if (firstName && firstName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'First name must be at least 2 characters'
    });
  }
  
  if (lastName && lastName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Last name must be at least 2 characters'
    });
  }
  
  if (studentId && studentId.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Student ID must be at least 3 characters'
    });
  }
  
  if (rfidCardId && rfidCardId.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'RFID card ID must be at least 3 characters'
    });
  }
  
  if (enrollmentYear && (enrollmentYear < 2000 || enrollmentYear > new Date().getFullYear() + 1)) {
    return res.status(400).json({
      success: false,
      message: 'Valid enrollment year is required'
    });
  }
  
  next();
};

// Teacher validation
const validateTeacher = (req, res, next) => {
  const { firstName, lastName, email, phone, schoolId } = req.body;
  
  if (!firstName || firstName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'First name is required and must be at least 2 characters'
    });
  }
  
  if (!lastName || lastName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Last name is required and must be at least 2 characters'
    });
  }
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Valid email is required'
    });
  }
  
  if (!phone || phone.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Valid phone number is required'
    });
  }
  
  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required'
    });
  }
  
  next();
};

const validateTeacherUpdate = (req, res, next) => {
  const { firstName, lastName, email, phone } = req.body;
  
  if (firstName && firstName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'First name must be at least 2 characters'
    });
  }
  
  if (lastName && lastName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Last name must be at least 2 characters'
    });
  }
  
  if (email && !email.includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Valid email is required'
    });
  }
  
  if (phone && phone.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Valid phone number is required'
    });
  }
  
  next();
};

// Major validation
const validateMajor = (req, res, next) => {
  const { name, code, schoolId } = req.body;
  
  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Major name is required and must be at least 2 characters'
    });
  }
  
  if (!code || code.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Major code is required and must be at least 2 characters'
    });
  }
  
  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required'
    });
  }
  
  next();
};

const validateMajorUpdate = (req, res, next) => {
  const { name, code } = req.body;
  
  if (name && name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Major name must be at least 2 characters'
    });
  }
  
  if (code && code.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Major code must be at least 2 characters'
    });
  }
  
  next();
};

// Course validation
const validateCourse = (req, res, next) => {
  const { name, code, majorId, schoolId } = req.body;
  
  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Course name is required and must be at least 2 characters'
    });
  }
  
  if (!code || code.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Course code is required and must be at least 2 characters'
    });
  }
  
  if (!majorId) {
    return res.status(400).json({
      success: false,
      message: 'Major ID is required'
    });
  }
  
  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required'
    });
  }
  
  next();
};

const validateCourseUpdate = (req, res, next) => {
  const { name, code } = req.body;
  
  if (name && name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Course name must be at least 2 characters'
    });
  }
  
  if (code && code.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Course code must be at least 2 characters'
    });
  }
  
  next();
};

// Schedule validation
const validateSchedule = (req, res, next) => {
  const { courseId, teacherId, startDate, endDate, weeklySessions } = req.body;
  
  if (!courseId) {
    return res.status(400).json({
      success: false,
      message: 'Course ID is required'
    });
  }
  
  if (!teacherId) {
    return res.status(400).json({
      success: false,
      message: 'Teacher ID is required'
    });
  }
  
  if (!startDate) {
    return res.status(400).json({
      success: false,
      message: 'Start date is required'
    });
  }
  
  if (!endDate) {
    return res.status(400).json({
      success: false,
      message: 'End date is required'
    });
  }
  
  if (!weeklySessions || !Array.isArray(weeklySessions) || weeklySessions.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Weekly sessions are required and must be an array'
    });
  }
  
  next();
};

const validateScheduleUpdate = (req, res, next) => {
  const { weeklySessions } = req.body;
  
  if (weeklySessions && (!Array.isArray(weeklySessions) || weeklySessions.length === 0)) {
    return res.status(400).json({
      success: false,
      message: 'Weekly sessions must be an array with at least one session'
    });
  }
  
  next();
};

// School validation
const validateSchool = (req, res, next) => {
  const { name, location } = req.body;
  
  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'School name is required and must be at least 2 characters'
    });
  }
  
  if (!location || location.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'School location is required and must be at least 2 characters'
    });
  }
  
  next();
};

const validateSchoolUpdate = (req, res, next) => {
  const { name, location } = req.body;
  
  if (name && name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'School name must be at least 2 characters'
    });
  }
  
  if (location && location.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'School location must be at least 2 characters'
    });
  }
  
  next();
};

module.exports = {
  validateRequest,
  authValidation,
  schoolValidation,
  studentValidation,
  teacherValidation,
  courseValidation,
  scheduleValidation,
  attendanceValidation,
  deviceValidation,
  // Specific validation functions
  validateAdmin,
  validateAdminUpdate,
  validateDevice,
  validateDeviceUpdate,
  validateStudent,
  validateStudentUpdate,
  validateTeacher,
  validateTeacherUpdate,
  validateMajor,
  validateMajorUpdate,
  validateCourse,
  validateCourseUpdate,
  validateSchedule,
  validateScheduleUpdate,
  validateSchool,
  validateSchoolUpdate
}; 