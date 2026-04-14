const fs = require('fs');
const path = require('path');
const multer = require('multer');

const MB = 1024 * 1024;

const uploadPolicies = {
  fees_proof: {
    maxSize: 5 * MB,
    allowedMimePrefixes: ['image/'],
    // Android gallery often reports application/octet-stream; rely on extension + image MIME.
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'],
  },
  study_material: {
    maxSize: 100 * MB,
    allowedMimePrefixes: ['image/', 'video/'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.webm', '.pdf', '.ppt', '.pptx', '.doc', '.docx'],
  },
  announcement_attachment: {
    maxSize: 20 * MB,
    allowedMimePrefixes: ['image/'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.ppt', '.pptx', '.doc', '.docx'],
  },
};

const safeContext = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');

const resolvePolicy = (context) => uploadPolicies[safeContext(context)] || null;

const resolveCategory = (mimetype = '') => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (
    mimetype === 'application/pdf' ||
    mimetype === 'application/msword' ||
    mimetype === 'application/vnd.ms-powerpoint' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'document';
  }
  return 'other';
};

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const context = safeContext(req.params.context || req.body.context);
    if (!resolvePolicy(context)) {
      return cb(new Error('Unsupported upload context'));
    }
    const dir = path.join(__dirname, '..', 'uploads', context);
    fs.mkdirSync(dir, { recursive: true });
    req.uploadContext = context;
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
    cb(null, `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const context = safeContext(req.params.context || req.body.context);
  const policy = resolvePolicy(context);
  if (!policy) return cb(new Error('Unsupported upload context'));

  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  const isAllowedMime = policy.allowedMimePrefixes.some((prefix) => mime.startsWith(prefix));
  const isAllowedExt = policy.allowedExtensions.includes(ext);
  // Some devices send octet-stream or empty MIME for valid image files.
  const isOctetOrUnknownImage =
    (mime === 'application/octet-stream' || mime === '' || mime === 'binary/octet-stream') &&
    policy.allowedExtensions.includes(ext);
  if (!isAllowedMime && !isAllowedExt && !isOctetOrUnknownImage) {
    return cb(new Error(`Invalid file type for context ${context}`));
  }
  req.uploadContext = context;
  let category = resolveCategory(mime);
  if (context === 'fees_proof') {
    const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
    if (mime.startsWith('image/') || imageExts.includes(ext)) {
      category = 'image';
    }
  }
  req.uploadCategory = category;
  cb(null, true);
};

const uploadAsset = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * MB,
  },
});

const enforceContextSizeLimit = (req, res, next) => {
  const context = safeContext(req.params.context || req.body.context);
  const policy = resolvePolicy(context);
  if (!policy) {
    return res.status(400).json({ success: false, message: 'Unsupported upload context' });
  }
  if (req.file && req.file.size > policy.maxSize) {
    return res.status(400).json({
      success: false,
      message: `File exceeds size limit for ${context}. Max ${Math.floor(policy.maxSize / MB)}MB`,
    });
  }
  return next();
};

module.exports = {
  uploadAsset,
  enforceContextSizeLimit,
  resolveCategory,
};
