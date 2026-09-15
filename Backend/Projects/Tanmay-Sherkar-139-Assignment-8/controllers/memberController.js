const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * @desc    Renew or extend membership expiry date
 * @route   PATCH /api/members/:id/renew
 * @access  Public / Admin / Member
 */
const renewMembership = async (req, res) => {
  try {
    const { id } = req.params;
    const { additionalMonths, tier } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid member ID format'
      });
    }

    const months = parseInt(additionalMonths, 10);
    if (isNaN(months) || months <= 0) {
      return res.status(400).json({
        success: false,
        message: 'additionalMonths must be a positive integer'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const now = new Date();
    const currentExpiry = new Date(user.membershipExpiryDate);
    const additionalMillis = months * 30 * 24 * 60 * 60 * 1000;

    let newExpiryDate;
    if (currentExpiry > now) {
      // If currently active, add to existing expiry
      newExpiryDate = new Date(currentExpiry.getTime() + additionalMillis);
    } else {
      // If already expired, add from current moment
      newExpiryDate = new Date(now.getTime() + additionalMillis);
    }

    user.membershipExpiryDate = newExpiryDate;
    user.membershipStatus = 'active';

    if (tier) {
      const validTiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
      if (!validTiers.includes(tier)) {
        return res.status(400).json({
          success: false,
          message: `Invalid tier. Must be one of: ${validTiers.join(', ')}`
        });
      }
      user.membershipTier = tier;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: `Membership renewed successfully for ${months} month(s)`,
      data: {
        user,
        newExpiryDate: user.membershipExpiryDate,
        remainingDays: user.getRemainingDays()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error renewing membership',
      error: error.message
    });
  }
};

/**
 * @desc    Get list of all expired memberships
 * @route   GET /api/members/expired
 * @access  Public / Admin
 */
const getExpiredMembers = async (req, res) => {
  try {
    const now = new Date();

    // Query members whose expiry date is before now or status is marked expired
    const expiredMembers = await User.find({
      $or: [
        { membershipExpiryDate: { $lt: now } },
        { membershipStatus: 'expired' }
      ]
    }).sort({ membershipExpiryDate: -1 });

    const formattedMembers = expiredMembers.map(member => {
      const daysExpired = Math.max(
        0,
        Math.floor((now.getTime() - new Date(member.membershipExpiryDate).getTime()) / (1000 * 60 * 60 * 24))
      );
      return {
        _id: member._id,
        username: member.username,
        email: member.email,
        membershipTier: member.membershipTier,
        membershipStatus: member.membershipStatus,
        membershipExpiryDate: member.membershipExpiryDate,
        daysExpired
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedMembers.length,
      data: formattedMembers
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching expired members',
      error: error.message
    });
  }
};

module.exports = {
  renewMembership,
  getExpiredMembers
};
