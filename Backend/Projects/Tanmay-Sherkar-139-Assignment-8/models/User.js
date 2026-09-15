const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  membershipTier: {
    type: String,
    enum: {
      values: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      message: '{VALUE} is not a valid membership tier (Bronze, Silver, Gold, Platinum)'
    },
    default: 'Bronze'
  },
  membershipStatus: {
    type: String,
    enum: {
      values: ['active', 'expired', 'frozen'],
      message: '{VALUE} is not a valid membership status (active, expired, frozen)'
    },
    default: 'active'
  },
  membershipExpiryDate: {
    type: Date,
    required: [true, 'Membership expiry date is required']
  },
  emergencyContact: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Pre-save hook: hash password if modified & check expiry status
userSchema.pre('save', async function (next) {
  // Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Automatically update status based on expiry date
  if (this.membershipExpiryDate && new Date(this.membershipExpiryDate) < new Date()) {
    this.membershipStatus = 'expired';
  } else if (this.membershipStatus === 'expired' && new Date(this.membershipExpiryDate) > new Date()) {
    this.membershipStatus = 'active';
  }

  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Calculate remaining active days
userSchema.methods.getRemainingDays = function () {
  const now = new Date();
  const diffTime = new Date(this.membershipExpiryDate).getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

module.exports = mongoose.model('User', userSchema);
