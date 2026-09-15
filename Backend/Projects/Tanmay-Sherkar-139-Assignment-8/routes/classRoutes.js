const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const ensureAuthenticated = require('../middleware/authMiddleware');
const checkActiveMember = require('../middleware/checkActiveMember');

// @route   GET /api/classes (supports ?trainer= query)
router.get('/', classController.getClasses);

// @route   GET /api/classes/:id
router.get('/:id', classController.getClassById);

// @route   POST /api/classes
router.post('/', classController.createClass);

// @route   POST /api/classes/:id/book
router.post('/:id/book', ensureAuthenticated, checkActiveMember, classController.bookClass);

// @route   DELETE /api/classes/:id/cancel
router.delete('/:id/cancel', ensureAuthenticated, classController.cancelBooking);

module.exports = router;
