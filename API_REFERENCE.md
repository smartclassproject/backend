# SmartClass API Reference

## Base URL
```
http://localhost:5000/api
```

## Authentication

### 1. Login
**POST** `/auth/login`

Login with email and password to get JWT token.

**Request Body:**
```json
{
  "email": "admin@yourdomain.com",
  "password": "YourSecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "admin@yourdomain.com",
      "role": "super_admin",
      "schoolId": null
    }
  }
}
```

### 2. Logout
**POST** `/auth/logout`

Logout user (client-side token removal).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### 3. Check Session
**GET** `/auth/session`

Check current user session.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Session valid",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "admin@yourdomain.com",
      "role": "super_admin",
      "schoolId": null
    }
  }
}
```

## Schools

### Get All Schools
**GET** `/schools`

**Headers:**
```
Authorization: Bearer <token>
```

### Create School
**POST** `/schools`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New School",
  "location": "Your School Address"
}
```

## Admins

### Get All Admins
**GET** `/admins`

**Headers:**
```
Authorization: Bearer <token>
```

### Get Available Schools for Admin Creation
**GET** `/admins/schools`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Your School Name",
      "location": "Your School Address"
    }
  ]
}
```

### Create Admin
**POST** `/admins`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "username": "schooladmin1",
  "email": "admin@school.edu",
  "password": "SecurePass123!",
  "role": "school_admin",
  "schoolId": "507f1f77bcf86cd799439011",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Important Notes:**
- `schoolId` is **REQUIRED** when `role` is `school_admin`
- `schoolId` is **NOT needed** when `role` is `super_admin`
- Only `super_admin` users can create new admins

## Students

### Get All Students
**GET** `/students`

**Headers:**
```
Authorization: Bearer <token>
```

### Create Student
**POST** `/students`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Student Name",
  "studentId": "2024001",
  "cardId": "RFID001",
  "majorId": "507f1f77bcf86cd799439012",
  "class": "A",
  "age": 20,
  "email": "student@yourschool.com",
  "phone": "+1234567890"
}
```

## Teachers

### Get All Teachers
**GET** `/teachers`

**Headers:**
```
Authorization: Bearer <token>
```

### Create Teacher
**POST** `/teachers`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Dr. Teacher Name",
  "email": "teacher@yourschool.com",
  "phone": "+1234567890",
  "department": "Computer Science",
  "specialization": "Software Engineering",
  "employeeId": "T2024001"
}
```

## Courses

### Get All Courses
**GET** `/courses`

**Headers:**
```
Authorization: Bearer <token>
```

### Create Course
**POST** `/courses`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Introduction to Programming",
  "code": "CS101",
  "description": "Fundamentals of programming",
  "credits": 3,
  "majorId": "507f1f77bcf86cd799439012",
  "teacherId": "507f1f77bcf86cd799439013",
  "maxStudents": 30
}
```

## Attendance

### Get All Attendance Records
**GET** `/attendance`

**Headers:**
```
Authorization: Bearer <token>
```

### RFID Check-in
**POST** `/attendance/check-in`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "cardId": "RFID001",
  "deviceId": "507f1f77bcf86cd799439014",
  "classroom": "Room 101"
}
```

### Create Attendance Manually
**POST** `/attendance`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "studentId": "507f1f77bcf86cd799439015",
  "courseId": "507f1f77bcf86cd799439016",
  "scheduleId": "507f1f77bcf86cd799439017",
  "deviceId": "507f1f77bcf86cd799439014",
  "classroom": "Room 101",
  "status": "Present",
  "notes": "Student arrived on time"
}
```

## Devices

### Get All Devices
**GET** `/devices`

**Headers:**
```
Authorization: Bearer <token>
```

### Create Device
**POST** `/devices`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "classroom": "Room 101",
  "location": "Main entrance, left side",
  "deviceType": "RFID Reader",
  "serialNumber": "RFID-2024-001",
  "model": "RFID-Reader-Pro",
  "manufacturer": "SmartTech Solutions"
}
```

## Dashboard

### Get Dashboard Statistics
**GET** `/dashboard/stats`

**Headers:**
```
Authorization: Bearer <token>
```

### Get Recent Activity
**GET** `/dashboard/recent-activity`

**Headers:**
```
Authorization: Bearer <token>
```

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please enter a valid email"
    }
  ]
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Forbidden (403)
```json
{
  "success": false,
  "message": "Access denied"
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Resource not found"
}
```

## Authentication Flow

1. **Login** with email/password → Get JWT token
2. **Include token** in Authorization header for all subsequent requests
3. **Token expires** after 7 days (configurable)
4. **Logout** by removing token on client side

## User Roles

- **super_admin**: Can manage all schools, admins, and system-wide settings
- **school_admin**: Can manage their assigned school's data (students, teachers, courses, etc.)

## Testing with Default Credentials

### Super Admin
- Email: `admin@yourdomain.com`
- Password: `YourSecurePassword123!`

### School Admin
- Email: `schooladmin@yourschool.com`
- Password: `YourSecurePassword123!`

## Swagger Documentation

Interactive API documentation is available at:
```
http://localhost:5000/api-docs
```

This provides a complete interactive interface to test all API endpoints. 