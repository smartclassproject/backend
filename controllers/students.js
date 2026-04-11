const Student = require('../models/Student');
const School = require('../models/School');
const Major = require('../models/Major');
const Class = require('../models/Class');
const { generateUniqueStudentId } = require('../utils/studentIdGenerator');
const Course = require('../models/Course');
const CourseSchedule = require('../models/CourseSchedule');
const PDFDocument = require('pdfkit');
const StudentUser = require('../models/StudentUser');
const ParentUser = require('../models/ParentUser');
const {sendError, sendResponse} = require('../utils/response');
const { seasonsEnabledForSchoolDoc, ENROLLMENT_SEASONS } = require('../utils/schoolEnrollment');

/** POST /api/students/students/profile-photo */
exports.uploadStudentPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'No image file uploaded (use field name "photo")');
    }
    const profileUrl = `/uploads/students/${req.file.filename}`;
    return sendResponse(res, 200, { message: 'Photo uploaded successfully', data: { profileUrl } });
  } catch (error) {
    return sendError(res, 500, 'Failed to upload photo');
  }
};

const upsertStudentAndParentAccounts = async (studentDoc) => {
  await StudentUser.findOneAndUpdate(
    { studentIdRef: studentDoc._id },
    {
      schoolId: studentDoc.schoolId,
      studentIdRef: studentDoc._id,
      studentId: studentDoc.studentId,
      isActive: !!studentDoc.isActive
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (studentDoc.parentFirstName && studentDoc.parentFirstName.trim()) {
    await ParentUser.findOneAndUpdate(
      { studentIdRef: studentDoc._id, firstName: studentDoc.parentFirstName.trim() },
      {
        schoolId: studentDoc.schoolId,
        studentIdRef: studentDoc._id,
        studentId: studentDoc.studentId,
        firstName: studentDoc.parentFirstName.trim(),
        lastName: studentDoc.parentLastName || '',
        phoneNumber: studentDoc.parentPhoneNumber || '',
        isActive: !!studentDoc.isActive
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
};


// GET /api/students - Get all students with pagination, search and filters
exports.getAllStudents = async (req, res) => {
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
        .populate('classId', 'name code')
        .populate('attendanceCount')
        .populate('presentCount')
        .populate('absentCount')
        .populate('lateCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Student.countDocuments(query)
    ]);

    return sendResponse(res, 200, { message: 'Students retrieved successfully', data: students, pagination: { page, limit, total } });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

// GET /api/students/:id - Get student by ID
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('majorId', 'name code description')
      .populate('classId', 'name code')
      .populate('attendanceCount')
      .populate('presentCount')
      .populate('absentCount')
      .populate('lateCount');

    if (!student) {
      return sendError(res, 404, 'Student not found');
    }

    return sendResponse(res, 200, { message: 'Student retrieved successfully', data: student });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

// POST /api/students - Create new student
exports.createStudent = async (req, res) => {
  try {
    const {
      name,
      studentId: bodyStudentId,
      cardId,
      majorId,
      classId,
      class: studentClass,
      dateOfBirth,
      email,
      phone,
      parentFirstName,
      parentLastName,
      parentPhoneNumber,
      profileUrl,
      enrollmentYear,
      enrollmentDate,
      gender,
      semester,
      entryTerm,
      enrollmentSeason,
      enrollmentCohortYear,
      academicYear,
      isActive
    } = req.body;

    // Check if date of birth is valid
    if (!dateOfBirth) {
      return sendError(res, 400, 'Date of birth is required');
    }

    // check if date of birth is between 10 and 100 years ago
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    const maxDate = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
    const dateOfBirthDate = new Date(dateOfBirth);
    
    if (dateOfBirthDate < minDate || dateOfBirthDate > maxDate) {
      return sendError(res, 400, 'The student is not eligible to be enrolled');
    }

    // Class: require classId or class (legacy)
    let resolvedClass = studentClass || '';
    let resolvedClassId = null;
    if (classId) {
      const classDoc = await Class.findById(classId);
      if (!classDoc) return sendError(res, 404, 'Class not found');
      if (classDoc.schoolId.toString() !== (req.user.schoolId || (await Major.findById(majorId))?.schoolId)?.toString()) {
        return sendError(res, 403, 'Class does not belong to your school');
      }
      resolvedClassId = classDoc._id;
      resolvedClass = classDoc.name;
    } else if (!resolvedClass.trim()) {
      return sendError(res, 400, 'Class is required (select a class or provide class name)');
    }

    let resolvedCardId = cardId != null && String(cardId).trim() ? String(cardId).trim() : undefined;
    if (resolvedCardId && resolvedCardId.length > 50) {
      return sendError(res, 400, 'Card ID cannot exceed 50 characters');
    }
    if (resolvedCardId) {
      const existingCardId = await Student.findOne({ cardId: resolvedCardId });
      if (existingCardId) {
        return sendError(res, 409, 'RFID card ID already exists');
      }
    }

    // Verify major exists and belongs to the school
    const major = await Major.findById(majorId);
    if (!major) {
      return sendError(res, 404, 'Major not found');
    }

    if (req.user.role === 'school_admin' && major.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Major does not belong to your school');
    }

    const schoolId = req.user.role === 'school_admin' ? req.user.schoolId : major.schoolId;

    const schoolDoc = await School.findById(schoolId);
    if (!schoolDoc) {
      return sendError(res, 404, 'School not found');
    }

    let finalStudentId;
    if (req.user.role === 'school_admin') {
      finalStudentId = await generateUniqueStudentId(schoolDoc);
    } else if (bodyStudentId && String(bodyStudentId).trim()) {
      const sid = String(bodyStudentId).trim();
      if (sid.length > 32) {
        return sendError(res, 400, 'Student ID cannot exceed 32 characters');
      }
      finalStudentId = sid;
      const existingStudentId = await Student.findOne({ studentId: finalStudentId });
      if (existingStudentId) {
        return sendError(res, 409, 'Student ID already exists');
      }
    } else {
      finalStudentId = await generateUniqueStudentId(schoolDoc);
    }

    // Enrollment: academic year drives enrollmentYear when provided
    const ay = academicYear !== undefined && academicYear !== '' ? parseInt(academicYear, 10) : null;
    const ey = enrollmentYear !== undefined && enrollmentYear !== '' ? parseInt(enrollmentYear, 10) : null;
    const yearForEnrollment = (!isNaN(ay) && ay >= 2000 && ay <= 2100) ? ay : ((!isNaN(ey) && ey >= 2000 && ey <= 2100) ? ey : null);

    let resolvedEnrollmentDate = enrollmentDate ? new Date(enrollmentDate) : new Date();
    if (yearForEnrollment) {
      resolvedEnrollmentDate = new Date(yearForEnrollment, 0, 1);
    }

    const maxTerm = Math.min(Math.max(schoolDoc.numberOfTerms || 3, 1), 6);
    const rawTerm = entryTerm !== undefined && entryTerm !== '' ? entryTerm : semester;
    let entryTermNum;
    if (rawTerm !== undefined && rawTerm !== '' && rawTerm !== null) {
      entryTermNum = parseInt(rawTerm, 10);
      if (isNaN(entryTermNum) || entryTermNum < 1 || entryTermNum > maxTerm) {
        return sendError(res, 400, `Term must be between 1 and ${maxTerm}`);
      }
    } else {
      entryTermNum = 1;
    }

    const enabledSeasons = seasonsEnabledForSchoolDoc(schoolDoc);
    const seasonRaw =
      enrollmentSeason != null && String(enrollmentSeason).trim()
        ? String(enrollmentSeason).toLowerCase()
        : '';
    if (!seasonRaw || !enabledSeasons.includes(seasonRaw)) {
      return sendError(
        res,
        400,
        `Enrollment semester is required and must be one of: ${enabledSeasons.join(', ')}`
      );
    }

    let cohort = enrollmentCohortYear !== undefined && enrollmentCohortYear !== '' ? parseInt(enrollmentCohortYear, 10) : NaN;
    if (isNaN(cohort) || cohort < 2000 || cohort > 2100) {
      cohort = (!isNaN(ay) && ay >= 2000 && ay <= 2100) ? ay : ((!isNaN(ey) && ey >= 2000 && ey <= 2100) ? ey : NaN);
    }
    if (isNaN(cohort) || cohort < 2000 || cohort > 2100) {
      return sendError(res, 400, 'Enrollment cohort year is required (2000–2100), or send academicYear / enrollmentYear');
    }

    const student = new Student({
      schoolId,
      name,
      studentId: finalStudentId,
      cardId: resolvedCardId,
      majorId,
      classId: resolvedClassId,
      class: resolvedClass,
      enrollmentYear: yearForEnrollment || undefined,
      academicYear: (!isNaN(ay) && ay >= 2000 && ay <= 2100) ? ay : (yearForEnrollment || undefined),
      enrollmentSeason: seasonRaw,
      enrollmentCohortYear: cohort,
      entryTerm: entryTermNum,
      gender: gender || undefined,
      dateOfBirth,
      email: email && String(email).trim() ? String(email).trim().toLowerCase() : undefined,
      phone,
      parentFirstName,
      parentLastName,
      parentPhoneNumber,
      profileUrl,
      enrollmentDate: resolvedEnrollmentDate,
      isActive: isActive !== undefined ? !!isActive : true
    });

    await student.save();
    await upsertStudentAndParentAccounts(student);

    const populatedStudent = await Student.findById(student._id)
      .populate('majorId', 'name code')
      .populate('classId', 'name code');

    return sendResponse(res, 201, { message: 'Student created successfully', data: populatedStudent });
  } catch (error) {
    console.log("Error creating student", error);
    return sendError(res, 500, 'Internal server error');
  }
};

// PUT /api/students/:id - Update student
exports.updateStudent = async (req, res) => {
  try {
    const {
      name,
      cardId,
      majorId,
      classId,
      class: studentClass,
      dateOfBirth,
      email,
      phone,
      parentFirstName,
      parentLastName,
      parentPhoneNumber,
      profileUrl,
      isActive,
      enrollmentDate,
      enrollmentYear,
      gender,
      semester,
      entryTerm,
      enrollmentSeason,
      enrollmentCohortYear,
      academicYear
    } = req.body;

    const student = await Student.findById(req.params.id);
    if (!student) {
      return sendError(res, 404, 'Student not found');
    }

    // Student ID is immutable after creation

    let nextCardId;
    if (cardId !== undefined) {
      nextCardId =
        cardId === null || cardId === ''
          ? undefined
          : String(cardId).trim() || undefined;
      if (nextCardId && nextCardId !== (student.cardId || '')) {
        const existingCardId = await Student.findOne({
          cardId: nextCardId,
          _id: { $ne: student._id }
        });
        if (existingCardId) {
          return sendError(res, 409, 'RFID card ID already exists');
        }
      }
    }

    // Verify major exists and belongs to the school if being changed
    if (majorId && majorId !== student.majorId.toString()) {
      const major = await Major.findById(majorId);
      if (!major) {
        return sendError(res, 404, 'Major not found');
      }

      if (req.user.role === 'school_admin' && major.schoolId.toString() !== req.user.schoolId.toString()) {
        return sendError(res, 403, 'Major does not belong to your school');
      }
    }

    // Class: classId or class (legacy)
    if (classId !== undefined) {
      if (classId) {
        const classDoc = await Class.findById(classId);
        if (!classDoc) return sendError(res, 404, 'Class not found');
        if (classDoc.schoolId.toString() !== student.schoolId.toString()) {
          return sendError(res, 403, 'Class does not belong to your school');
        }
        student.classId = classDoc._id;
        student.class = classDoc.name;
      } else {
        student.classId = undefined;
        student.class = studentClass || '';
      }
    } else if (studentClass !== undefined) {
      student.class = studentClass;
    }

    // Enrollment / academic year
    if (enrollmentYear !== undefined) {
      const y = parseInt(enrollmentYear, 10);
      if (!isNaN(y) && y >= 2000 && y <= 2100) student.enrollmentYear = y;
    }
    if (academicYear !== undefined) {
      const y = parseInt(academicYear, 10);
      if (!isNaN(y) && y >= 2000 && y <= 2100) {
        student.academicYear = y;
        student.enrollmentYear = y;
      }
    }

    let schoolDoc = null;
    const loadSchool = async () => {
      if (!schoolDoc) schoolDoc = await School.findById(student.schoolId);
      return schoolDoc;
    };

    const rawTermUpdate = entryTerm !== undefined ? entryTerm : semester;
    if (rawTermUpdate !== undefined) {
      const sDoc = await loadSchool();
      const maxTerm = Math.min(Math.max(sDoc?.numberOfTerms || 3, 1), 6);
      const s = parseInt(rawTermUpdate, 10);
      if (!isNaN(s) && s >= 1 && s <= maxTerm) student.entryTerm = s;
      else if (rawTermUpdate === null || rawTermUpdate === '') student.entryTerm = undefined;
    }

    if (enrollmentSeason !== undefined) {
      if (enrollmentSeason === null || enrollmentSeason === '') {
        student.enrollmentSeason = undefined;
      } else {
        const season = String(enrollmentSeason).toLowerCase();
        if (!ENROLLMENT_SEASONS.includes(season)) {
          return sendError(res, 400, 'Invalid enrollment semester');
        }
        const sDoc = await loadSchool();
        const enabled = seasonsEnabledForSchoolDoc(sDoc || {});
        if (!enabled.includes(season)) {
          return sendError(res, 400, `Enrollment semester must be one of: ${enabled.join(', ')}`);
        }
        student.enrollmentSeason = season;
      }
    }

    if (enrollmentCohortYear !== undefined) {
      if (enrollmentCohortYear === null || enrollmentCohortYear === '') {
        student.enrollmentCohortYear = undefined;
      } else {
        const y = parseInt(enrollmentCohortYear, 10);
        if (!isNaN(y) && y >= 2000 && y <= 2100) student.enrollmentCohortYear = y;
        else return sendError(res, 400, 'Enrollment cohort year must be 2000–2100');
      }
    }

    if (gender !== undefined) {
      student.gender = gender || undefined;
    }

    // Update fields
    if (name) student.name = name;
    if (cardId !== undefined) {
      student.cardId = nextCardId;
    }
    if (majorId) student.majorId = majorId;
    if (dateOfBirth) student.dateOfBirth = dateOfBirth;
    if (email !== undefined) {
      student.email = email && String(email).trim() ? String(email).trim().toLowerCase() : undefined;
    }
    if (phone !== undefined) student.phone = phone;
    if (parentFirstName !== undefined) student.parentFirstName = parentFirstName;
    if (parentLastName !== undefined) student.parentLastName = parentLastName;
    if (parentPhoneNumber !== undefined) student.parentPhoneNumber = parentPhoneNumber;
    if (profileUrl !== undefined) student.profileUrl = profileUrl;
    if (isActive !== undefined) student.isActive = isActive;
    if (enrollmentDate !== undefined) student.enrollmentDate = new Date(enrollmentDate);
    
    await student.save();
    await upsertStudentAndParentAccounts(student);

    const updatedStudent = await Student.findById(student._id)
      .populate('majorId', 'name code')
      .populate('classId', 'name code');

    return sendResponse(res, 200, { message: 'Student updated successfully', data: updatedStudent });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

// DELETE /api/students/:id - Delete student
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return sendError(res, 404, 'Student not found');
    }

    // Check if student has attendance records
    const hasAttendance = await require('../models/Attendance').exists({ studentId: student._id });
    if (hasAttendance) {
      return sendError(res, 400, 'Cannot delete student with attendance records. Please deactivate instead.');
    }

    await Student.findByIdAndDelete(req.params.id);

    return sendResponse(res, 200, { message: 'Student deleted successfully' });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

// GET /api/students/export/pdf - Export students to PDF
exports.exportStudentsToPDF = async (req, res) => {
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
    doc.text('Date of Birth', tableLeft + colWidth * 4, tableTop);

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
      doc.text(student.dateOfBirth ? student.dateOfBirth.toLocaleDateString() : 'N/A', tableLeft + colWidth * 4, y);

      y += rowHeight;
    });

    doc.end();
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

// GET /api/students/check-card/:cardId - Check RFID card availability
exports.checkCardAvailability = async (req, res) => {
  try {
    const { cardId } = req.params;

    const existingStudent = await Student.findOne({ cardId });
    
    if (existingStudent) {
      return sendResponse(res, 200, { message: 'Card is already in use', data: {
        available: false,
        student: {
          name: existingStudent.name,
          studentId: existingStudent.studentId
        }
      } });
    }

    return sendResponse(res, 200, { message: 'Card is available', data: { available: true } });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
}; 

// GET /api/students/school/students - Get all students across all schools (Super Admin Only)
exports.getAllStudentsAcrossSchools = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const majorId = req.query.majorId || '';
    const classFilter = req.query.class || '';
    const status = req.query.status || '';
    const schoolId = req.query.schoolId || '';
    const skip = (page - 1) * limit;

    // Build query
    const query = {};

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

    // Add school filter
    if (schoolId) {
      query.schoolId = schoolId;
    }

    // Execute query with pagination
    const [students, total] = await Promise.all([
      Student.find(query)
        .populate('schoolId', 'name')
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

    return sendResponse(res, 200, { 
      message: 'Students across all schools retrieved successfully', 
      data: students, 
      pagination: { page, limit, total, pages: Math.ceil(total / limit) } 
    });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

// GET /api/students/school/:schoolId/students - Get students in a specific school (Admin Only)
exports.getStudentsBySchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const majorId = req.query.majorId || '';
    const classFilter = req.query.class || '';
    const status = req.query.status || '';
    const skip = (page - 1) * limit;

    // Build query for specific school
    const query = { schoolId };

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
        .populate('classId', 'name code')
        .populate('attendanceCount')
        .populate('presentCount')
        .populate('absentCount')
        .populate('lateCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Student.countDocuments(query)
    ]);

    return sendResponse(res, 200, { 
      message: 'School students retrieved successfully', 
      data: students, 
      pagination: { page, limit, total, pages: Math.ceil(total / limit) } 
    });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

// GET /api/students/my-school/students - Get students in current user's school (School Admin or Teacher)
exports.getMySchoolStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const majorId = req.query.majorId || '';
    const classFilter = req.query.class || '';
    const status = req.query.status || '';
    const skip = (page - 1) * limit;

    // Build query for current user's school
    const query = { schoolId: req.user.schoolId };

    // Teacher: only students in majors that match the teacher's assigned courses
    if (req.user.role === 'teacher' && req.user.teacherId) {
      const assignedCourseIds = await CourseSchedule.distinct('courseId', {
        teacherId: req.user.teacherId
      });
      const majorIds = await Course.distinct('majorId', { _id: { $in: assignedCourseIds } });
      if (majorIds.length === 0) {
        // Teacher has no assigned courses → no majors → return no students
        return sendResponse(res, 200, {
          message: 'School students retrieved successfully',
          data: [],
          pagination: { page, limit, total: 0, pages: 0 }
        });
      }
      query.majorId = { $in: majorIds };
    }

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    // Add major filter (from query param; for school_admin or further filter for teacher)
    if (majorId) {
      query.majorId = req.user.role === 'teacher' && query.majorId?.$in
        ? { $in: query.majorId.$in.filter(id => id.toString() === majorId) }
        : majorId;
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
        .populate('classId', 'name code')
        .populate('attendanceCount')
        .populate('presentCount')
        .populate('absentCount')
        .populate('lateCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Student.countDocuments(query)
    ]);

    return sendResponse(res, 200, {
      message: 'School students retrieved successfully',
      data: students,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};