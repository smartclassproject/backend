const express = require('express');
const router = express.Router();
const { authorizeRoles } = require('../middlewares/auth');
const { uploadAsset, enforceContextSizeLimit } = require('../middlewares/uploadAsset');
const controller = require('../controllers/uploads');

router.post(
  '/:context',
  authorizeRoles('super_admin', 'school_admin', 'teacher', 'student', 'parent'),
  uploadAsset.single('file'),
  enforceContextSizeLimit,
  controller.uploadFile
);

module.exports = router;
