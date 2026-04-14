const path = require('path');
const FileAsset = require('../models/FileAsset');
const { sendResponse, sendError } = require('../utils/response');

const resolveSchoolId = (user) => user?.schoolId || null;

const resolveUploaderModel = (user) => {
  if (user?.role === 'teacher' || user?.userType === 'teacher') return 'TeacherUser';
  if (user?.role === 'student' || user?.userType === 'student') return 'StudentUser';
  if (user?.role === 'parent' || user?.userType === 'parent') return 'ParentUser';
  return 'AdminUser';
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return sendError(res, 400, 'File is required');
    const schoolId = resolveSchoolId(req.user);
    if (!schoolId) return sendError(res, 400, 'schoolId not found for authenticated user');

    const relative = req.file.path.split(path.sep).join('/');
    const normalizedRelative = relative.startsWith('uploads/')
      ? relative
      : `uploads/${path.basename(relative)}`;
    const publicUrl = `/${normalizedRelative}`;

    const doc = await FileAsset.create({
      schoolId,
      uploadedById: req.user._id,
      uploadedByModel: resolveUploaderModel(req.user),
      context: req.uploadContext || req.params.context,
      storagePath: normalizedRelative,
      publicUrl,
      mimeType: req.file.mimetype,
      category: req.uploadCategory || 'other',
      originalName: req.file.originalname,
      extension: path.extname(req.file.originalname || '').toLowerCase(),
      sizeBytes: req.file.size,
    });

    return sendResponse(res, 201, {
      message: 'File uploaded successfully',
      data: {
        assetId: doc._id,
        url: doc.publicUrl,
        mimeType: doc.mimeType,
        category: doc.category,
        sizeBytes: doc.sizeBytes,
        context: doc.context,
        originalName: doc.originalName,
      },
    });
  } catch (error) {
    return sendError(res, 500, 'Error uploading file', error);
  }
};
