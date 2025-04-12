const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'song_upload',
      'song_approved',
      'song_rejected',
      'contract_signed',
      'earnings_update',
      'payout_processed',
      'distribution_complete',
      'platform_added',
      'ai_complete',
      'system_update',
      'security_alert',
      'marketing_alert',
      'support_reply',
      'white_label_update'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread'
  },
  data: {
    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song'
    },
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract'
    },
    amount: Number,
    platform: String,
    url: String,
    additionalInfo: mongoose.Schema.Types.Mixed
  },
  actions: [{
    type: {
      type: String,
      enum: ['link', 'button', 'download']
    },
    label: String,
    url: String,
    method: String,
    data: mongoose.Schema.Types.Mixed
  }],
  email: {
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date,
    template: String
  },
  push: {
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date,
    deviceIds: [String]
  },
  sms: {
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date,
    phoneNumber: String
  },
  metadata: {
    source: {
      type: String,
      enum: ['system', 'user', 'ai', 'admin'],
      default: 'system'
    },
    whiteLabelDomain: String,
    ipAddress: String,
    userAgent: String,
    location: {
      country: String,
      city: String
    }
  },
  expiresAt: Date,
  readAt: Date,
  archivedAt: Date
}, {
  timestamps: true
});

// Indexes for efficient querying
notificationSchema.index({ recipient: 1, status: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ whiteLabelDomain: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to set expiration
notificationSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    // Set default expiration to 30 days
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

// Method to mark notification as read
notificationSchema.methods.markAsRead = async function() {
  this.status = 'read';
  this.readAt = new Date();
  await this.save();
};

// Method to archive notification
notificationSchema.methods.archive = async function() {
  this.status = 'archived';
  this.archivedAt = new Date();
  await this.save();
};

// Method to send email notification
notificationSchema.methods.sendEmail = async function() {
  if (this.email.sent) return;

  try {
    // Implementation would integrate with email service
    // await emailService.send({
    //   to: recipient.email,
    //   template: this.email.template,
    //   data: {
    //     title: this.title,
    //     message: this.message,
    //     actions: this.actions
    //   }
    // });

    this.email.sent = true;
    this.email.sentAt = new Date();
    await this.save();
  } catch (error) {
    console.error('Failed to send email notification:', error);
    throw error;
  }
};

// Method to send push notification
notificationSchema.methods.sendPush = async function(deviceIds) {
  if (this.push.sent) return;

  try {
    // Implementation would integrate with push notification service
    // await pushService.send({
    //   deviceIds,
    //   title: this.title,
    //   message: this.message,
    //   data: this.data
    // });

    this.push.sent = true;
    this.push.sentAt = new Date();
    this.push.deviceIds = deviceIds;
    await this.save();
  } catch (error) {
    console.error('Failed to send push notification:', error);
    throw error;
  }
};

// Method to send SMS notification
notificationSchema.methods.sendSMS = async function(phoneNumber) {
  if (this.sms.sent) return;

  try {
    // Implementation would integrate with SMS service
    // await smsService.send({
    //   to: phoneNumber,
    //   message: this.message
    // });

    this.sms.sent = true;
    this.sms.sentAt = new Date();
    this.sms.phoneNumber = phoneNumber;
    await this.save();
  } catch (error) {
    console.error('Failed to send SMS notification:', error);
    throw error;
  }
};

// Static method to get unread notifications count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    recipient: userId,
    status: 'unread'
  });
};

// Static method to get notifications summary
notificationSchema.statics.getSummary = async function(userId) {
  return await this.aggregate([
    {
      $match: {
        recipient: mongoose.Types.ObjectId(userId)
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to create and send notification
notificationSchema.statics.createAndSend = async function(data) {
  const notification = new this(data);
  await notification.save();

  // Send through all enabled channels
  if (data.email) await notification.sendEmail();
  if (data.push) await notification.sendPush(data.deviceIds);
  if (data.sms) await notification.sendSMS(data.phoneNumber);

  return notification;
};

module.exports = mongoose.model('Notification', notificationSchema);
