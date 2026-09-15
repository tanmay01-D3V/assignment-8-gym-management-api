const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');

// @route   GET /api/members/expired
router.get('/expired', memberController.getExpiredMembers);

// @route   PATCH /api/members/:id/renew
router.patch('/:id/renew', memberController.renewMembership);

module.exports = router;
