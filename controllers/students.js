const Student = require('../models/Student');
const Major = require('../models/Major');
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

// GET /api/students - Get all students with pagination, search and filters
exports.getAllStudents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const majorId = req.query.majorId || '';
    const classFilter = req.query.class || '';
    const status = req.query.status || '';
    const skip = (page - 1) * limit;

    // Build query based on user role
    const query = {};
    
    // School admin can only see their school's students
    if (req.user.role === 'school_admin') {
      query.schoolId = req.user.schoolId;
    }

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    // Add major filter
    if (majorId) {
      query.majorId = majorId;
    }

    // Add class filter
    if (classFilter) {
      query.class = classFilter;
    }

    // Add status filter
    if (status) {
      query.isActive = status === 'active';
    }

    // Execute query with pagination
    const [students, total] = await Promise.all([
      Student.find(query)
        .populate('majorId', 'name code')
        .populate('attendanceCount')
        .populate('presentCount')
        .populate('absentCount')
        .populate('lateCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Student.countDocuments(query)
    ]);

    return paginatedResponse(res, 'Students retrieved successfully', students, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// GET /api/students/:id - Get student by ID
exports.getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('majorId', 'name code description')
      .populate('attendanceCount')
      .populate('presentCount')
      .populate('absentCount')
      .populate('lateCount');

    if (!student) {
      return notFoundResponse(res, 'Student not found');
    }

    return successResponse(res, 200, 'Student retrieved successfully', student);
  } catch (error) {
    next(error);
  }
};

// POST /api/students - Create new student
exports.createStudent = async (req, res, next) => {
  try {
    const {
      name,
      studentId,
      cardId,
      majorId,
      class: studentClass,
      age,
      email,
      phone,
      profileUrl
    } = req.body;

    // Check if student ID already exists
    const existingStudentId = await Student.findOne({ studentId });
    if (existingStudentId) {
      return errorResponse(res, 409, 'Student ID already exists');
    }

    // Check if RFID card ID already exists
    const existingCardId = await Student.findOne({ cardId });
    if (existingCardId) {
      return errorResponse(res, 409, 'RFID card ID already exists');
    }

    // Verify major exists and belongs to the school
    const major = await Major.findById(majorId);
    if (!major) {
      return errorResponse(res, 404, 'Major not found');
    }

    if (req.user.role === 'school_admin' && major.schoolId.toString() !== req.user.schoolId.toString()) {
      return errorResponse(res, 403, 'Major does not belong to your school');
    }

    const student = new Student({
      schoolId: req.user.role === 'school_admin' ? req.user.schoolId : major.schoolId,
      name,
      studentId,
      cardId,
      majorId,
      class: studentClass,
      age,
      email,
      phone,
      profileUrl
    });

    await student.save();

    const populatedStudent = await Student.findById(student._id)
      .populate('majorId', 'name code');

    return createdResponse(res, 'Student created successfully', populatedStudent);
  } catch (error) {
    next(error);
  }
};

