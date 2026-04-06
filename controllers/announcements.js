const Announcement = require('../models/Announcement');
const { sendResponse, sendError } = require('../utils/response');

exports.getAnnouncements = async (req, res) => {
  try {
    const now = new Date();
    const query = { isActive: true };

    if (req.user.role === 'school_admin' || req.user.role === 'teacher') {
      query.schoolId = req.user.schoolId;
      if (req.user.role === 'teacher') {
        query.$or = [{ targetAudience: { $in: ['ALL'] } }, { targetAudience: { $in: ['TEACHERS'] } }];
      }
    } else if (req.user.role === 'student') {
      query.schoolId = req.user.schoolId;
      query.$or = [{ targetAudience: { $in: ['ALL'] } }, { targetAudience: { $in: ['STUDENTS'] } }];
    } else if (req.user.role === 'parent') {
      query.schoolId = req.user.schoolId;
      query.$or = [{ targetAudience: { $in: ['ALL'] } }, { targetAudience: { $in: ['PARENTS'] } }];
    }

    query.publishAt = { $lte: now };
    query.$and = (query.$and || []).concat([{ $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }] }]);

    const items = await Announcement.find(query).sort({ isPinned: -1, publishAt: -1 });
    return sendResponse(res, 200, { message: 'Announcements retrieved successfully', data: items });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, targetAudience = ['ALL'], publishAt, expiresAt, isPinned = false } = req.body;
    if (!title || !content) return sendError(res, 400, 'Title and content are required');

    const item = await Announcement.create({
      schoolId: req.user.schoolId,
      title,
      content,
      targetAudience,
      publishAt: publishAt ? new Date(publishAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isPinned,
      createdBy: req.user._id,
      createdByModel: 'AdminUser'
    });
    return sendResponse(res, 201, { message: 'Announcement created successfully', data: item });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const item = await Announcement.findById(req.params.id);
    if (!item) return sendError(res, 404, 'Announcement not found');
    if (item.schoolId.toString() !== req.user.schoolId.toString()) return sendError(res, 403, 'Access denied');

    ['title', 'content', 'targetAudience', 'isPinned', 'isActive'].forEach((f) => {
      if (req.body[f] !== undefined) item[f] = req.body[f];
    });
    if (req.body.publishAt !== undefined) item.publishAt = req.body.publishAt ? new Date(req.body.publishAt) : new Date();
    if (req.body.expiresAt !== undefined) item.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : undefined;

    await item.save();
    return sendResponse(res, 200, { message: 'Announcement updated successfully', data: item });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const item = await Announcement.findById(req.params.id);
    if (!item) return sendError(res, 404, 'Announcement not found');
    if (item.schoolId.toString() !== req.user.schoolId.toString()) return sendError(res, 403, 'Access denied');
    await Announcement.findByIdAndDelete(item._id);
    return sendResponse(res, 200, { message: 'Announcement deleted successfully' });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};
