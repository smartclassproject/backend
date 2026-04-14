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

    // Multer writes under uploads/<context>/filename. req.file.path is often absolute
    // (e.g. /var/www/backend/uploads/fees_proof/asset-....jpg). Do not use basename-only
    // fallback or URLs become /uploads/asset-....jpg and break static /uploads/fees_proof/... .
    const uploadsRoot = path.resolve(path.join(__dirname, '..', 'uploads'));
    const absoluteFile = path.resolve(req.file.path);
    let relToUploads = path.relative(uploadsRoot, absoluteFile);
    if (!relToUploads || relToUploads.startsWith('..')) {
      const ctx = String(req.uploadContext || req.params.context || 'misc').replace(/[^a-z0-9_-]/gi, '');
      relToUploads = path.join(ctx, req.file.filename);
    }
    const normalizedRelative = path.posix.join(
      'uploads',
      ...relToUploads.split(/[/\\]/).filter(Boolean)
    );
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
