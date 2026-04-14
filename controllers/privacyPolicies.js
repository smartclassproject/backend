const PrivacyPolicy = require('../models/PrivacyPolicy');
const { sendResponse, sendError } = require('../utils/response');

exports.upsertPrivacyPolicy = async (req, res) => {
  try {
    const { title, content, version, isActive = true, schoolId = null } = req.body;
    if (!title || !content) return sendError(res, 400, 'title and content are required');

    const doc = await PrivacyPolicy.findOneAndUpdate(
      { schoolId: schoolId || null },
      {
        title: String(title).trim(),
        content: String(content).trim(),
        version: version ? String(version).trim() : undefined,
        isActive: !!isActive,
        publishedAt: new Date(),
        updatedBy: req.user._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return sendResponse(res, 200, { message: 'Privacy policy saved successfully', data: doc });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

exports.getPrivacyPolicyForAdmin = async (req, res) => {
  try {
    const schoolId = req.query.schoolId || null;
    const doc = await PrivacyPolicy.findOne({ schoolId: schoolId || null }).sort({ updatedAt: -1 });
    return sendResponse(res, 200, { message: 'Privacy policy retrieved successfully', data: doc || null });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};
