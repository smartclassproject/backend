const Major = require('../models/Major');
const { 
  successResponse, 
  errorResponse, 
  paginatedResponse, 
  createdResponse, 
  updatedResponse, 
  deletedResponse, 
  notFoundResponse 
} = require('../utils/response');

// GET /api/majors - Get all majors with pagination and search
exports.getAllMajors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // Build query based on user role
    const query = {};
    
    // School admin can only see their school's majors
    if (req.user.role === 'school_admin') {
      query.schoolId = req.user.schoolId;
    }

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const [majors, total] = await Promise.all([
      Major.find(query)
        .populate('studentsCount')
        .populate('coursesCount')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Major.countDocuments(query)
    ]);

    return paginatedResponse(res, 'Majors retrieved successfully', majors, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// GET /api/majors/:id - Get major by ID
exports.getMajorById = async (req, res, next) => {
  try {
    const major = await Major.findById(req.params.id)
      .populate('studentsCount')
      .populate('coursesCount');

    if (!major) {
      return notFoundResponse(res, 'Major not found');
    }

    return successResponse(res, 200, 'Major retrieved successfully', major);
  } catch (error) {
    next(error);
  }
};

// POST /api/majors - Create new major
exports.createMajor = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;

    // Check if major with same code already exists in the school
    const existingMajor = await Major.findOne({ 
      schoolId: req.user.schoolId,
      code: code.toUpperCase()
    });
    if (existingMajor) {
      return errorResponse(res, 409, 'Major with this code already exists in your school');
    }

    const major = new Major({
      schoolId: req.user.schoolId,
      name,
      code: code.toUpperCase(),
      description
    });

    await major.save();

    return createdResponse(res, 'Major created successfully', major);
  } catch (error) {
    next(error);
  }
};

// PUT /api/majors/:id - Update major
exports.updateMajor = async (req, res, next) => {
  try {
    const { name, code, description, isActive } = req.body;
    const majorId = req.params.id;

    const major = await Major.findById(majorId);
    if (!major) {
      return notFoundResponse(res, 'Major not found');
    }

    // Check if code is being changed and conflicts with existing major in the same school
    if (code && code.toUpperCase() !== major.code) {
      const existingMajor = await Major.findOne({ 
        schoolId: major.schoolId,
        code: code.toUpperCase(),
        _id: { $ne: majorId }
      });
      if (existingMajor) {
        return errorResponse(res, 409, 'Major with this code already exists in your school');
      }
    }

    // Update fields
    if (name) major.name = name;
    if (code) major.code = code.toUpperCase();
    if (description !== undefined) major.description = description;
    if (isActive !== undefined) major.isActive = isActive;

    await major.save();

    return updatedResponse(res, 'Major updated successfully', major);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/majors/:id - Delete major
exports.deleteMajor = async (req, res, next) => {
  try {
    const major = await Major.findById(req.params.id);
    
    if (!major) {
      return notFoundResponse(res, 'Major not found');
    }

    // Check if major has associated students
    const hasStudents = await require('../models/Student').exists({ majorId: major._id });
    if (hasStudents) {
      return errorResponse(res, 400, 'Cannot delete major with enrolled students. Please deactivate instead.');
    }

    // Check if major has associated courses
    const hasCourses = await require('../models/Course').exists({ majorId: major._id });
    if (hasCourses) {
      return errorResponse(res, 400, 'Cannot delete major with associated courses. Please deactivate instead.');
    }

    await Major.findByIdAndDelete(req.params.id);

    return deletedResponse(res, 'Major deleted successfully');
  } catch (error) {
    next(error);
  }
}; 