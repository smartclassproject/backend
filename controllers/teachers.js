const Teacher = require('../models/Teacher');
const TeacherUser = require('../models/TeacherUser');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcryptjs');
const {  sendError, sendResponse} = require('../utils/response');

const getCreatorMeta = (req) => {
  if (!req?.user) return { createdByUserId: null, createdByRole: null, createdByModel: null };
  const role = req.user.role || req.user.userType || null;
  const model =
    role === 'school_staff'
      ? 'SchoolStaff'
      : role === 'teacher'
        ? 'TeacherUser'
        : 'AdminUser';
  return {
    createdByUserId: req.user._id || null,
    createdByRole: role,
    createdByModel: model,
  };
};

// GET /api/teachers - Get all teachers with pagination, search and filters
exports.getAllTeachers = async (req, res) => {
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
    if (req.user.role === 'school_admin' || req.user.role === 'school_staff') {
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

    // Add passwordSetup status to each teacher
    const teachersWithPasswordStatus = await Promise.all(
      teachers.map(async (teacher) => {
        const teacherUser = await TeacherUser.findOne({ teacherId: teacher._id }).select('passwordSetup');
        const teacherObj = teacher.toObject();
        teacherObj.passwordSetup = teacherUser ? teacherUser.passwordSetup : false;
        return teacherObj;
      })
    );

    return sendResponse(res, 200, { message: 'Teachers retrieved successfully', data: teachersWithPasswordStatus, pagination: { page, limit, total } });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

// GET /api/teachers/:id - Get teacher by ID
exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('schedulesCount')
      .populate('activeSchedulesCount');

    if (!teacher) {
      return notFoundResponse(res, 'Teacher not found');
    }

    return sendResponse(res, 200, { message: 'Teacher retrieved successfully', data: teacher });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

// POST /api/teachers - Create new teacher
exports.createTeacher = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      profileUrl,
      department,
      specialization,
      defaultPassword
    } = req.body;

    // Check if email already exists
    const existingTeacher = await Teacher.findOne({ email: email.toLowerCase() });
    if (existingTeacher) {
      return sendError(res, 409, 'Email already exists');
    }

    // Check if TeacherUser already exists for this email
    const existingTeacherUser = await TeacherUser.findOne({ email: email.toLowerCase() });
    if (existingTeacherUser) {
      return sendError(res, 409, 'Teacher user account already exists for this email');
    }

    // Create teacher
    const teacher = new Teacher({
      schoolId: req.user.schoolId,
      name,
      email: email.toLowerCase(),
      phone,
      profileUrl,
      department,
      specialization,
      ...getCreatorMeta(req),
    });

    await teacher.save();

    // Create TeacherUser with default password
    const defaultPwd = defaultPassword || process.env.DEFAULT_TEACHER_PASSWORD || 'Teacher@123';
    const saltRounds = 12;
    const hashedDefaultPassword = await bcrypt.hash(defaultPwd, saltRounds);

    const teacherUser = new TeacherUser({
      email: email.toLowerCase(),
      password: hashedDefaultPassword, // Set default password
      defaultPassword: hashedDefaultPassword, // Store for first-time login check
      teacherId: teacher._id,
      passwordSetup: false, // Mark as not set up yet
      isActive: true
    });

    await teacherUser.save();

    // Get school information for email
    const School = require('../models/School');
    const school = await School.findById(req.user.schoolId).select('name location');

    // Send email with login credentials
    try {
      const emailService = require('../utils/emailService');
      await emailService.sendTeacherCredentialsEmail(
        email.toLowerCase(),
        email.toLowerCase(),
        defaultPwd,
        name.split(' ')[0] || name,
        school
      );
      console.log(`✅ Teacher credentials email sent successfully to ${email}`);
    } catch (emailError) {
      console.error('Failed to send teacher credentials email:', emailError);
      // Don't fail the teacher creation if email fails, just log the error
      // The teacher is already created, so we continue
    }

    return sendResponse(res, 201, { 
      message: 'Teacher created successfully. Login credentials have been sent to the teacher\'s email.', 
      data: {
        ...teacher.toObject(),
        defaultPassword: defaultPwd // Return default password for admin reference (only on creation)
      }
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

// PUT /api/teachers/:id - Update teacher
exports.updateTeacher = async (req, res) => {
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
      return sendError(res, 404, 'Teacher not found');
    }

    // Check if email is being changed and conflicts with existing
    if (email && email.toLowerCase() !== teacher.email) {
      const existingTeacher = await Teacher.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: teacher._id }
      });
      if (existingTeacher) {
        return sendError(res, 409, 'Email already exists');
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

    return sendResponse(res, 200, { message: 'Teacher updated successfully', data: teacher });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

// DELETE /api/teachers/:id - Delete teacher
exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    
    if (!teacher) {
      return sendError(res, 404, 'Teacher not found');
    }

    // Check if teacher has active schedules
    const hasActiveSchedules = await require('../models/CourseSchedule').exists({ 
      teacherId: teacher._id,
      isActive: true,
      endDate: { $gte: new Date() }
    });

    if (hasActiveSchedules) {
      return sendError(res, 400, 'Cannot delete teacher with active schedules. Please deactivate instead.');
    }

    await Teacher.findByIdAndDelete(req.params.id);

    return sendResponse(res, 200, { message: 'Teacher deleted successfully' });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

// POST /api/teachers/:id/resend-credentials - Resend login credentials email to teacher
exports.resendTeacherCredentials = async (req, res) => {
  try {
    const teacherId = req.params.id;

    // Find teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return sendError(res, 404, 'Teacher not found');
    }

    // Check access permissions
    if ((req.user.role === 'school_admin' || req.user.role === 'school_staff') && teacher.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied - teacher does not belong to your school');
    }

    // Find teacher user account
    const teacherUser = await TeacherUser.findOne({ teacherId: teacher._id });
    if (!teacherUser) {
      return sendError(res, 404, 'Teacher user account not found');
    }

    // Check if teacher has already set up their password
    if (teacherUser.passwordSetup) {
      return sendError(res, 400, 'Teacher has already set up their password. Cannot resend credentials.');
    }

    // Get or generate default password
    const defaultPwd = process.env.DEFAULT_TEACHER_PASSWORD || 'Teacher@123';
    
    // Update the default password in TeacherUser (in case it was different)
    const saltRounds = 12;
    const hashedDefaultPassword = await bcrypt.hash(defaultPwd, saltRounds);
    teacherUser.password = hashedDefaultPassword;
    teacherUser.defaultPassword = hashedDefaultPassword;
    await teacherUser.save();

    // Get school information for email
    const School = require('../models/School');
    const school = await School.findById(teacher.schoolId).select('name location');

    // Send email with login credentials
    try {
      const emailService = require('../utils/emailService');
      await emailService.sendTeacherCredentialsEmail(
        teacher.email,
        teacher.email,
        defaultPwd,
        teacher.name.split(' ')[0] || teacher.name,
        school
      );
      console.log(`✅ Teacher credentials email resent successfully to ${teacher.email}`);
      
      return sendResponse(res, 200, {
        message: 'Login credentials email has been resent successfully to the teacher.',
        data: {
          teacherId: teacher._id,
          email: teacher.email
        }
      });
    } catch (emailError) {
      console.error('Failed to resend teacher credentials email:', emailError);
      return sendError(res, 500, 'Failed to send email. Please try again later.');
    }
  } catch (error) {
    console.error('Error resending teacher credentials:', error);
    return sendError(res, 500, 'Internal server error');
  }
};

// GET /api/teachers/export/pdf - Export teachers to PDF
exports.exportTeachersToPDF = async (req, res) => {
  try {
    const search = req.query.search || '';
    const department = req.query.department || '';

    // Build query based on user role
    const query = {};
    
    if (req.user.role === 'school_admin' || req.user.role === 'school_staff') {
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

// GET /api/teachers/school/teachers - Get all teachers across all schools (Super Admin Only)
exports.getAllTeachersAcrossSchools = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const department = req.query.department || '';
    const status = req.query.status || '';
    const schoolId = req.query.schoolId || '';
    const skip = (page - 1) * limit;

    // Build query
    const query = {};

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

    // Add school filter
    if (schoolId) {
      query.schoolId = schoolId;
    }

    // Execute query with pagination
    const [teachers, total] = await Promise.all([
      Teacher.find(query)
        .populate('schoolId', 'name')
        .populate('schedulesCount')
        .populate('activeSchedulesCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Teacher.countDocuments(query)
    ]);

    return sendResponse(res, 200, { 
      message: 'Teachers across all schools retrieved successfully', 
      data: teachers, 
      pagination: { page, limit, total, pages: Math.ceil(total / limit) } 
    });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
}; 

// GET /api/teachers/school/teachers - Get teachers from current user's school (School Admin Only)
exports.getMySchoolTeachers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const department = req.query.department || '';
    const status = req.query.status || '';
    const skip = (page - 1) * limit;

    // Build query - only teachers from current user's school
    const query = { schoolId: req.user.schoolId };

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

    // Add passwordSetup status to each teacher
    const teachersWithPasswordStatus = await Promise.all(
      teachers.map(async (teacher) => {
        const teacherUser = await TeacherUser.findOne({ teacherId: teacher._id }).select('passwordSetup');
        const teacherObj = teacher.toObject();
        teacherObj.passwordSetup = teacherUser ? teacherUser.passwordSetup : false;
        return teacherObj;
      })
    );

    return sendResponse(res, 200, { 
      message: 'School teachers retrieved successfully', 
      data: teachersWithPasswordStatus, 
      pagination: { page, limit, total, pages: Math.ceil(total / limit) } 
    });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
}; 