const Class = require('../models/Class');
const { sendResponse, sendError, isValidObjectId } = require('../utils/response');

// GET /api/classes - Get all classes for the school (school_admin) or for teacher's school
exports.getClasses = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId) return sendError(res, 403, 'School context required');

    const search = (req.query.search || '').trim();
    const query = { schoolId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const classes = await Class.find(query).sort({ name: 1 });
    return sendResponse(res, 200, { message: 'Classes retrieved successfully', data: classes });
  } catch (error) {
    sendError(res, 500, 'Error fetching classes', error);
  }
};

// GET /api/classes/:id - Get class by ID
exports.getClassById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, 400, 'Invalid class ID');
    const classDoc = await Class.findById(req.params.id);
    if (!classDoc) return sendError(res, 404, 'Class not found');
    if (req.user.schoolId && classDoc.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }
    return sendResponse(res, 200, { message: 'Class retrieved successfully', data: classDoc });
  } catch (error) {
    sendError(res, 500, 'Error fetching class', error);
  }
};

// POST /api/classes - Create class (school_admin)
exports.createClass = async (req, res) => {
  try {
    const { name, code } = req.body;
    const schoolId = req.user.schoolId;
    if (!schoolId) return sendError(res, 403, 'School context required');

    if (!name || !name.trim()) return sendError(res, 400, 'Class name is required');

    const existing = await Class.findOne({ schoolId, name: name.trim() });
    if (existing) return sendError(res, 409, 'A class with this name already exists in your school');

    const classDoc = new Class({
      schoolId,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : undefined
    });
    await classDoc.save();
    return sendResponse(res, 201, { message: 'Class created successfully', data: classDoc });
  } catch (error) {
    sendError(res, 500, 'Error creating class', error);
  }
};

// PUT /api/classes/:id - Update class (school_admin)
exports.updateClass = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, 400, 'Invalid class ID');
    const classDoc = await Class.findById(req.params.id);
    if (!classDoc) return sendError(res, 404, 'Class not found');
    if (classDoc.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    const { name, code } = req.body;
    if (name !== undefined && name.trim()) {
      const existing = await Class.findOne({
        schoolId: classDoc.schoolId,
        name: name.trim(),
        _id: { $ne: classDoc._id }
      });
      if (existing) return sendError(res, 409, 'A class with this name already exists');
      classDoc.name = name.trim();
    }
    if (code !== undefined) classDoc.code = code ? code.trim().toUpperCase() : '';

    await classDoc.save();
    return sendResponse(res, 200, { message: 'Class updated successfully', data: classDoc });
  } catch (error) {
    sendError(res, 500, 'Error updating class', error);
  }
};

// DELETE /api/classes/:id - Delete class (school_admin)
exports.deleteClass = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, 400, 'Invalid class ID');
    const classDoc = await Class.findById(req.params.id);
    if (!classDoc) return sendError(res, 404, 'Class not found');
    if (classDoc.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    const Student = require('../models/Student');
    const inUse = await Student.exists({ classId: classDoc._id });
    if (inUse) return sendError(res, 400, 'Cannot delete class that has students assigned. Reassign or remove students first.');

    await Class.findByIdAndDelete(req.params.id);
    return sendResponse(res, 200, { message: 'Class deleted successfully' });
  } catch (error) {
    sendError(res, 500, 'Error deleting class', error);
  }
};
