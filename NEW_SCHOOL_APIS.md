# New School-Specific APIs

This document describes the new school-specific APIs that have been added to the SmartClass backend system. These APIs allow school administrators to access data that belongs only to their school.

## Overview

The new APIs provide school administrators with access to:
- All devices installed in their school
- All attendance records from their school

These APIs automatically filter data based on the school ID extracted from the authenticated user's JWT token, ensuring data isolation between different schools.

## API Endpoints

### 1. Get School Devices

**Endpoint:** `GET /api/devices/school/devices`

**Description:** Retrieves all devices that belong to the authenticated school admin's school.

**Authentication:** Required (Bearer token with `school_admin` role)

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `search` (optional): Search term for serial number, classroom, location, or device type
- `isActive` (optional): Filter by active status (true/false)
- `status` (optional): Filter by device status (Operational, Maintenance, Offline, Error)
- `classroom` (optional): Filter by specific classroom

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "device_id",
      "schoolId": {
        "_id": "school_id",
        "name": "School Name",
        "location": "School Location"
      },
      "classroom": "Room 101",
      "location": "Main entrance, left side",
      "isActive": true,
      "deviceType": "RFID Reader",
      "serialNumber": "RFID-2024-001",
      "model": "RFID-2000",
      "manufacturer": "SmartClass",
      "status": "Operational",
      "batteryLevel": 85,
      "signalStrength": 95,
      "lastSeen": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User doesn't have school admin role
- `500 Internal Server Error`: Server error

### 2. Get School Attendance

**Endpoint:** `GET /api/attendance/school/attendance`

**Description:** Retrieves all attendance records that belong to the authenticated school admin's school.

**Authentication:** Required (Bearer token with `school_admin` role)

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `search` (optional): Search term for student name, student ID, or course name
- `majorId` (optional): Filter by major ID
- `courseId` (optional): Filter by course ID
- `status` (optional): Filter by attendance status (Present, Absent, Late)
- `startDate` (optional): Start date for filtering (YYYY-MM-DD format)
- `endDate` (optional): End date for filtering (YYYY-MM-DD format)
- `classroom` (optional): Filter by specific classroom
- `deviceId` (optional): Filter by specific device ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "attendance_id",
      "studentId": {
        "_id": "student_id",
        "firstName": "John",
        "lastName": "Doe",
        "studentId": "STU001",
        "majorId": "major_id"
      },
      "courseId": {
        "_id": "course_id",
        "name": "Introduction to Programming",
        "code": "CS101"
      },
      "scheduleId": {
        "_id": "schedule_id",
        "classroom": "Room 101",
        "weeklySessions": [...]
      },
      "deviceId": "device_id",
      "classroom": "Room 101",
      "checkInTime": "2024-01-15T09:05:00.000Z",
      "status": "Present",
      "sessionDate": "2024-01-15T00:00:00.000Z",
      "sessionDay": "Monday",
      "sessionStartTime": "09:00",
      "sessionEndTime": "10:30",
      "cardId": "RFID_CARD_001",
      "deviceLocation": "Main entrance",
      "createdAt": "2024-01-15T09:05:00.000Z",
      "updatedAt": "2024-01-15T09:05:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User doesn't have school admin role
- `500 Internal Server Error`: Server error

## Security Features

### Data Isolation
- Each school admin can only access data from their own school
- School ID is automatically extracted from the JWT token
- No manual school ID parameter is accepted to prevent data leakage

### Role-Based Access Control
- Only users with `school_admin` role can access these endpoints
- Super admins cannot access these endpoints (they use the general endpoints)

### Authentication
- JWT token validation is required
- Token must contain valid school ID and role information

## Implementation Details

### Device Filtering
The school devices API filters devices by `schoolId` field, which is directly stored in the Device model.

### Attendance Filtering
The school attendance API uses MongoDB aggregation to join attendance records with student and course data to filter by school. This is necessary because attendance records don't have a direct `schoolId` field.

### Performance Considerations
- Pagination is implemented to handle large datasets
- Database indexes are optimized for school-based queries
- Aggregation pipeline is used efficiently for complex joins

## Usage Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

// Get school devices
const getSchoolDevices = async (token) => {
  try {
    const response = await axios.get('/api/devices/school/devices', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        page: 1,
        limit: 20,
        status: 'Operational',
        classroom: 'Room 101'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching school devices:', error.response?.data);
    throw error;
  }
};

// Get school attendance
const getSchoolAttendance = async (token) => {
  try {
    const response = await axios.get('/api/attendance/school/attendance', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        page: 1,
        limit: 50,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        status: 'Present'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching school attendance:', error.response?.data);
    throw error;
  }
};
```

### cURL
```bash
# Get school devices
curl -X GET "http://localhost:3000/api/devices/school/devices?page=1&limit=10&status=Operational" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Get school attendance
curl -X GET "http://localhost:3000/api/attendance/school/attendance?page=1&limit=20&startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## Testing

A test script has been created at `scripts/testNewAPIs.js` to verify the functionality of these new APIs. To run the tests:

1. Install dependencies: `npm install axios`
2. Update the `TEST_TOKEN` variable with a valid school admin JWT token
3. Run the script: `node scripts/testNewAPIs.js`

## Error Handling

The APIs include comprehensive error handling:
- Validation errors for query parameters
- Authentication and authorization errors
- Database connection errors
- Proper HTTP status codes and error messages

## Future Enhancements

Potential improvements for these APIs:
- Real-time updates using WebSockets
- Caching for frequently accessed data
- Export functionality (CSV, PDF)
- Advanced analytics and reporting
- Bulk operations for multiple records
