require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const connectDB = require('./config/db');
const passport = require('./config/passport');

// Import routes
const authRoutes = require('./routes/authRoutes');
const classRoutes = require('./routes/classRoutes');
const memberRoutes = require('./routes/memberRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'gym_fitness_secret_session_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Health & Root Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🏋️‍♂️ Welcome to Gym & Fitness Club Management REST API',
    version: '1.0.0',
    documentation: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me',
        logout: 'POST /api/auth/logout'
      },
      classes: {
        listAll: 'GET /api/classes (supports ?trainer=)',
        getById: 'GET /api/classes/:id',
        create: 'POST /api/classes',
        book: 'POST /api/classes/:id/book',
        cancel: 'DELETE /api/classes/:id/cancel'
      },
      members: {
        renew: 'PATCH /api/members/:id/renew',
        expired: 'GET /api/members/expired'
      }
    }
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/members', memberRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
