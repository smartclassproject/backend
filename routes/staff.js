const express = require('express');
const { body, param } = require('express-validator');
const staffController = require('../controllers/staff');
const { validateRequest } = require('../middlewares/validation');
const { authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

router.get(
  '/roles/templates',
  authorizeRoles('super_admin', 'school_admin'),
  staffController.getRoleTemplates
);

router.get(
  '/modules',
  authorizeRoles('super_admin', 'school_admin'),
  staffController.getModules
);

router.post(
  '/modules',
  authorizeRoles('super_admin'),
  [
    body('key').notEmpty().withMessage('key is required'),
    body('label').notEmpty().withMessage('label is required'),
  ],
  validateRequest,
  staffController.createModule
);

router.put(
  '/modules/:id',
  authorizeRoles('super_admin'),
  [param('id').isMongoId().withMessage('Invalid module id')],
  validateRequest,
  staffController.updateModule
);

router.put(
  '/modules/:id/status',
  authorizeRoles('super_admin'),
  [
    param('id').isMongoId().withMessage('Invalid module id'),
    body('isActive').isBoolean().withMessage('isActive must be boolean'),
  ],
  validateRequest,
  staffController.updateModuleStatus
);

router.post(
  '/',
  authorizeRoles('super_admin', 'school_admin'),
  [
    body('firstName').notEmpty().withMessage('firstName is required'),
    body('lastName').notEmpty().withMessage('lastName is required'),
    body('phoneNumber').notEmpty().withMessage('phoneNumber is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('staffRole').notEmpty().withMessage('staffRole is required'),
    body('modules').optional().isArray().withMessage('modules must be an array'),
  ],
  validateRequest,
  staffController.createStaff
);

router.get('/', authorizeRoles('super_admin', 'school_admin'), staffController.getStaffList);

router.get(
  '/:id',
  authorizeRoles('super_admin', 'school_admin'),
  [param('id').isMongoId().withMessage('Invalid staff id')],
  validateRequest,
  staffController.getStaffById
);

router.put(
  '/:id',
  authorizeRoles('super_admin', 'school_admin'),
  [
    param('id').isMongoId().withMessage('Invalid staff id'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('modules').optional().isArray().withMessage('modules must be an array'),
  ],
  validateRequest,
  staffController.updateStaff
);

router.put(
  '/:id/status',
  authorizeRoles('super_admin', 'school_admin'),
  [
    param('id').isMongoId().withMessage('Invalid staff id'),
    body('isActive').isBoolean().withMessage('isActive must be boolean'),
  ],
  validateRequest,
  staffController.updateStaffStatus
);

router.post(
  '/:id/reset-credentials',
  authorizeRoles('super_admin', 'school_admin'),
  [
    param('id').isMongoId().withMessage('Invalid staff id'),
    body('newPassword').optional().isLength({ min: 4 }).withMessage('newPassword min length is 4'),
  ],
  validateRequest,
  staffController.resetStaffCredentials
);

module.exports = router;
