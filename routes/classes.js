const express = require('express');
const router = express.Router();
const classController = require('../controllers/classes');
const { authenticateToken, authorizeRoles, requireAnyModuleAccess } = require('../middlewares/auth');
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validation');

// GET /api/classes - Get classes for current school (school_admin, teacher)
router.get('/',
  authenticateToken,
  authorizeRoles('school_admin', 'teacher', 'school_staff'),
  requireAnyModuleAccess('courses', 'students'),
  classController.getClasses
);

// GET /api/classes/:id
router.get('/:id',
  authenticateToken,
  authorizeRoles('school_admin', 'teacher', 'school_staff'),
  requireAnyModuleAccess('courses', 'students'),
  classController.getClassById
);

// POST /api/classes - Create class (school_admin only)
router.post('/',
  authenticateToken,
  authorizeRoles('school_admin'),
  [
    body('name').notEmpty().withMessage('Class name is required').trim().isLength({ max: 50 }),
    body('code').optional().trim().isLength({ max: 15 })
  ],
  validateRequest,
  classController.createClass
);

// PUT /api/classes/:id
router.put('/:id',
  authenticateToken,
  authorizeRoles('school_admin'),
  [
    body('name').optional().trim().notEmpty().isLength({ max: 50 }),
    body('code').optional().trim().isLength({ max: 15 })
  ],
  validateRequest,
  classController.updateClass
);

// DELETE /api/classes/:id
router.delete('/:id',
  authenticateToken,
  authorizeRoles('school_admin'),
  classController.deleteClass
);

module.exports = router;
