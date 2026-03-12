const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessons');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');
const { body } = require('express-validator');

// GET /api/lessons - Get all lessons
router.get('/', 
  authenticateToken,
  lessonController.getAllLessons
);

// GET /api/lessons/:id - Get lesson by ID
router.get('/:id',
  authenticateToken,
  lessonController.getLessonById
);

// POST /api/lessons - Create new lesson (teachers and school admins)
router.post('/',
  authenticateToken,
  authorizeRoles('teacher', 'school_admin', 'super_admin'),
  [
    body('courseId').notEmpty().withMessage('Course ID is required')
      .isMongoId().withMessage('Invalid course ID'),
    body('scheduleId').notEmpty().withMessage('Schedule ID is required')
      .isMongoId().withMessage('Invalid schedule ID'),
    body('title').notEmpty().withMessage('Title is required')
      .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('lessonDate').notEmpty().withMessage('Lesson date is required')
      .isISO8601().withMessage('Invalid date format'),
    body('description').optional().isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),
    body('materials').optional().isArray().withMessage('Materials must be an array'),
    body('materials.*.name').optional().isLength({ max: 200 }).withMessage('Material name cannot exceed 200 characters'),
    body('materials.*.url').optional().isURL().withMessage('Material URL must be a valid URL'),
    body('materials.*.type').optional().isIn(['pdf', 'video', 'link', 'document']).withMessage('Invalid material type'),
    body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean')
  ],
  validateRequest,
  lessonController.createLesson
);

// PUT /api/lessons/:id - Update lesson
router.put('/:id',
  authenticateToken,
  authorizeRoles('teacher', 'school_admin', 'super_admin'),
  [
    body('title').optional().isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('lessonDate').optional().isISO8601().withMessage('Invalid date format'),
    body('description').optional().isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),
    body('materials').optional().isArray().withMessage('Materials must be an array'),
    body('materials.*.name').optional().isLength({ max: 200 }).withMessage('Material name cannot exceed 200 characters'),
    body('materials.*.url').optional().isURL().withMessage('Material URL must be a valid URL'),
    body('materials.*.type').optional().isIn(['pdf', 'video', 'link', 'document']).withMessage('Invalid material type'),
    body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean')
  ],
  validateRequest,
  lessonController.updateLesson
);

// DELETE /api/lessons/:id - Delete lesson
router.delete('/:id',
  authenticateToken,
  authorizeRoles('teacher', 'school_admin', 'super_admin'),
  lessonController.deleteLesson
);

module.exports = router;
