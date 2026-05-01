const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validation');
const { authorizeRoles, requireModuleAccess } = require('../middlewares/auth');
const controller = require('../controllers/announcements');

router.get('/', authorizeRoles('school_admin', 'school_staff', 'teacher', 'student', 'parent'), requireModuleAccess('announcements'), controller.getAnnouncements);

router.post('/', authorizeRoles('school_admin', 'school_staff'), requireModuleAccess('announcements'), [
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required')
], validateRequest, controller.createAnnouncement);

router.put('/:id', authorizeRoles('school_admin', 'school_staff'), requireModuleAccess('announcements'), controller.updateAnnouncement);
router.delete('/:id', authorizeRoles('school_admin', 'school_staff'), requireModuleAccess('announcements'), controller.deleteAnnouncement);

module.exports = router;
