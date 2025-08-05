const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courses');
const { authenticateToken, authorizeRoles, authorizeResourceAccess } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');
const { body } = require('express-validator');
const Course = require('../models/Course');

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get all courses with pagination and search
 *     tags: [Courses]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or code
 *       - in: query
 *         name: majorId
 *         schema:
 *           type: string
 *         description: Filter by major ID
 */
router.get('/', authenticateToken, courseController.getAllCourses);

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get course by ID
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 */
router.get('/:id', authenticateToken, authorizeResourceAccess(Course), courseController.getCourseById);

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Course'
 */
router.post('/', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  [
    body('name').notEmpty().withMessage('Course name is required')
      .isLength({ max: 100 }).withMessage('Course name cannot exceed 100 characters'),
    body('code').notEmpty().withMessage('Course code is required')
      .isLength({ max: 15 }).withMessage('Course code cannot exceed 15 characters'),
    body('majorId').notEmpty().withMessage('Major ID is required')
      .isMongoId().withMessage('Invalid major ID'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    body('credits').optional().isInt({ min: 1, max: 10 }).withMessage('Credits must be between 1 and 10')
  ],
  validateRequest,
  courseController.createCourse
);

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Update course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 */
router.put('/:id', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  authorizeResourceAccess(Course),
  [
    body('name').optional().isLength({ max: 100 }).withMessage('Course name cannot exceed 100 characters'),
    body('code').optional().isLength({ max: 15 }).withMessage('Course code cannot exceed 15 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    body('credits').optional().isInt({ min: 1, max: 10 }).withMessage('Credits must be between 1 and 10')
  ],
  validateRequest,
  courseController.updateCourse
);

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Delete course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 */
router.delete('/:id', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  authorizeResourceAccess(Course),
  courseController.deleteCourse
);

module.exports = router; 