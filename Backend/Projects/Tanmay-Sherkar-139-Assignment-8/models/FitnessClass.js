const mongoose = require('mongoose');

const fitnessClassSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Class title is required'],
    trim: true
  },
  trainerName: {
    type: String,
    required: [true, 'Trainer name is required'],
    trim: true
  },
  scheduleDate: {
    type: Date,
    required: [true, 'Schedule date is required']
  },
  durationMinutes: {
    type: Number,
    required: [true, 'Duration in minutes is required'],
    default: 60,
    min: [15, 'Duration must be at least 15 minutes']
  },
  maxCapacity: {
    type: Number,
    required: [true, 'Max capacity is required'],
    min: [1, 'Capacity must be at least 1']
  },
  enrolledMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual field for available slots
fitnessClassSchema.virtual('availableSlots').get(function () {
  const currentCount = this.enrolledMembers ? this.enrolledMembers.length : 0;
  return Math.max(0, this.maxCapacity - currentCount);
});

// Virtual field to check if class is full
fitnessClassSchema.virtual('isFull').get(function () {
  const currentCount = this.enrolledMembers ? this.enrolledMembers.length : 0;
  return currentCount >= this.maxCapacity;
});

module.exports = mongoose.model('FitnessClass', fitnessClassSchema);
