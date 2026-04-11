const express = require('express');
const router = express.Router();
const studentController = require('../controllers/students');
const { authorizeRoles } = require('../middlewares/auth');
const { uploadStudentPhoto } = require('../middlewares/uploadStudentPhoto');

const studentPhotoUpload = (req, res, next) => {
  uploadStudentPhoto.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    next();
  });
};

const handlers = [
  authorizeRoles('school_admin'),
  studentPhotoUpload,
  studentController.uploadStudentPhoto
];

/** Legacy path — keep for old clients. Full URL: POST /api/students/students/profile-photo */
router.post('/students/profile-photo', ...handlers);
/** Preferred: POST /api/students/profile-photo */
router.post('/profile-photo', ...handlers);

module.exports = router;
