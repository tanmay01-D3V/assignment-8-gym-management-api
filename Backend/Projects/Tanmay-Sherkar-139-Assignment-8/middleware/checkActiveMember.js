const User = require('../models/User');

/**
 * Middleware to verify that the logged-in user has an active, non-expired membership
 */
const checkActiveMember = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Please log in first'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const now = new Date();
    const expiry = new Date(user.membershipExpiryDate);

    if (expiry < now || user.membershipStatus !== 'active') {
      if (user.membershipStatus !== 'expired' && expiry < now) {
        user.membershipStatus = 'expired';
        await user.save();
      }
      return res.status(400).json({
        success: false,
        message: 'Booking failed: Your membership has expired or is inactive. Please renew your membership.'
      });
    }

    // Attach fresh user doc to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying membership status',
      error: error.message
    });
  }
};

module.exports = checkActiveMember;