// PUT /api/students/:id - Update student
exports.updateStudent = async (req, res, next) => {
  try {
    const {
      name,
      studentId,
      cardId,
      majorId,
      class: studentClass,
      age,
      email,
      phone,
      profileUrl,
      isActive
    } = req.body;

    const student = await Student.findById(req.params.id);
    if (!student) {
      return notFoundResponse(res, 'Student not found');
    }

    // Check if student ID is being changed and conflicts with existing
    if (studentId && studentId !== student.studentId) {
      const existingStudentId = await Student.findOne({ 
        studentId,
        _id: { $ne: student._id }
      });
      if (existingStudentId) {
        return errorResponse(res, 409, 'Student ID already exists');
      }
    }

    // Check if RFID card ID is being changed and conflicts with existing
    if (cardId && cardId !== student.cardId) {
      const existingCardId = await Student.findOne({ 
        cardId,
        _id: { $ne: student._id }
      });
      if (existingCardId) {
        return errorResponse(res, 409, 'RFID card ID already exists');
      }
    }

    // Verify major exists and belongs to the school if being changed
    if (majorId && majorId !== student.majorId.toString()) {
      const major = await Major.findById(majorId);
      if (!major) {
        return errorResponse(res, 404, 'Major not found');
      }

      if (req.user.role === 'school_admin' && major.schoolId.toString() !== req.user.schoolId.toString()) {
        return errorResponse(res, 403, 'Major does not belong to your school');
      }
    }

    // Update fields
    if (name) student.name = name;
    if (studentId) student.studentId = studentId;
    if (cardId) student.cardId = cardId;
    if (majorId) student.majorId = majorId;
    if (studentClass) student.class = studentClass;
    if (age) student.age = age;
    if (email !== undefined) student.email = email;
    if (phone !== undefined) student.phone = phone;
    if (profileUrl !== undefined) student.profileUrl = profileUrl;
    if (isActive !== undefined) student.isActive = isActive;

    await student.save();

    const updatedStudent = await Student.findById(student._id)
      .populate('majorId', 'name code');

    return updatedResponse(res, 'Student updated successfully', updatedStudent);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/students/:id - Delete student
exports.deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return notFoundResponse(res, 'Student not found');
    }

    // Check if student has attendance records
    const hasAttendance = await require('../models/Attendance').exists({ studentId: student._id });
    if (hasAttendance) {
      return errorResponse(res, 400, 'Cannot delete student with attendance records. Please deactivate instead.');
    }

    await Student.findByIdAndDelete(req.params.id);

    return deletedResponse(res, 'Student deleted successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/students/export/pdf - Export students to PDF
exports.exportStudentsToPDF = async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const majorId = req.query.majorId || '';
    const classFilter = req.query.class || '';

    // Build query based on user role
    const query = {};
    
    if (req.user.role === 'school_admin') {
      query.schoolId = req.user.schoolId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    if (majorId) {
      query.majorId = majorId;
    }

    if (classFilter) {
      query.class = classFilter;
    }

    const students = await Student.find(query)
      .populate('majorId', 'name code')
      .sort({ name: 1 });

    // Create PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=students.pdf');
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Students Report', { align: 'center' });
    doc.moveDown();

    // Add filters info
    if (search || majorId || classFilter) {
      doc.fontSize(12).text('Filters Applied:', { underline: true });
      if (search) doc.text(`Search: ${search}`);
      if (majorId) doc.text(`Major ID: ${majorId}`);
      if (classFilter) doc.text(`Class: ${classFilter}`);
      doc.moveDown();
    }

    // Add table headers
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidth = 100;
    const rowHeight = 20;

    doc.fontSize(10);
    doc.text('Name', tableLeft, tableTop);
    doc.text('Student ID', tableLeft + colWidth, tableTop);
    doc.text('Class', tableLeft + colWidth * 2, tableTop);
    doc.text('Major', tableLeft + colWidth * 3, tableTop);
    doc.text('Age', tableLeft + colWidth * 4, tableTop);

    // Add table data
    let y = tableTop + rowHeight;
    students.forEach((student, index) => {
      if (y > 700) { // New page if needed
        doc.addPage();
        y = 50;
      }

      doc.text(student.name, tableLeft, y);
      doc.text(student.studentId, tableLeft + colWidth, y);
      doc.text(student.class, tableLeft + colWidth * 2, y);
      doc.text(student.majorId ? student.majorId.name : 'N/A', tableLeft + colWidth * 3, y);
      doc.text(student.age.toString(), tableLeft + colWidth * 4, y);

      y += rowHeight;
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};

// GET /api/students/check-card/:cardId - Check RFID card availability
exports.checkCardAvailability = async (req, res, next) => {
  try {
    const { cardId } = req.params;

    const existingStudent = await Student.findOne({ cardId });
    
    if (existingStudent) {
      return successResponse(res, 200, 'Card is already in use', {
        available: false,
        student: {
          name: existingStudent.name,
          studentId: existingStudent.studentId
        }
      });
    }

    return successResponse(res, 200, 'Card is available', {
      available: true
    });
  } catch (error) {
    next(error);
  }
}; 