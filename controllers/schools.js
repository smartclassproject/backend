const School = require('../models/School');
const { sendResponse, sendError } = require('../utils/response');

// GET /api/schools - Get all schools with pagination and search
exports.getAllSchools = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const [schools, total] = await Promise.all([
      School.find(query)
        .populate('studentsCount')
        .populate('teachersCount')
        .populate('devicesCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      School.countDocuments(query)
    ]);
    
    return sendResponse(res, 200, {
      message: 'Schools retrieved successfully',
      data: schools,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });


  } catch (error) {
    next(error);
  }
};

// GET /api/schools/:id - Get school by ID
exports.getSchoolById = async (req, res, next) => {
  try {
    const school = await School.findById(req.params.id)
      .populate('studentsCount')
      .populate('teachersCount')
      .populate('devicesCount');

    if (!school) {
      return sendError(res, 404, 'School not found');
    }

    sendResponse(res, 200, {
      message: 'School retrieved successfully',
      data: school
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/schools - Create new school
exports.createSchool = async (req, res, next) => {
  try {
    const { name, location } = req.body;

    // Check if school with same name already exists
    const existingSchool = await School.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingSchool) {
      return sendError(res, 409, 'School with this name already exists');
    }

    const school = new School({
      name,
      location
    });

    await school.save();

    sendResponse(res, 201, {
      message: 'School created successfully',
      data: school
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/schools/:id - Update school
exports.updateSchool = async (req, res, next) => {
  try {
    const { name, location } = req.body;
    const schoolId = req.params.id;

    const school = await School.findById(schoolId);
    if (!school) {
      return sendError(res, 404, 'School not found');
    }

    // Check if name is being changed and if it conflicts with existing school
    if (name && name !== school.name) {
      const existingSchool = await School.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: schoolId }
      });
      if (existingSchool) {
        return sendError(res, 409, 'School with this name already exists');
      }
    }

    // Update fields
    if (name) school.name = name;
    if (location) school.location = location;

    await school.save();

    sendResponse(res, 200, {
      message: 'School updated successfully',
      data: school
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/schools/:id - Delete school
exports.deleteSchool = async (req, res, next) => {
  try {
    const school = await School.findById(req.params.id);
    
    if (!school) {
      return sendError(res, 404, 'School not found');
    }

    // Check if school has associated data
    const hasStudents = await require('../models/Student').exists({ schoolId: school._id });
    const hasTeachers = await require('../models/Teacher').exists({ schoolId: school._id });
    const hasDevices = await require('../models/Device').exists({ schoolId: school._id });
    const hasAdmins = await require('../models/AdminUser').exists({ schoolId: school._id });

    if (hasStudents || hasTeachers || hasDevices || hasAdmins) {
      return sendError(res, 400, 'Cannot delete school with associated data. Please remove all students, teachers, devices, and admins first.');
    }

    await School.findByIdAndDelete(req.params.id);

    sendResponse(res, 200, {
      message: 'School deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}; 