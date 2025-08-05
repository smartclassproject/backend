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
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
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
    body('maxStudents').optional().isInt({ min: 1 }).withMessage('Max students must be at least 1')
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
 */
router.put('/:id', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  authorizeResourceAccess(CourseSchedule),
  [
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
    body('maxStudents').optional().isInt({ min: 1 }).withMessage('Max students must be at least 1')
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
 */
router.post('/check-conflicts', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  scheduleController.checkConflicts
);

module.exports = router; 