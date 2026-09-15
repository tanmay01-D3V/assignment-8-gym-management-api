const passport = require('passport');
const User = require('../models/User');

/**
 * @desc    Register a new gym member
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { username, email, password, membershipTier, durationMonths, emergencyContact } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password'
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username: username.trim() }, { email: email.toLowerCase().trim() }]
    });

    if (existingUser) {
      const field = existingUser.username.toLowerCase() === username.toLowerCase().trim() ? 'Username' : 'Email';
      return res.status(400).json({
        success: false,
        message: `${field} is already registered`
      });
    }

    // Calculate membership expiry date (30 days per month)
    const months = durationMonths ? parseInt(durationMonths, 10) : 1;
    if (isNaN(months) || months <= 0) {
      return res.status(400).json({
        success: false,
        message: 'durationMonths must be a positive number'
      });
    }

    const membershipExpiryDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);

    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      membershipTier: membershipTier || 'Bronze',
      membershipStatus: 'active',
      membershipExpiryDate,
      emergencyContact
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'Member registered successfully',
      data: {
        user: newUser,
        planDurationMonths: months,
        membershipExpiryDate: newUser.membershipExpiryDate,
        remainingDays: newUser.getRemainingDays()
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};

/**
 * @desc    Login member via Passport Local Strategy
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both username and password'
    });
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Authentication error',
        error: err.message
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: info && info.message ? info.message : 'Invalid credentials'
      });
    }

    req.login(user, async (loginErr) => {
      if (loginErr) {
        return res.status(500).json({
          success: false,
          message: 'Error creating login session',
          error: loginErr.message
        });
      }

      // Check and update expiry if needed
      if (user.membershipExpiryDate && new Date(user.membershipExpiryDate) < new Date()) {
        user.membershipStatus = 'expired';
        await user.save();
      }

      return res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: {
          user,
          remainingDays: user.getRemainingDays()
        }
      });
    });
  })(req, res, next);
};

/**
 * @desc    Get logged-in member profile and remaining membership days
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check expiry
    const isExpired = new Date(user.membershipExpiryDate) < new Date();
    if (isExpired && user.membershipStatus !== 'expired') {
      user.membershipStatus = 'expired';
      await user.save();
    }

    const remainingDays = user.getRemainingDays();

    return res.status(200).json({
      success: true,
      data: {
        user,
        remainingDays,
        isExpired
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

/**
 * @desc    Logout member and destroy session
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error during logout',
        error: err.message
      });
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  });
};

module.exports = {
  register,
  login,
  getMe,
  logout
};
