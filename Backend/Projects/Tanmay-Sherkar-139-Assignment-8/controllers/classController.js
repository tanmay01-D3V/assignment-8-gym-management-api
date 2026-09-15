const mongoose = require('mongoose');
const FitnessClass = require('../models/FitnessClass');

/**
 * @desc    Fetch all upcoming workout classes (supports ?trainer= query)
 * @route   GET /api/classes
 * @access  Public
 */
const getClasses = async (req, res) => {
  try {
    const { trainer, upcomingOnly } = req.query;
    const filter = {};

    if (trainer) {
      filter.trainerName = { $regex: trainer.trim(), $options: 'i' };
    }

    // Default or requested: filter upcoming classes or all
    if (upcomingOnly === 'true') {
      filter.scheduleDate = { $gte: new Date() };
    }

    const classes = await FitnessClass.find(filter)
      .populate('enrolledMembers', 'username email membershipTier')
      .sort({ scheduleDate: 1 });

    return res.status(200).json({
      success: true,
      count: classes.length,
      data: classes
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching classes',
      error: error.message
    });
  }
};

/**
 * @desc    Get class details with enrolled members list
 * @route   GET /api/classes/:id
 * @access  Public
 */
const getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid class ID format'
      });
    }

    const fitnessClass = await FitnessClass.findById(id)
      .populate('enrolledMembers', 'username email membershipTier membershipStatus');

    if (!fitnessClass) {
      return res.status(404).json({
        success: false,
        message: 'Fitness class not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: fitnessClass
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching class details',
      error: error.message
    });
  }
};

/**
 * @desc    Create a new workout class
 * @route   POST /api/classes
 * @access  Public / Admin
 */
const createClass = async (req, res) => {
  try {
    const { title, trainerName, scheduleDate, durationMinutes, maxCapacity } = req.body;

    if (!title || !trainerName || !scheduleDate || maxCapacity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, trainerName, scheduleDate, and maxCapacity'
      });
    }

    const capacityNum = parseInt(maxCapacity, 10);
    if (isNaN(capacityNum) || capacityNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'maxCapacity must be an integer greater than or equal to 1'
      });
    }

    const parsedSchedule = new Date(scheduleDate);
    if (isNaN(parsedSchedule.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheduleDate format'
      });
    }

    const newClass = new FitnessClass({
      title: title.trim(),
      trainerName: trainerName.trim(),
      scheduleDate: parsedSchedule,
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 60,
      maxCapacity: capacityNum,
      enrolledMembers: []
    });

    await newClass.save();

    return res.status(201).json({
      success: true,
      message: 'Fitness class created successfully',
      data: newClass
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
      message: 'Error creating fitness class',
      error: error.message
    });
  }
};

/**
 * @desc    Enroll logged-in user into a class
 * @route   POST /api/classes/:id/book
 * @access  Private (Authenticated & Active Member)
 */
const bookClass = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid class ID format'
      });
    }

    const fitnessClass = await FitnessClass.findById(id);
    if (!fitnessClass) {
      return res.status(404).json({
        success: false,
        message: 'Fitness class not found'
      });
    }

    // Check if member is already enrolled
    const isAlreadyEnrolled = fitnessClass.enrolledMembers.some(
      memberId => memberId.toString() === userId.toString()
    );

    if (isAlreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this class'
      });
    }

    // Capacity Constraint Check
    if (fitnessClass.enrolledMembers.length >= fitnessClass.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Class capacity reached'
      });
    }

    // Enroll member
    fitnessClass.enrolledMembers.push(userId);
    await fitnessClass.save();

    const updatedClass = await FitnessClass.findById(id)
      .populate('enrolledMembers', 'username email membershipTier');

    return res.status(200).json({
      success: true,
      message: 'Successfully booked class',
      data: {
        classId: updatedClass._id,
        title: updatedClass.title,
        scheduleDate: updatedClass.scheduleDate,
        enrolledCount: updatedClass.enrolledMembers.length,
        maxCapacity: updatedClass.maxCapacity,
        availableSlots: updatedClass.availableSlots
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error booking class',
      error: error.message
    });
  }
};

/**
 * @desc    Cancel member booking from a class
 * @route   DELETE /api/classes/:id/cancel
 * @access  Private (Authenticated)
 */
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid class ID format'
      });
    }

    const fitnessClass = await FitnessClass.findById(id);
    if (!fitnessClass) {
      return res.status(404).json({
        success: false,
        message: 'Fitness class not found'
      });
    }

    // Check if user is enrolled
    const enrolledIndex = fitnessClass.enrolledMembers.findIndex(
      memberId => memberId.toString() === userId.toString()
    );

    if (enrolledIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'You are not enrolled in this class'
      });
    }

    // Remove member
    fitnessClass.enrolledMembers.splice(enrolledIndex, 1);
    await fitnessClass.save();

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        classId: fitnessClass._id,
        title: fitnessClass.title,
        enrolledCount: fitnessClass.enrolledMembers.length,
        availableSlots: fitnessClass.availableSlots
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message
    });
  }
};

module.exports = {
  getClasses,
  getClassById,
  createClass,
  bookClass,
  cancelBooking
};
