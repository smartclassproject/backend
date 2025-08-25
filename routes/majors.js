const express = require('express');
const router = express.Router();
const majorController = require('../controllers/majors');
const { authenticateToken, authorizeRoles, authorizeResourceAccess, authorize } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');
const { body } = require('express-validator');
const Major = require('../models/Major');

/**
 * @swagger
 * /api/majors/school/majors/all:
 *   get:
 *     summary: Get all majors across all schools (Super Admin Only)
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
 *     responses:
 *       200:
 *         description: All majors retrieved successfully
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
 *                     $ref: '#/components/schemas/Major'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     pages:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Only super admins can view all majors
 *       500:
 *         description: Internal server error
 */
router.get('/school/majors/all', authenticateToken, authorizeRoles('super_admin'), majorController.getAllMajors);

/**
 * @swagger
 * /api/majors/majors/{id}:
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
 *     responses:
 *       200:
 *         description: Major retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Major'
 *       400:
 *         description: Invalid major ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Major not found
 *       500:
 *         description: Internal server error
 */
router.get('/majors/:id', authenticateToken, authorize('school_admin', 'super_admin'), majorController.getMajorById);




/**
 * @swagger
 * /api/majors/school/{schoolId}/majors:
 *   get:
 *     summary: Get all majors in a specific school (Admin Only)
 *     tags: [Majors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: schoolId
 *         required: true
 *         schema:
 *           type: string
 *         description: School ID
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
 *     responses:
 *       200:
 *         description: School majors retrieved successfully
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
 *                   $ref: '#/components/schemas/Major'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     total:
 *                       type: integer
 *                       example: 15
 *                     pages:
 *                       type: integer
 *                       example: 2
 *       400:
 *         description: Invalid school ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Only admins can view specific school majors
 *       404:
 *         description: School not found
 *       500:
 *         description: Internal server error
 */
router.get('school/:schoolId/majors', 
  authenticateToken, 
  authorizeRoles('super_admin'),
  majorController.getSchoolMajorsById
);

/**
 * @swagger
 * /api/majors/school/majors:
 *   get:
 *     summary: Get all majors in current user's school (School Admin Only)
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
 *     responses:
 *       200:
 *         description: School majors retrieved successfully
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
 *                   $ref: '#/components/schemas/Major'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     total:
 *                       type: integer
 *                       example: 15
 *                     pages:
 *                       type: integer
 *                       example: 2
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Only school admins can access this endpoint
 *       500:
 *         description: Internal server error
 */
router.get('/school/majors', 
  authenticateToken, 
  authorize('school_admin'),
  majorController.getMySchoolMajors
);


/**
 * @swagger
 * /api/majors/majors:
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
 *     responses:
 *       201:
 *         description: Major created successfully
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
 *                   example: "Major created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Major'
 *       400:
 *         description: Validation error or major code already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - only school admins can create majors
 *       500:
 *         description: Internal server error
 */
router.post('/majors', 
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
 * /api/majors/majors/{id}:
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Major name
 *                 example: "Computer Science"
 *               code:
 *                 type: string
 *                 description: Major code
 *                 example: "CS"
 *               description:
 *                 type: string
 *                 description: Major description
 *                 example: "Study of computer systems and software"
 *     responses:
 *       200:
 *         description: Major updated successfully
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
 *                   example: "Major updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Major'
 *       400:
 *         description: Validation error or major code already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Major not found
 *       500:
 *         description: Internal server error
 */
router.put('/majors/:id', 
  authenticateToken, 
  authorizeRoles('school_admin'),
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
 * /api/majors/majors/{id}:
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
 *     responses:
 *       200:
 *         description: Major deleted successfully
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
 *                   example: "Major deleted successfully"
 *       400:
 *         description: Invalid major ID or major cannot be deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Major not found
 *       500:
 *         description: Internal server error
 */
router.delete('/majors/:id', 
  authenticateToken, 
  authorize('school_admin'),
  majorController.deleteMajor
);

module.exports = router; 