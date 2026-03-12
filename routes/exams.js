const express = require('express');
const router = express.Router();
const examController = require('../controllers/exams');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');
const { body } = require('express-validator');

// GET /api/exams - Get all exams
router.get('/', 
  authenticateToken,
  examController.getAllExams
);

// GET /api/exams/:id - Get exam by ID
router.get('/:id',
  authenticateToken,
  examController.getExamById
);

// POST /api/exams - Create new exam (teachers and school admins)
router.post('/',
  authenticateToken,
  authorizeRoles('teacher', 'school_admin', 'super_admin'),
  [
    body('courseId').notEmpty().withMessage('Course ID is required')
      .isMongoId().withMessage('Invalid course ID'),
    body('scheduleId').optional().isMongoId().withMessage('Invalid schedule ID'),
    body('title').notEmpty().withMessage('Title is required')
      .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('examDate').notEmpty().withMessage('Exam date is required')
      .isISO8601().withMessage('Invalid date format'),
    body('examTime').notEmpty().withMessage('Exam time is required')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Time must be in HH:MM format'),
    body('duration').optional().isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
    body('maxScore').optional().isInt({ min: 1 }).withMessage('Max score must be at least 1'),
    body('reportUrl').optional().isURL().withMessage('Report URL must be a valid URL'),
    body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean')
  ],
  validateRequest,
  examController.createExam
);

// PUT /api/exams/:id - Update exam
router.put('/:id',
  authenticateToken,
  authorizeRoles('teacher', 'school_admin', 'super_admin'),
  [
    body('title').optional().isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('examDate').optional().isISO8601().withMessage('Invalid date format'),
    body('examTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Time must be in HH:MM format'),
    body('duration').optional().isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
    body('maxScore').optional().isInt({ min: 1 }).withMessage('Max score must be at least 1'),
    body('reportUrl').optional().isURL().withMessage('Report URL must be a valid URL'),
    body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean')
  ],
  validateRequest,
  examController.updateExam
);

// DELETE /api/exams/:id - Delete exam
router.delete('/:id',
  authenticateToken,
  authorizeRoles('teacher', 'school_admin', 'super_admin'),
  examController.deleteExam
);

module.exports = router;
