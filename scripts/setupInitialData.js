const mongoose = require('mongoose');
const AdminUser = require('../models/AdminUser');
const School = require('../models/School');
const Major = require('../models/Major');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Course = require('../models/Course');
const CourseSchedule = require('../models/CourseSchedule');
const Device = require('../models/Device');
require('dotenv').config();

// Initial data
const INITIAL_DATA = {
  superAdmin: {
    email: 'admin@yourdomain.com',
    password: 'YourSecurePassword123!',
    role: 'super_admin',
    isActive: true
  },
  school: {
    name: 'Your School Name',
    location: 'Your School Address'
  },
  schoolAdmin: {
    email: 'schooladmin@yourschool.com',
    password: 'YourSecurePassword123!',
    role: 'school_admin',
    isActive: true
  },
  major: {
    name: 'Computer Science',
    code: 'CS',
    description: 'Bachelor of Science in Computer Science'
  },
  teacher: {
    name: 'Dr. Teacher Name',
    email: 'teacher@yourschool.com',
    phone: '+1234567890',
    department: 'Computer Science',
    specialization: 'Software Engineering',
    employeeId: 'T2024001'
  },
  students: [
    {
      name: 'Student One',
      studentId: '2024001',
      cardId: 'RFID001',
      class: 'A',
      age: 20,
      email: 'student1@yourschool.com',
      phone: '+1234567891'
    },
    {
      name: 'Student Two',
      studentId: '2024002',
      cardId: 'RFID002',
      class: 'A',
      age: 19,
      email: 'student2@yourschool.com',
      phone: '+1234567892'
    },
    {
      name: 'Student Three',
      studentId: '2024003',
      cardId: 'RFID003',
      class: 'B',
      age: 21,
      email: 'student3@yourschool.com',
      phone: '+1234567893'
    }
  ],
  course: {
    name: 'Introduction to Programming',
    code: 'CS101',
    description: 'Fundamentals of programming concepts and practices',
    credits: 3,
    maxStudents: 30
  },
  device: {
    classroom: 'Room 101',
    location: 'Main entrance, left side',
    deviceType: 'RFID Reader',
    serialNumber: 'RFID-2024-001',
    model: 'RFID-Reader-Pro',
    manufacturer: 'YourTech Solutions',
    firmwareVersion: 'v2.1.0'
  }
};

const setupInitialData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB Atlas');

    // 1. Create Super Admin
    console.log('\n🔧 Creating Super Admin...');
    let superAdmin = await AdminUser.findOne({ email: INITIAL_DATA.superAdmin.email });
    if (!superAdmin) {
      superAdmin = new AdminUser(INITIAL_DATA.superAdmin);
      await superAdmin.save();
      console.log('✅ Super Admin created');
    } else {
      console.log('⚠️  Super Admin already exists');
    }

    // 2. Create School
    console.log('\n🏫 Creating School...');
    let school = await School.findOne({ name: INITIAL_DATA.school.name });
    if (!school) {
      school = new School(INITIAL_DATA.school);
      await school.save();
      console.log('✅ School created');
    } else {
      console.log('⚠️  School already exists');
    }

    // 3. Create School Admin
    console.log('\n👨‍💼 Creating School Admin...');
    let schoolAdmin = await AdminUser.findOne({ email: INITIAL_DATA.schoolAdmin.email });
    if (!schoolAdmin) {
      schoolAdmin = new AdminUser({
        ...INITIAL_DATA.schoolAdmin,
        schoolId: school._id
      });
      await schoolAdmin.save();
      console.log('✅ School Admin created');
    } else {
      console.log('⚠️  School Admin already exists');
    }

    // 4. Create Major
    console.log('\n📚 Creating Major...');
    let major = await Major.findOne({ code: INITIAL_DATA.major.code });
    if (!major) {
      major = new Major({
        ...INITIAL_DATA.major,
        schoolId: school._id
      });
      await major.save();
      console.log('✅ Major created');
    } else {
      console.log('⚠️  Major already exists');
    }

    // 5. Create Teacher
    console.log('\n👩‍🏫 Creating Teacher...');
    let teacher = await Teacher.findOne({ email: INITIAL_DATA.teacher.email });
    if (!teacher) {
      teacher = new Teacher({
        ...INITIAL_DATA.teacher,
        schoolId: school._id
      });
      await teacher.save();
      console.log('✅ Teacher created');
    } else {
      console.log('⚠️  Teacher already exists');
    }

    // 6. Create Students
    console.log('\n👨‍🎓 Creating Students...');
    for (const studentData of INITIAL_DATA.students) {
      const existingStudent = await Student.findOne({ studentId: studentData.studentId });
      if (!existingStudent) {
        const student = new Student({
          ...studentData,
          schoolId: school._id,
          majorId: major._id
        });
        await student.save();
        console.log(`✅ Student ${studentData.name} created`);
      } else {
        console.log(`⚠️  Student ${studentData.name} already exists`);
      }
    }

    // 7. Create Course
    console.log('\n📖 Creating Course...');
    let course = await Course.findOne({ code: INITIAL_DATA.course.code });
    if (!course) {
      course = new Course({
        ...INITIAL_DATA.course,
        schoolId: school._id,
        majorId: major._id,
        teacherId: teacher._id
      });
      await course.save();
      console.log('✅ Course created');
    } else {
      console.log('⚠️  Course already exists');
    }

    // 8. Create Device
    console.log('\n📱 Creating Device...');
    let device = await Device.findOne({ serialNumber: INITIAL_DATA.device.serialNumber });
    if (!device) {
      device = new Device({
        ...INITIAL_DATA.device,
        schoolId: school._id
      });
      await device.save();
      console.log('✅ Device created');
    } else {
      console.log('⚠️  Device already exists');
    }

    // 9. Create Course Schedule
    console.log('\n📅 Creating Course Schedule...');
    const existingSchedule = await CourseSchedule.findOne({ 
      courseId: course._id,
      teacherId: teacher._id 
    });
    
    if (!existingSchedule) {
      const schedule = new CourseSchedule({
        courseId: course._id,
        teacherId: teacher._id,
        classroom: 'Room 101',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-05-15'),
        weeklySessions: [
          {
            day: 'Monday',
            startTime: '09:00',
            endTime: '10:30'
          },
          {
            day: 'Wednesday',
            startTime: '09:00',
            endTime: '10:30'
          },
          {
            day: 'Friday',
            startTime: '09:00',
            endTime: '10:30'
          }
        ],
        maxStudents: 30
      });
      await schedule.save();
      console.log('✅ Course Schedule created');
    } else {
      console.log('⚠️  Course Schedule already exists');
    }

    console.log('\n🎉 Initial data setup completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Super Admin:');
    console.log('     Email: admin@yourdomain.com');
    console.log('     Password: YourSecurePassword123!');
    console.log('   School Admin:');
    console.log('     Email: schooladmin@yourschool.com');
    console.log('     Password: YourSecurePassword123!');
    console.log('\n🚀 You can now test the SmartClass API with this data!');

  } catch (error) {
    console.error('❌ Error setting up initial data:', error.message);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
};

// Run the script
setupInitialData(); 