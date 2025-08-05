const Teacher = require('../models/Teacher');
const PDFDocument = require('pdfkit');
const { 
  successResponse, 
  errorResponse, 
  paginatedResponse, 
  createdResponse, 
  updatedResponse, 
  deletedResponse, 
  notFoundResponse 
} = require('../utils/response');

// GET /api/teachers - Get all teachers with pagination, search and filters
exports.getAllTeachers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const department = req.query.department || '';
    const status = req.query.status || '';
    const skip = (page - 1) * limit;

    // Build query based on user role
    const query = {};
    
    // School admin can only see their school's teachers
    if (req.user.role === 'school_admin') {
      query.schoolId = req.user.schoolId;
    }

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Add department filter
    if (department) {
      query.department = { $regex: department, $options: 'i' };
    }

    // Add status filter
    if (status) {
      query.isActive = status === 'active';
    }

    // Execute query with pagination
    const [teachers, total] = await Promise.all([
      Teacher.find(query)
        .populate('schedulesCount')
        .populate('activeSchedulesCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Teacher.countDocuments(query)
    ]);

    return paginatedResponse(res, 'Teachers retrieved successfully', teachers, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// GET /api/teachers/:id - Get teacher by ID
exports.getTeacherById = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('schedulesCount')
      .populate('activeSchedulesCount');

    if (!teacher) {
      return notFoundResponse(res, 'Teacher not found');
    }

    return successResponse(res, 200, 'Teacher retrieved successfully', teacher);
  } catch (error) {
    next(error);
  }
};

// POST /api/teachers - Create new teacher
exports.createTeacher = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      profileUrl,
      department,
      specialization
    } = req.body;

    // Check if email already exists
    const existingTeacher = await Teacher.findOne({ email: email.toLowerCase() });
    if (existingTeacher) {
      return errorResponse(res, 409, 'Email already exists');
    }

    const teacher = new Teacher({
      schoolId: req.user.schoolId,
      name,
      email: email.toLowerCase(),
      phone,
      profileUrl,
      department,
      specialization
    });

    await teacher.save();

    return createdResponse(res, 'Teacher created successfully', teacher);
  } catch (error) {
    next(error);
  }
};

// PUT /api/teachers/:id - Update teacher
exports.updateTeacher = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      profileUrl,
      department,
      specialization,
      isActive
    } = req.body;

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return notFoundResponse(res, 'Teacher not found');
    }

    // Check if email is being changed and conflicts with existing
    if (email && email.toLowerCase() !== teacher.email) {
      const existingTeacher = await Teacher.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: teacher._id }
      });
      if (existingTeacher) {
        return errorResponse(res, 409, 'Email already exists');
      }
    }

    // Update fields
    if (name) teacher.name = name;
    if (email) teacher.email = email.toLowerCase();
    if (phone) teacher.phone = phone;
    if (profileUrl !== undefined) teacher.profileUrl = profileUrl;
    if (department !== undefined) teacher.department = department;
    if (specialization !== undefined) teacher.specialization = specialization;
    if (isActive !== undefined) teacher.isActive = isActive;

    await teacher.save();

    return updatedResponse(res, 'Teacher updated successfully', teacher);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/teachers/:id - Delete teacher
exports.deleteTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    
    if (!teacher) {
      return notFoundResponse(res, 'Teacher not found');
    }

    // Check if teacher has active schedules
    const hasActiveSchedules = await require('../models/CourseSchedule').exists({ 
      teacherId: teacher._id,
      isActive: true,
      endDate: { $gte: new Date() }
    });

    if (hasActiveSchedules) {
      return errorResponse(res, 400, 'Cannot delete teacher with active schedules. Please deactivate instead.');
    }

    await Teacher.findByIdAndDelete(req.params.id);

    return deletedResponse(res, 'Teacher deleted successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/teachers/export/pdf - Export teachers to PDF
exports.exportTeachersToPDF = async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const department = req.query.department || '';

    // Build query based on user role
    const query = {};
    
    if (req.user.role === 'school_admin') {
      query.schoolId = req.user.schoolId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (department) {
      query.department = { $regex: department, $options: 'i' };
    }

    const teachers = await Teacher.find(query)
      .sort({ name: 1 });

    // Create PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=teachers.pdf');
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Teachers Report', { align: 'center' });
    doc.moveDown();

    // Add filters info
    if (search || department) {
      doc.fontSize(12).text('Filters Applied:', { underline: true });
      if (search) doc.text(`Search: ${search}`);
      if (department) doc.text(`Department: ${department}`);
      doc.moveDown();
    }

    // Add table headers
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidth = 120;
    const rowHeight = 20;

    doc.fontSize(10);
    doc.text('Name', tableLeft, tableTop);
    doc.text('Email', tableLeft + colWidth, tableTop);
    doc.text('Phone', tableLeft + colWidth * 2, tableTop);
    doc.text('Department', tableLeft + colWidth * 3, tableTop);

    // Add table data
    let y = tableTop + rowHeight;
    teachers.forEach((teacher, index) => {
      if (y > 700) { // New page if needed
        doc.addPage();
        y = 50;
      }

      doc.text(teacher.name, tableLeft, y);
      doc.text(teacher.email, tableLeft + colWidth, y);
      doc.text(teacher.phone, tableLeft + colWidth * 2, y);
      doc.text(teacher.department || 'N/A', tableLeft + colWidth * 3, y);

      y += rowHeight;
    });

    doc.end();
  } catch (error) {
    next(error);
  }
}; 