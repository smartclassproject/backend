const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedules');
const { authenticateToken, authorizeRoles, authorizeResourceAccess } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');
const { body } = require('express-validator');
const CourseSchedule = require('../models/CourseSchedule');

/**
 * @swagger
 * /api/schedules:
 *   get:
 *     summary: Get all schedules with pagination and filters
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *         description: Filter by course ID
 *       - in: query
 *         name: teacherId
 *         schema:
 *           type: string
 *         description: Filter by teacher ID
 *       - in: query
 *         name: classroom
 *         schema:
 *           type: string
 *         description: Filter by classroom
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter schedules that start on or after this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter schedules that end on or before this date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successfully retrieved schedules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CourseSchedule'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     pages:
 *                       type: integer
 *                       example: 3
 *                 filters:
 *                   type: object
 *                   properties:
 *                     courseId:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     teacherId:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439012"
 *                     classroom:
 *                       type: string
 *                       example: "Room 101"
 *                     status:
 *                       type: string
 *                       example: "active"
 *                     startDate:
 *                       type: string
 *                       format: date
 *                       example: "2025-08-26"
 *                     endDate:
 *                       type: string
 *                       format: date
 *                       example: "2025-08-26"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. No token provided."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.get('/', authenticateToken, scheduleController.getAllSchedules);

/**
 * @swagger
 * /api/schedules/calendar:
 *   get:
 *     summary: Get schedules for calendar view
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for calendar
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for calendar
 *     responses:
 *       200:
 *         description: Successfully retrieved calendar schedules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CourseSchedule'
 *       400:
 *         description: Bad request - Invalid date format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid date format"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. No token provided."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.get('/calendar', authenticateToken, scheduleController.getCalendarSchedules);

/**
 * @swagger
 * /api/schedules/{id}:
 *   get:
 *     summary: Get schedule by ID
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Schedule ID
 *     responses:
 *       200:
 *         description: Successfully retrieved schedule
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CourseSchedule'
 *       400:
 *         description: Bad request - Invalid schedule ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid schedule ID"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. No token provided."
 *       403:
 *         description: Forbidden - No access to this schedule
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied to this schedule"
 *       404:
 *         description: Schedule not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Schedule not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.get('/:id', authenticateToken, authorizeResourceAccess(CourseSchedule), scheduleController.getScheduleById);

/**
 * @swagger
 * /api/schedules:
 *   post:
 *     summary: Create a new schedule
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CourseSchedule'
 *           example:
 *             courseId: "507f1f77bcf86cd799439011"
 *             teacherId: "507f1f77bcf86cd799439012"
 *             classroom: "Room 101"
 *             startDate: "2024-01-15"
 *             endDate: "2024-05-15"
 *             weeklySessions: [
 *               {
 *                 day: "Monday",
 *                 startTime: "09:00",
 *                 endTime: "10:30"
 *               },
 *               {
 *                 day: "Wednesday",
 *                 startTime: "09:00",
 *                 endTime: "10:30"
 *               }
 *             ]
 *             maxStudents: "auto"
 *     responses:
 *       201:
 *         description: Schedule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Schedule created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/CourseSchedule'
 *       400:
 *         description: Bad request - Validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "courseId"
 *                       message:
 *                         type: string
 *                         example: "Course ID is required"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. No token provided."
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. School admin role required."
 *       409:
 *         description: Conflict - Schedule conflicts detected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Schedule conflicts detected"
 *                 conflicts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         example: "classroom_conflict"
 *                       message:
 *                         type: string
 *                         example: "Classroom is already occupied at this time"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.post('/', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  [
    body('courseId').notEmpty().withMessage('Course ID is required')
      .isMongoId().withMessage('Invalid course ID'),
    body('classroom').notEmpty().withMessage('Classroom is required')
      .isLength({ max: 50 }).withMessage('Classroom cannot exceed 50 characters'),
    body('teacherId').notEmpty().withMessage('Teacher ID is required')
      .isMongoId().withMessage('Invalid teacher ID'),
    body('startDate').notEmpty().withMessage('Start date is required')
      .isISO8601().withMessage('Invalid start date format'),
    body('endDate').notEmpty().withMessage('End date is required')
      .isISO8601().withMessage('Invalid end date format'),
    body('weeklySessions').isArray({ min: 1 }).withMessage('At least one weekly session is required'),
    body('weeklySessions.*.day').isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
      .withMessage('Invalid day of week'),
    body('weeklySessions.*.startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Start time must be in HH:MM format'),
    body('weeklySessions.*.endTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('End time must be in HH:MM format'),
    body('maxStudents').optional().custom((value) => {
      if (value !== undefined && value !== 'auto' && (!Number.isInteger(value) || value < 1)) {
        throw new Error('Max students must be at least 1 or "auto" for automatic calculation');
      }
      return true;
    }).withMessage('Max students must be at least 1 or "auto" for automatic calculation')
  ],
  validateRequest,
  scheduleController.createSchedule
);

/**
 * @swagger
 * /api/schedules/{id}:
 *   put:
 *     summary: Update schedule
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Schedule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               courseId:
 *                 type: string
 *                 description: "Course ID (must be a valid MongoDB ObjectId)"
 *               teacherId:
 *                 type: string
 *                 description: "Teacher ID (must be a valid MongoDB ObjectId)"
 *               classroom:
 *                 type: string
 *                 maxLength: 50
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               weeklySessions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                       enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *                     startTime:
 *                       type: string
 *                       pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                     endTime:
 *                       type: string
 *                       pattern: '^([01]?[0-3]):[0-5][0-9]$'
 *               maxStudents:
 *                 type: [integer, string]
 *                 minimum: 1
 *                 description: "Number of students or 'auto' for automatic calculation based on major enrollment"
 *           example:
 *             courseId: "507f1f77bcf86cd799439011"
 *             teacherId: "507f1f77bcf86cd799439012"
 *             classroom: "Room 102"
 *             startDate: "2024-02-01"
 *             endDate: "2024-06-01"
 *             weeklySessions: [
 *               {
 *                 day: "Monday",
 *                 startTime: "09:00",
 *                 endTime: "10:30"
 *               },
 *               {
 *                 day: "Wednesday",
 *                 startTime: "09:00",
 *                 endTime: "10:30"
 *               }
 *             ]
 *             maxStudents: "auto"
 *     responses:
 *       200:
 *         description: Schedule updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Schedule updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/CourseSchedule'
 *       400:
 *         description: Bad request - Validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "classroom"
 *                       message:
 *                         type: string
 *                         example: "Classroom cannot exceed 50 characters"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. No token provided."
 *       403:
 *         description: Forbidden - Insufficient permissions or no access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. School admin role required."
 *       404:
 *         description: Schedule not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Schedule not found"
 *       409:
 *         description: Conflict - Schedule conflicts detected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Schedule conflicts detected"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.put('/:id', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  [
    body('courseId').optional().isMongoId().withMessage('Invalid course ID'),
    body('teacherId').optional().isMongoId().withMessage('Invalid teacher ID'),
    body('classroom').optional().isLength({ max: 50 }).withMessage('Classroom cannot exceed 50 characters'),
    body('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    body('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    body('weeklySessions').optional().isArray({ min: 1 }).withMessage('At least one weekly session is required'),
    body('weeklySessions.*.day').optional().isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
      .withMessage('Invalid day of week'),
    body('weeklySessions.*.startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Start time must be in HH:MM format'),
    body('weeklySessions.*.endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('End time must be in HH:MM format'),
    body('maxStudents').optional().custom((value) => {
      if (value !== undefined && value !== 'auto' && (!Number.isInteger(value) || value < 1)) {
        throw new Error('Max students must be at least 1 or "auto" for automatic calculation');
      }
      return true;
    }).withMessage('Max students must be at least 1 or "auto" for automatic calculation')
  ],
  validateRequest,
  scheduleController.updateSchedule
);

/**
 * @swagger
 * /api/schedules/{id}:
 *   delete:
 *     summary: Delete schedule
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Schedule ID
 *     responses:
 *       200:
 *         description: Schedule deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Schedule deleted successfully"
 *       400:
 *         description: Bad request - Invalid schedule ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid schedule ID"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. No token provided."
 *       403:
 *         description: Forbidden - Insufficient permissions or no access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. School admin role required."
 *       404:
 *         description: Schedule not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Schedule not found"
 *       409:
 *         description: Conflict - Cannot delete schedule with active enrollments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Cannot delete schedule with active enrollments"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.delete('/:id', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  authorizeResourceAccess(CourseSchedule),
  scheduleController.deleteSchedule
);

/**
 * @swagger
 * /api/schedules/check-conflicts:
 *   post:
 *     summary: Check for schedule conflicts
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - teacherId
 *               - classroom
 *               - startDate
 *               - endDate
 *               - weeklySessions
 *             properties:
 *               courseId:
 *                 type: string
 *                 description: Course ID to check
 *               teacherId:
 *                 type: string
 *                 description: Teacher ID to check
 *               classroom:
 *                 type: string
 *                 description: Classroom to check
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Start date for conflict checking
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: End date for conflict checking
 *               weeklySessions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                       enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *                     startTime:
 *                       type: string
 *                       pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                     endTime:
 *                       type: string
 *                       pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *           example:
 *             courseId: "507f1f77bcf86cd799439011"
 *             teacherId: "507f1f77bcf86cd799439012"
 *             classroom: "Room 101"
 *             startDate: "2024-01-15"
 *             endDate: "2024-05-15"
 *             weeklySessions: [
 *               {
 *                 day: "Monday",
 *                 startTime: "09:00",
 *                 endTime: "10:30"
 *               }
 *             ]
 *     responses:
 *       200:
 *         description: Conflict check completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasConflicts:
 *                       type: boolean
 *                       example: false
 *                     conflicts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             example: "classroom_conflict"
 *                           message:
 *                             type: string
 *                             example: "Classroom is already occupied at this time"
 *                           conflictingSchedule:
 *                             $ref: '#/components/schemas/CourseSchedule'
 *       400:
 *         description: Bad request - Validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. No token provided."
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. School admin role required."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.post('/check-conflicts', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  scheduleController.checkConflicts
);

module.exports = router; 