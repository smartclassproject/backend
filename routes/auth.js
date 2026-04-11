const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const profileController = require('../controllers/profile');
const { validateRequest } = require('../middlewares/validation');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { body } = require('express-validator');
const { uploadProfilePhoto } = require('../middlewares/uploadProfilePhoto');

const profilePhotoUpload = (req, res, next) => {
  uploadProfilePhoto.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    next();
  });
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user (super_admin or school_admin)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: "superadmin@smartclass.com"
 *               password:
 *                 type: string
 *                 description: User password
 *                 example: "YourSecurePassword123!"
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT token for authentication
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                           enum: [super_admin, school_admin]
 *                         schoolId:
 *                           type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account deactivated
 */

// @route   POST /api/auth/login
// @desc    Login user (super_admin or school_admin)
router.post('/login', 
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  authController.login
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
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
 *                   example: "Logout successful"
 */
// @route   POST /api/auth/logout
// @desc    Logout user
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/auth/session:
 *   get:
 *     summary: Check current session (whoami)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session valid
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
 *                   example: "Session valid"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/AdminUser'
 *                     session:
 *                       type: object
 *                       properties:
 *                         authenticated:
 *                           type: boolean
 *                           example: true
 *                         lastLogin:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:30:00.000Z"
 *                         tokenExpiresIn:
 *                           type: string
 *                           example: "7d"
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["manage_schools", "manage_admins", "manage_students"]
 *       401:
 *         description: Not authenticated or invalid token
 *       403:
 *         description: Account deactivated
 *       500:
 *         description: Internal server error
 */
// @route   GET /api/auth/session
// @desc    Check session (whoami)
router.get('/session', authenticateToken, authController.session);

router.get(
  '/profile',
  authenticateToken,
  authorizeRoles('super_admin', 'school_admin', 'teacher'),
  profileController.getProfile
);

router.patch(
  '/profile',
  authenticateToken,
  authorizeRoles('super_admin', 'school_admin', 'teacher'),
  [
    body('name').optional().isLength({ max: 100 }).withMessage('Name is too long'),
    body('phone').optional().isLength({ max: 30 }).withMessage('Phone is too long'),
    body('profileUrl').optional().isLength({ max: 500 }).withMessage('Profile URL is too long'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email'),
    body('department').optional().isLength({ max: 100 }),
    body('specialization').optional().isLength({ max: 200 })
  ],
  validateRequest,
  profileController.patchProfile
);

router.put(
  '/profile/password',
  authenticateToken,
  authorizeRoles('super_admin', 'school_admin', 'teacher'),
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 4 }).withMessage('New password must be at least 4 characters')
  ],
  validateRequest,
  profileController.changePassword
);

router.post(
  '/profile/photo',
  authenticateToken,
  authorizeRoles('super_admin', 'school_admin', 'teacher'),
  profilePhotoUpload,
  profileController.uploadProfilePhoto
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset for forgotten password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: "admin@yourdomain.com"
 *     responses:
 *       200:
 *         description: Password reset email sent (if account exists)
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
 *                   example: "If an account with that email exists, a password reset link has been sent."
 *       400:
 *         description: Email is required
 *       500:
 *         description: Failed to send password reset email
 */
// @route   POST /api/auth/forgot-password
// @desc    Request password reset for forgotten password
router.post('/forgot-password', 
  [
    body('email').isEmail().withMessage('Please enter a valid email')
  ],
  validateRequest,
  authController.forgotPassword
);

/**
 * @swagger
 * /api/auth/setup-password:
 *   post:
 *     summary: Set up password using token from email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password setup token from email
 *               password:
 *                 type: string
 *                 description: New password
 *                 minLength: 4
 *     responses:
 *       200:
 *         description: Password set up successfully and user logged in
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
 *                   example: "Password set up successfully. You are now logged in."
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT authentication token
 *                     user:
 *                       type: object
 *                       description: User profile information
 *       400:
 *         description: Invalid token or password
 *       404:
 *         description: Token not found or expired
 */
// @route   POST /api/auth/setup-password
// @desc    Set up password using token from email
router.post('/setup-password', authController.setupPassword);

/**
 * @swagger
 * /api/auth/teacher/set-password:
 *   post:
 *     summary: Set new password for teacher on first login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - defaultPassword
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Teacher email address
 *               defaultPassword:
 *                 type: string
 *                 description: The default password provided by admin
 *               newPassword:
 *                 type: string
 *                 description: The new password to set
 *                 minLength: 4
 *     responses:
 *       200:
 *         description: Password set successfully and teacher logged in
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
 *                   example: "Password set successfully. You are now logged in."
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT authentication token
 *                     user:
 *                       type: object
 *                       description: Teacher profile information
 *       400:
 *         description: Invalid request or password already set
 *       401:
 *         description: Invalid default password
 *       404:
 *         description: Teacher user not found
 */
// @route   POST /api/auth/teacher/set-password
// @desc    Set new password for teacher on first login
router.post('/teacher/set-password',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('defaultPassword').notEmpty().withMessage('Default password is required'),
    body('newPassword').isLength({ min: 4 }).withMessage('New password must be at least 4 characters long')
  ],
  validateRequest,
  authController.teacherSetPassword
);


// Student app authentication
router.post('/student/login',
  [
    body('studentId').notEmpty().withMessage('Student ID is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  authController.studentLogin
);

// Parent app authentication
router.post('/parent/login',
  [
    body('studentId').notEmpty().withMessage('Student ID is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  authController.parentLogin
);

// Complete first login (student/parent)
router.post('/complete-first-login',
  [
    body('role').isIn(['student', 'parent']).withMessage('Role must be student or parent'),
    body('userId').notEmpty().withMessage('userId is required'),
    body('newPassword').isLength({ min: 4 }).withMessage('New password must be at least 4 characters')
  ],
  validateRequest,
  authController.completeFirstLogin
);

module.exports = router; 