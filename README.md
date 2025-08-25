# SmartClass Backend

A comprehensive RFID-based attendance management system for educational institutions, built with Node.js, Express, and MongoDB.

## 🚀 Features

- **RFID Attendance Tracking**: Automated student check-ins using RFID devices
- **Multi-School Support**: Manage multiple schools with isolated data
- **Role-Based Access Control**: Super admin and school admin roles
- **Real-time Monitoring**: Device status and attendance tracking
- **Email-Based Authentication**: Secure password setup via email
- **Comprehensive API**: RESTful endpoints for all system operations

## 🏗️ Architecture

- **Backend**: Node.js + Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with role-based access control
- **Email Service**: SMTP-based for password management
- **Documentation**: Swagger/OpenAPI integration

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- SMTP email service (Gmail, Outlook, etc.)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SmartClass/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env
   ```
   
   Configure your `.env` file:
   ```bash
   # Server Configuration
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/smartclass
   JWT_SECRET=your-secret-key
   
   # Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=YourApp <noreply@yourdomain.com>
   
   # Frontend URL
FRONTEND_PASSWORD_SETUP_URL=http://localhost:3000/setup-password
   ```

4. **Start the server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## 🔐 Authentication

### User Roles

- **Super Admin**: Full system access, can manage all schools and users
- **School Admin**: Limited to their assigned school's data

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@yourdomain.com",
  "password": "YourSecurePassword123!"
}
```

### Default Credentials

- **Super Admin**: `admin@yourdomain.com` / `YourSecurePassword123!`
- **School Admin**: `schooladmin@yourdomain.com` / `YourSecurePassword123!`

## 📚 API Endpoints

### Core Resources

| Resource | Endpoints | Description |
|----------|-----------|-------------|
| **Schools** | `GET, POST /api/schools` | Manage educational institutions |
| **Admins** | `GET, POST /api/admins` | User management |
| **Students** | `GET, POST /api/students` | Student records |
| **Teachers** | `GET, POST /api/teachers` | Faculty management |
| **Courses** | `GET, POST, PUT, DELETE /api/courses` | Course management |
| **Devices** | `GET, POST, PUT, DELETE /api/devices` | RFID device management |
| **Attendance** | `GET, POST /api/attendance` | Attendance tracking |

### School-Specific APIs

#### Get School Devices
```http
GET /api/devices/school/devices
Authorization: Bearer <school-admin-token>
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `search`: Search by serial number, classroom, location
- `status`: Filter by device status (Operational, Maintenance, Offline, Error)
- `classroom`: Filter by specific classroom
- `isActive`: Filter by active status

#### Get School Attendance
```http
GET /api/attendance/school/attendance
Authorization: Bearer <school-admin-token>
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `search`: Search by student name, ID, or course name
- `startDate`, `endDate`: Date range filtering
- `status`: Filter by attendance status (Present, Absent, Late)
- `courseId`, `majorId`: Filter by course or major
- `classroom`, `deviceId`: Additional filters

### RFID Check-in

```http
POST /api/attendance/check-in
Content-Type: application/json

{
  "cardId": "RFID001",
  "deviceId": "device_id",
  "classroom": "Room 101"
}
```

## 📧 Email-Based Password System

### Features
- Secure token generation for password setup
- Automatic email notifications
- Configurable token expiration (default: 1 hour)
- Password reset functionality

### User Creation Flow
1. Admin creates user account (no password required)
2. System generates secure token and sends email
3. User clicks email link → redirected to frontend
4. User sets password → account activated

### API Endpoints

```http
# Create admin (password setup email sent automatically)
POST /api/admins
Authorization: Bearer <super-admin-token>

# Resend password setup email
POST /api/admins/resend-password-setup

# Setup password using token
POST /api/admins/setup-password

# Request password reset
POST /api/admins/forgot-password
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Data Isolation**: School admins only access their school's data
- **Role-Based Access**: Granular permissions based on user role
- **Input Validation**: Comprehensive request validation
- **Secure Tokens**: Cryptographically secure password setup tokens
- **Automatic Cleanup**: Expired tokens and failed operations cleanup

> **⚠️ Security Note**: Never commit sensitive data like real email addresses, passwords, or API keys to version control. Always use environment variables and placeholder values in documentation.

## 📊 Data Models

### Key Entities
- **School**: Educational institution information
- **AdminUser**: System administrators
- **Student**: Student records with RFID card IDs
- **Teacher**: Faculty information
- **Course**: Course details and scheduling
- **Device**: RFID device management
- **Attendance**: Student attendance records
- **Major**: Academic major/program information

### Relationships
- Schools contain multiple majors, students, teachers, and devices
- Students belong to majors and courses
- Attendance links students, courses, schedules, and devices
- Devices are assigned to specific classrooms and schools

## 🧪 Testing

### Test Scripts
```bash
# Test email functionality
npm run test-email

# Test admin features
npm run test-admin-features

# Test password system
npm run test-password

# Test new school APIs
node scripts/testNewAPIs.js
```

### API Testing
Interactive Swagger documentation available at:
```
http://localhost:5000/api-docs
```

## 🚀 Quick Start Examples

### 1. Create a School
```bash
curl -X POST "http://localhost:5000/api/schools" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your School Name",
    "location": "Your School Address"
  }'
```

### 2. Create a School Admin
```bash
curl -X POST "http://localhost:5000/api/admins" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@yourschool.com",
    "role": "school_admin",
    "schoolId": "SCHOOL_ID_HERE",
    "phone": "+1234567890"
  }'
```

### 3. Get School Devices (School Admin)
```bash
curl -X GET "http://localhost:5000/api/devices/school/devices?page=1&limit=10" \
  -H "Authorization: Bearer SCHOOL_ADMIN_TOKEN"
```

## 📁 Project Structure

```
backend/
├── controllers/          # Request handlers
├── models/              # Database models
├── routes/              # API route definitions
├── middlewares/         # Authentication and validation
├── utils/               # Helper functions
├── scripts/             # Utility and test scripts
├── swagger.js           # API documentation
└── app.js              # Main application file
```

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `EMAIL_*`: SMTP email configuration
- `FRONTEND_PASSWORD_SETUP_URL`: Frontend password setup URL

### Database Indexes
- Optimized indexes for school-based queries
- Compound indexes for unique constraints
- TTL indexes for token expiration

## 🚨 Troubleshooting

### Common Issues
1. **Email not sending**: Check SMTP configuration and credentials
2. **Authentication errors**: Verify JWT token and user role
3. **Database connection**: Check MongoDB connection string
4. **Permission denied**: Ensure user has required role

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev
```

## 📈 Performance

- **Pagination**: All list endpoints support pagination
- **Database Optimization**: Efficient queries with proper indexing
- **Aggregation Pipeline**: Complex queries optimized for MongoDB
- **Response Caching**: Strategic caching for frequently accessed data

## 🔮 Future Enhancements

- Real-time updates using WebSockets
- Advanced analytics and reporting
- Bulk operations for multiple records
- Export functionality (CSV, PDF)
- Mobile app support
- Integration with external systems

## 📞 Support

For issues or questions:
1. Check the logs for error messages
2. Verify environment configuration
3. Test with provided test scripts
4. Review API documentation
5. Check database connectivity

## 📄 License

This project is licensed under the MIT License.

---

**SmartClass** - Transforming education through smart technology.
