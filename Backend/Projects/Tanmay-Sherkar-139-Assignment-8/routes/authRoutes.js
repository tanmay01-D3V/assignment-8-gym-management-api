const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const ensureAuthenticated = require('../middleware/authMiddleware');

// @route   POST /api/auth/register
router.post('/register', authController.register);

// @route   POST /api/auth/login
router.post('/login', authController.login);

// @route   GET /api/auth/me
router.get('/me', ensureAuthenticated, authController.getMe);

// @route   POST /api/auth/logout
router.post('/logout', ensureAuthenticated, authController.logout);

module.exports = router;
