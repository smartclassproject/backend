const Major = require('../models/Major');
const { sendResponse, sendError } = require('../utils/response');

// GET /api/majors - Get all majors across all schools (Super Admin Only)
exports.getAllMajors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // Build query - super admin sees all majors
    const query = {};

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
        .populate('schoolId', 'name location')
        .populate('studentsCount')
        .populate('coursesCount')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Major.countDocuments(query)
    ]);

    return sendResponse(res, 200, { message: 'All majors retrieved successfully', data: majors, pagination: { page, limit, total } });
  } catch (error) {
    sendError(res, 500, 'Error fetching majors', error);
  }
};

// GET /api/majors/school/:schoolId - Get majors in a specific school (Admin Only)
exports.getSchoolMajorsById = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // Verify the school exists
    const School = require('../models/School');
    const school = await School.findById(schoolId);
    if (!school) {
      return sendError(res, 404, 'School not found');
    }

    // Build query for school-specific majors
    const query = { schoolId };

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const majors = await Major.find(query)
      .populate('studentsCount')
      .populate('coursesCount')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);
    const total = await Major.countDocuments(query);

    return sendResponse(res, 200, { message: `Majors in ${school.name} retrieved successfully`, data: majors, pagination: { page, limit, total } });
  } catch (error) {
    sendError(res, 500, 'Error fetching majors', error);
  }
};

// GET /api/majors/school - Get majors in current user's school (School Admin Only)
exports.getMySchoolMajors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // Use the current user's school ID
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return sendResponse(res, 400, 'School ID not found for current user');
    }

    // Build query for school-specific majors
    const query = { schoolId };

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

    return sendResponse(res, 200, { message: 'Your school majors retrieved successfully', data: majors, pagination: { page, limit, total } });
  } catch (error) {
    sendError(res, 500, 'Error fetching majors', error);
  }
};

// GET /api/majors/:id - Get major by ID
exports.getMajorById = async (req, res) => {
  try {
    const major = await Major.findById(req.params.id)
      .populate('studentsCount')
      .populate('coursesCount');

    if (!major) {
      return sendError(res, 404, 'Major not found');
    }

    return sendResponse(res, 200, { message: 'Major retrieved successfully', data: major });
  } catch (error) {
    sendError(res, 500, 'Error fetching major', error);
  }
};

// POST /api/majors - Create new major
exports.createMajor = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    // Check if major with same code already exists in the school
    const existingMajor = await Major.findOne({
      schoolId: req.user.schoolId,
      code: code.toUpperCase()
    });
    if (existingMajor) {
      return sendError(res, 409, 'Major with this code already exists in your school');
    }

    const major = new Major({
      schoolId: req.user.schoolId,
      name,
      code: code.toUpperCase(),
      description
    });

    await major.save();

    return sendResponse(res, 201, { message: 'Major created successfully', data: major });
  } catch (error) {
    sendError(res, 500, 'Error creating major', error);
  }
};

// PUT /api/majors/:id - Update major
exports.updateMajor = async (req, res) => {
  try {
    const { name, code, description, isActive } = req.body;
    const majorId = req.params.id;

    const major = await Major.findById(majorId);
    if (!major) {
      return sendError(res, 'Major not found');
    }

    // Check if code is being changed and conflicts with existing major in the same school
    if (code && code.toUpperCase() !== major.code) {
      const existingMajor = await Major.findOne({
        schoolId: major.schoolId,
        code: code.toUpperCase(),
        _id: { $ne: majorId }
      });
      if (existingMajor) {
        return sendError(res, 409, 'Major with this code already exists in your school');
      }
    }

    // Update fields
    if (name) major.name = name;
    if (code) major.code = code.toUpperCase();
    if (description !== undefined) major.description = description;
    if (isActive !== undefined) major.isActive = isActive;

    await major.save();

    return sendResponse(res, 200, { message: 'Major updated successfully', data: major });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/majors/:id - Delete major
exports.deleteMajor = async (req, res, next) => {
  try {
    const major = await Major.findById(req.params.id);

    if (!major) {
      return sendError(res, 'Major not found');
    }

    // Check if major has associated students
    const hasStudents = await require('../models/Student').exists({ majorId: major._id });
    if (hasStudents) {
      return sendError(res, 400, 'Cannot delete major with enrolled students. Please deactivate instead.');
    }

    // Check if major has associated courses
    const hasCourses = await require('../models/Course').exists({ majorId: major._id });
    if (hasCourses) {
      return sendError(res, 400, 'Cannot delete major with associated courses. Please deactivate instead.');
    }

    await Major.findByIdAndDelete(req.params.id);

    return sendResponse(res, 200, { message: 'Major deleted successfully' });
  } catch (error) {
    next(error);
  }
}; 