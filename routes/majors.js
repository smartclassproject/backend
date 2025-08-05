const express = require('express');
const router = express.Router();
const majorController = require('../controllers/majors');
const { authenticateToken, authorizeRoles, authorizeResourceAccess } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');
const { body } = require('express-validator');
const Major = require('../models/Major');

/**
 * @swagger
 * /api/majors:
 *   get:
 *     summary: Get all majors with pagination and search
 *     tags: [Majors]
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
 */
router.get('/', authenticateToken, majorController.getAllMajors);

/**
 * @swagger
 * /api/majors/{id}:
 *   get:
 *     summary: Get major by ID
 *     tags: [Majors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Major ID
 */
router.get('/:id', authenticateToken, authorizeResourceAccess(Major), majorController.getMajorById);

/**
 * @swagger
 * /api/majors:
 *   post:
 *     summary: Create a new major
 *     tags: [Majors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Major'
 */
router.post('/', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  [
    body('name').notEmpty().withMessage('Major name is required')
      .isLength({ max: 100 }).withMessage('Major name cannot exceed 100 characters'),
    body('code').notEmpty().withMessage('Major code is required')
      .isLength({ max: 10 }).withMessage('Major code cannot exceed 10 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
  ],
  validateRequest,
  majorController.createMajor
);

/**
 * @swagger
 * /api/majors/{id}:
 *   put:
 *     summary: Update major
 *     tags: [Majors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Major ID
 */
router.put('/:id', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  authorizeResourceAccess(Major),
  [
    body('name').optional().isLength({ max: 100 }).withMessage('Major name cannot exceed 100 characters'),
    body('code').optional().isLength({ max: 10 }).withMessage('Major code cannot exceed 10 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
  ],
  validateRequest,
  majorController.updateMajor
);

/**
 * @swagger
 * /api/majors/{id}:
 *   delete:
 *     summary: Delete major
 *     tags: [Majors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Major ID
 */
router.delete('/:id', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  authorizeResourceAccess(Major),
  majorController.deleteMajor
);

module.exports = router; 