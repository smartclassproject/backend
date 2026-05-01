const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validation');
const { authorizeRoles, requireModuleAccess } = require('../middlewares/auth');
const controller = require('../controllers/fees');

router.get('/instructions', authorizeRoles('school_admin', 'school_staff', 'student', 'parent'), controller.getInstructions);
router.post('/instructions', authorizeRoles('school_admin', 'school_staff'), requireModuleAccess('finance'), controller.upsertInstructions);

router.get('/accounts', authorizeRoles('school_admin', 'school_staff'), requireModuleAccess('finance'), controller.getFeeAccounts);
router.post('/accounts', authorizeRoles('school_admin', 'school_staff'), requireModuleAccess('finance'), [
  body('studentId').notEmpty().withMessage('studentId is required'),
  body('totalAmountDue').isNumeric().withMessage('totalAmountDue must be numeric')
], validateRequest, controller.upsertFeeAccount);
router.post('/accounts/bulk', authorizeRoles('school_admin', 'school_staff'), requireModuleAccess('finance'), [
  body('mode').isIn(['ALL_ACTIVE', 'COHORT']).withMessage('mode must be ALL_ACTIVE or COHORT'),
  body('totalAmountDue').isNumeric().withMessage('totalAmountDue must be numeric'),
  body('enrollmentSeason').optional().isString(),
  body('enrollmentCohortYear').optional().isInt({ min: 2000, max: 2100 }),
  body('onlyActive').optional().isBoolean(),
  body('currency').optional().isString(),
  body('dryRun').optional().isBoolean(),
], validateRequest, controller.bulkUpsertFeeAccounts);

router.post('/submissions', authorizeRoles('student', 'parent'), [
  body('studentId').notEmpty().withMessage('studentId is required'),
  body('amountSubmitted').isNumeric().withMessage('amountSubmitted must be numeric'),
  body('paymentMethod').notEmpty().withMessage('paymentMethod is required')
], validateRequest, controller.submitPaymentProof);

router.get('/submissions', authorizeRoles('school_admin', 'school_staff', 'student', 'parent'), controller.getPaymentSubmissions);
router.put('/submissions/:id/approve', authorizeRoles('school_admin', 'school_staff'), requireModuleAccess('finance'), controller.approveSubmission);
router.put('/submissions/:id/reject', authorizeRoles('school_admin', 'school_staff'), requireModuleAccess('finance'), controller.rejectSubmission);

module.exports = router;
