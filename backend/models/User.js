const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'artist', 'admin', 'label'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  whiteLabelDomain: {
    type: String,
    unique: true,
    sparse: true
  },
  whiteLabelSettings: {
    logo: String,
    colors: {
      primary: String,
      secondary: String,
      accent: String
    },
    customDomain: String,
    features: {
      aiTools: { type: Boolean, default: true },
      analytics: { type: Boolean, default: true },
      contracts: { type: Boolean, default: true }
    }
  },
  apiKeys: [{
    key: String,
    name: String,
    permissions: [String],
    createdAt: { type: Date, default: Date.now }
  }],
  permissions: [{
    type: String,
    enum: [
      'upload_songs',
      'manage_users',
      'view_analytics',
      'manage_contracts',
      'manage_earnings',
      'manage_settings',
      'use_ai_tools'
    ]
  }],
  settings: {
    language: {
      type: String,
      default: 'en'
    },
    emailNotifications: {
      newReleases: { type: Boolean, default: true },
      earnings: { type: Boolean, default: true },
      marketing: { type: Boolean, default: true }
    },
    twoFactorAuth: {
      enabled: { type: Boolean, default: false },
      secret: String
    }
  },
  metadata: {
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    accountLocked: { type: Boolean, default: false },
    lockUntil: Date,
    ipAddress: String,
    userAgent: String
  },
  stats: {
    totalUploads: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalPlays: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT token
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate verification token
userSchema.methods.generateVerificationToken = function() {
  const verificationToken = crypto.randomBytes(20).toString('hex');
  
  this.verificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  return verificationToken;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Generate API key
userSchema.methods.generateApiKey = function(name, permissions) {
  const apiKey = crypto.randomBytes(32).toString('hex');
  
  this.apiKeys.push({
    key: apiKey,
    name,
    permissions,
    createdAt: Date.now()
  });

  return apiKey;
};

module.exports = mongoose.model('User', userSchema);
