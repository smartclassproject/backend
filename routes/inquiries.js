const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validation');
const { authorizeRoles, requireModuleAccess } = require('../middlewares/auth');
const controller = require('../controllers/inquiries');

router.post('/', authorizeRoles('student', 'parent'), [
  body('subject').notEmpty().withMessage('Subject is required'),
  body('message').notEmpty().withMessage('Message is required')
], validateRequest, controller.createInquiry);

router.get('/my', authorizeRoles('student', 'parent'), controller.getMyInquiries);
router.post('/:id/reply', authorizeRoles('student', 'parent', 'school_admin', 'school_staff'), controller.replyToInquiry);

router.get('/', authorizeRoles('school_admin', 'school_staff'), requireModuleAccess('inquiries'), controller.getSchoolInquiries);
router.put('/:id/status', authorizeRoles('school_admin', 'school_staff'), requireModuleAccess('inquiries'), controller.updateInquiryStatus);

module.exports = router;
