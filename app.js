const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const schoolRoutes = require('./routes/schools');
const adminRoutes = require('./routes/admins');
const studentProfilePhotoRoutes = require('./routes/studentProfilePhoto');
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teachers');
const majorRoutes = require('./routes/majors');
const courseRoutes = require('./routes/courses');
const scheduleRoutes = require('./routes/schedules');
const attendanceRoutes = require('./routes/attendance');
const deviceRoutes = require('./routes/devices');
const dashboardRoutes = require('./routes/dashboard');
const examRoutes = require('./routes/exams');
const lessonRoutes = require('./routes/lessons');
const materialRoutes = require('./routes/materials');
const reportCardRoutes = require('./routes/reportCards');
const classRoutes = require('./routes/classes');
const feeRoutes = require('./routes/fees');
const announcementRoutes = require('./routes/announcements');
const inquiryRoutes = require('./routes/inquiries');
const studentAppRoutes = require('./routes/studentApp');
const parentAppRoutes = require('./routes/parentApp');

// Import middleware
const { errorHandler } = require('./middlewares/errorHandler');
const { authenticateToken } = require('./middlewares/auth');

const app = express();

// Helmet defaults include CSP `upgrade-insecure-requests`, which makes browsers load
// ./swagger-ui.css etc. as https:// on plain http:// hosts — ERR_SSL_PROTOCOL_ERROR on :5000.
// Relax those headers unless this deployment is advertised as HTTPS (TLS at proxy or app).
const helmetAssumeHttpsSite =
  process.env.HELMET_ASSUME_HTTPS_SITE === 'true' ||
  (process.env.PUBLIC_API_BASE_URL || '').trim().startsWith('https:');

const helmetOptions = {
  contentSecurityPolicy: {
    directives: helmetAssumeHttpsSite ? {} : { upgradeInsecureRequests: null },
  },
};
if (!helmetAssumeHttpsSite) {
  helmetOptions.crossOriginOpenerPolicy = false;
  helmetOptions.originAgentCluster = false;
}

app.use(helmet(helmetOptions));
// CORS configuration
let corsAllowAllWarningLogged = false;
const getConfiguredAllowedOrigins = () => {
  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
  ]);

  const envFrontendUrls = (
    process.env.CORS_ALLOWED_ORIGINS ||
    process.env.FRONTEND_URLS ||
    process.env.FRONTEND_URL ||
    ''
  ).split(',').map(s => s.trim()).filter(Boolean);
  envFrontendUrls.forEach(u => allowedOrigins.add(u));

  return allowedOrigins;
};

const getConfiguredOriginPatterns = () =>
  (process.env.FRONTEND_URL_PATTERNS || '').split(',').map(s => s.trim()).filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (process.env.ALLOW_ALL_ORIGINS === 'true' || process.env.NODE_ENV !== 'production') {
    if (!corsAllowAllWarningLogged) {
      corsAllowAllWarningLogged = true;
      console.warn('CORS: allowing all origins (ALLOW_ALL_ORIGINS=true or NODE_ENV!=' + (process.env.NODE_ENV || 'undefined') + ')');
    }
    return true;
  }

  const allowedOrigins = getConfiguredAllowedOrigins();
  const frontendPatterns = getConfiguredOriginPatterns();
  const isLocalhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const originAllowedDirect = allowedOrigins.has(origin);
  const originAllowedByPattern = frontendPatterns.some(p => origin.endsWith(p));

  if (!isLocalhostOrigin && !originAllowedDirect && !originAllowedByPattern) {
    console.warn('CORS blocked origin:', origin, 'Allowed:', Array.from(allowedOrigins).join(','), 'Patterns:', frontendPatterns.join(','));
  }
  return isLocalhostOrigin || originAllowedDirect || originAllowedByPattern;
};

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || !isOriginAllowed(origin)) return next();

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] || 'Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  return next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'SmartClass API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/schools', authenticateToken, schoolRoutes);
app.use('/api/admins', authenticateToken, adminRoutes);
app.use('/api/courses', authenticateToken, courseRoutes);
app.use('/api/schedules', authenticateToken, scheduleRoutes);
app.use('/api/attendance', attendanceRoutes); // NOTE: some attendance endpoints (e.g., /check-in) are intentionally public; route-level auth is applied where needed
app.use('/api/devices', authenticateToken, deviceRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);

// Profile upload routes mounted first so they are not affected by ordering inside the large students router.
app.use('/api/students', authenticateToken, studentProfilePhotoRoutes);
app.use('/api/students', authenticateToken, studentRoutes);
app.use('/api/teachers', authenticateToken, teacherRoutes);
app.use('/api/majors', authenticateToken, majorRoutes);
app.use('/api/exams', authenticateToken, examRoutes);
app.use('/api/lessons', authenticateToken, lessonRoutes);
app.use('/api/materials', authenticateToken, materialRoutes);
app.use('/api/report-cards', authenticateToken, reportCardRoutes);
app.use('/api/classes', authenticateToken, classRoutes);
app.use('/api/fees', authenticateToken, feeRoutes);
app.use('/api/announcements', authenticateToken, announcementRoutes);
app.use('/api/inquiries', authenticateToken, inquiryRoutes);
app.use('/api/student-app', authenticateToken, studentAppRoutes);
app.use('/api/parent-app', authenticateToken, parentAppRoutes);

// Swagger documentation
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SmartClass API',
      version: '1.0.0',
      description: 'API documentation for SmartClass - RFID-based school attendance management system',
    },
    servers: [
      {
        url:
          (process.env.SWAGGER_SERVER_URL || '').trim() ||
          `http://localhost:${process.env.PORT || 5000}`,
        description: process.env.SWAGGER_SERVER_URL
          ? 'From SWAGGER_SERVER_URL'
          : 'Default (set SWAGGER_SERVER_URL on the server, e.g. http://41.186.188.119:5000)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./routes/*.js', './models/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handling middleware
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB Atlas connection error:', error);
    process.exit(1);
  }
};

connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SmartClass API server running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
});

module.exports = app;
