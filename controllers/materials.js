const Material = require('../models/Material');
const Course = require('../models/Course');
const { sendResponse, sendError } = require('../utils/response');

// GET /api/materials - Get all materials with pagination and filters
exports.getAllMaterials = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { courseId, fileType, isPublished, teacherId } = req.query;

    // Build query
    const query = {};

    // Filter by school for school admins
    if (req.user.role === 'school_admin') {
      query.schoolId = req.user.schoolId;
    }

    // Filter by teacher for teachers
    if (req.user.role === 'teacher' || req.user.userType === 'teacher') {
      query.teacherId = req.user.teacherId || req.user._id;
    }

    if (courseId) {
      query.courseId = courseId;
    }

    if (fileType) {
      query.fileType = fileType.toLowerCase();
    }

    if (isPublished !== undefined) {
      query.isPublished = isPublished === 'true';
    }

    if (teacherId && (req.user.role === 'school_admin' || req.user.role === 'super_admin')) {
      query.teacherId = teacherId;
    }

    // Execute query with pagination
    const [materials, total] = await Promise.all([
      Material.find(query)
        .populate('courseId', 'name code')
        .populate('teacherId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Material.countDocuments(query)
    ]);

    return sendResponse(res, 200, {
      message: 'Materials retrieved successfully',
      data: materials,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

// GET /api/materials/:id - Get material by ID
exports.getMaterialById = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
      .populate('courseId', 'name code')
      .populate('teacherId', 'name email');

    if (!material) {
      return sendError(res, 404, 'Material not found');
    }

    // Check access permissions
    if (req.user.role === 'school_admin' && material.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    if ((req.user.role === 'teacher' || req.user.userType === 'teacher') && 
        material.teacherId._id.toString() !== (req.user.teacherId || req.user._id).toString()) {
      return sendError(res, 403, 'Access denied');
    }

    return sendResponse(res, 200, {
      message: 'Material retrieved successfully',
      data: material
    });
  } catch (error) {
    console.error('Error fetching material:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

// POST /api/materials - Create new material
exports.createMaterial = async (req, res) => {
  try {
    const {
      courseId,
      title,
      description,
      fileType,
      fileUrl,
      fileName,
      fileSize,
      isPublished
    } = req.body;

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return sendError(res, 404, 'Course not found');
    }

    // Check access permissions
    if (req.user.role === 'school_admin' && course.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    // Get teacher ID based on user role
    let teacherId;
    if (req.user.role === 'teacher' || req.user.userType === 'teacher') {
      teacherId = req.user.teacherId || req.user._id;
    } else if (req.body.teacherId) {
      teacherId = req.body.teacherId;
    } else {
      return sendError(res, 400, 'Teacher ID is required');
    }

    const material = new Material({
      schoolId: course.schoolId,
      courseId,
      teacherId,
      title,
      description,
      fileType: fileType.toLowerCase(),
      fileUrl,
      fileName,
      fileSize,
      isPublished: isPublished || false
    });

    await material.save();

    const populatedMaterial = await Material.findById(material._id)
      .populate('courseId', 'name code')
      .populate('teacherId', 'name email');

    return sendResponse(res, 201, {
      message: 'Material created successfully',
      data: populatedMaterial
    });
  } catch (error) {
    console.error('Error creating material:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

// PUT /api/materials/:id - Update material
exports.updateMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return sendError(res, 404, 'Material not found');
    }

    // Check access permissions
    if (req.user.role === 'school_admin' && material.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    if ((req.user.role === 'teacher' || req.user.userType === 'teacher') && 
        material.teacherId.toString() !== (req.user.teacherId || req.user._id).toString()) {
      return sendError(res, 403, 'Access denied - you can only update your own materials');
    }

    const {
      title,
      description,
      fileType,
      fileUrl,
      fileName,
      fileSize,
      isPublished
    } = req.body;

    if (title) material.title = title;
    if (description !== undefined) material.description = description;
    if (fileType) material.fileType = fileType.toLowerCase();
    if (fileUrl) material.fileUrl = fileUrl;
    if (fileName) material.fileName = fileName;
    if (fileSize !== undefined) material.fileSize = fileSize;
    if (isPublished !== undefined) material.isPublished = isPublished;

    await material.save();

    const populatedMaterial = await Material.findById(material._id)
      .populate('courseId', 'name code')
      .populate('teacherId', 'name email');

    return sendResponse(res, 200, {
      message: 'Material updated successfully',
      data: populatedMaterial
    });
  } catch (error) {
    console.error('Error updating material:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

// DELETE /api/materials/:id - Delete material
exports.deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return sendError(res, 404, 'Material not found');
    }

    // Check access permissions
    if (req.user.role === 'school_admin' && material.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    if ((req.user.role === 'teacher' || req.user.userType === 'teacher') && 
        material.teacherId.toString() !== (req.user.teacherId || req.user._id).toString()) {
      return sendError(res, 403, 'Access denied - you can only delete your own materials');
    }

    await Material.findByIdAndDelete(req.params.id);

    return sendResponse(res, 200, {
      message: 'Material deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting material:', error);
    return sendError(res, 500, 'Internal server error');
  }
};
