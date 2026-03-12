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

// Import middleware
const { errorHandler } = require('./middlewares/errorHandler');
const { authenticateToken } = require('./middlewares/auth');

const app = express();

// Security middleware
app.use(helmet());
// CORS configuration
let corsAllowAllWarningLogged = false;
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Dev shortcut: allow all origins when explicitly enabled (use only for local debugging)
    // Also allow all origins by default in non-production environments so devices (ESP8266, mobile apps, etc.) can access the API during development.
    if (process.env.ALLOW_ALL_ORIGINS === 'true' || process.env.NODE_ENV !== 'production') {
      if (!corsAllowAllWarningLogged) {
        corsAllowAllWarningLogged = true;
        console.warn('CORS: allowing all origins (ALLOW_ALL_ORIGINS=true or NODE_ENV!=' + (process.env.NODE_ENV || 'undefined') + ')');
      }
      return callback(null, true);
    }

    // Default allowed origins for development
    const allowedOrigins = new Set([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8080',
    ]);

    // Add production frontend URLs from environment variables (comma-separated list supported)
    const envFrontendUrls = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
    envFrontendUrls.forEach(u => allowedOrigins.add(u));

    // Support simple domain patterns from env var FRONTEND_URL_PATTERNS (comma-separated), e.g. ".example.com" or "example.com"
    const frontendPatterns = (process.env.FRONTEND_URL_PATTERNS || '').split(',').map(s => s.trim()).filter(Boolean);

    const originAllowedDirect = allowedOrigins.has(origin);
    const originAllowedByPattern = frontendPatterns.some(p => {
      if (!p) return false;
      // Allow entries like ".example.com" or "example.com" to match any subdomain
      return origin.endsWith(p);
    });

    if (originAllowedDirect || originAllowedByPattern) {
      return callback(null, true);
    }

    console.warn('CORS blocked origin:', origin, 'Allowed:', Array.from(allowedOrigins).join(','), 'Patterns:', frontendPatterns.join(','));
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

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

app.use('/api/students', authenticateToken, studentRoutes);
app.use('/api/teachers', authenticateToken, teacherRoutes);
app.use('/api/majors', authenticateToken, majorRoutes);
app.use('/api/exams', authenticateToken, examRoutes);
app.use('/api/lessons', authenticateToken, lessonRoutes);
app.use('/api/materials', authenticateToken, materialRoutes);
app.use('/api/report-cards', authenticateToken, reportCardRoutes);
app.use('/api/classes', authenticateToken, classRoutes);

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
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development server',
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
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
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
