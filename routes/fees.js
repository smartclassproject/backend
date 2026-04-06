const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validation');
const { authorizeRoles } = require('../middlewares/auth');
const controller = require('../controllers/fees');

router.get('/instructions', authorizeRoles('school_admin', 'student', 'parent'), controller.getInstructions);
router.post('/instructions', authorizeRoles('school_admin'), controller.upsertInstructions);

router.get('/accounts', authorizeRoles('school_admin'), controller.getFeeAccounts);
router.post('/accounts', authorizeRoles('school_admin'), [
  body('studentId').notEmpty().withMessage('studentId is required'),
  body('totalAmountDue').isNumeric().withMessage('totalAmountDue must be numeric')
], validateRequest, controller.upsertFeeAccount);

router.post('/submissions', authorizeRoles('student', 'parent'), [
  body('studentId').notEmpty().withMessage('studentId is required'),
  body('amountSubmitted').isNumeric().withMessage('amountSubmitted must be numeric'),
  body('paymentMethod').notEmpty().withMessage('paymentMethod is required')
], validateRequest, controller.submitPaymentProof);

router.get('/submissions', authorizeRoles('school_admin', 'student', 'parent'), controller.getPaymentSubmissions);
router.put('/submissions/:id/approve', authorizeRoles('school_admin'), controller.approveSubmission);
router.put('/submissions/:id/reject', authorizeRoles('school_admin'), controller.rejectSubmission);

module.exports = router;
