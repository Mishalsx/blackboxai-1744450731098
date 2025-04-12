const mongoose = require('mongoose');

const earningsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  song: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song',
    required: true
  },
  whiteLabelDomain: String,
  period: {
    type: String,
    required: true // Format: YYYY-MM
  },
  earnings: {
    total: {
      type: Number,
      required: true,
      default: 0
    },
    pending: {
      type: Number,
      default: 0
    },
    available: {
      type: Number,
      default: 0
    },
    withdrawn: {
      type: Number,
      default: 0
    }
  },
  platforms: [{
    name: String,
    amount: Number,
    plays: Number,
    status: {
      type: String,
      enum: ['pending', 'available', 'withdrawn'],
      default: 'pending'
    },
    details: {
      playlists: Number,
      saves: Number,
      shares: Number
    }
  }],
  payouts: [{
    amount: Number,
    method: {
      type: String,
      enum: ['paypal', 'bank_transfer', 'crypto'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    transactionId: String,
    requestedAt: Date,
    processedAt: Date,
    notes: String
  }],
  splits: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String,
    percentage: Number,
    amount: Number
  }],
  taxes: {
    withholdingRate: {
      type: Number,
      default: 0
    },
    withheldAmount: {
      type: Number,
      default: 0
    },
    taxForms: [{
      type: String,
      url: String,
      year: Number,
      status: String
    }]
  },
  analytics: {
    dailyEarnings: [{
      date: Date,
      amount: Number,
      plays: Number
    }],
    trends: {
      growth: Number,
      previousPeriod: Number,
      projection: Number
    },
    performance: {
      bestPlatform: String,
      bestDay: Date,
      averageDaily: Number
    }
  },
  aiInsights: {
    earningsPrediction: {
      nextMonth: {
        amount: Number,
        confidence: Number
      },
      nextQuarter: {
        amount: Number,
        confidence: Number
      }
    },
    recommendations: [{
      type: String,
      description: String,
      potentialImpact: Number,
      confidence: Number
    }],
    optimizations: [{
      platform: String,
      strategy: String,
      expectedIncrease: Number
    }]
  },
  notifications: [{
    type: String,
    message: String,
    date: Date,
    read: {
      type: Boolean,
      default: false
    }
  }],
  metadata: {
    lastCalculated: Date,
    nextPayoutDate: Date,
    minimumPayoutReached: Boolean,
    payoutThreshold: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
earningsSchema.index({ user: 1, period: 1 });
earningsSchema.index({ song: 1, period: 1 });
earningsSchema.index({ whiteLabelDomain: 1 });
earningsSchema.index({ 'earnings.total': -1 });

// Calculate total earnings before saving
earningsSchema.pre('save', function(next) {
  // Calculate platform totals
  const platformTotals = this.platforms.reduce((acc, platform) => {
    acc.total += platform.amount;
    if (platform.status === 'pending') acc.pending += platform.amount;
    if (platform.status === 'available') acc.available += platform.amount;
    if (platform.status === 'withdrawn') acc.withdrawn += platform.amount;
    return acc;
  }, { total: 0, pending: 0, available: 0, withdrawn: 0 });

  // Update earnings totals
  this.earnings = platformTotals;

  // Calculate splits
  if (this.splits.length > 0) {
    this.splits.forEach(split => {
      split.amount = (platformTotals.total * split.percentage) / 100;
    });
  }

  // Calculate tax withholding
  if (this.taxes.withholdingRate > 0) {
    this.taxes.withheldAmount = (platformTotals.total * this.taxes.withholdingRate) / 100;
  }

  next();
});

// Method to request payout
earningsSchema.methods.requestPayout = async function(amount, method) {
  if (amount > this.earnings.available) {
    throw new Error('Insufficient available balance');
  }

  if (amount < this.metadata.payoutThreshold) {
    throw new Error('Amount below minimum payout threshold');
  }

  const payout = {
    amount,
    method,
    requestedAt: new Date(),
    status: 'pending'
  };

  this.payouts.push(payout);
  this.earnings.available -= amount;
  this.earnings.pending += amount;

  // Add notification
  this.notifications.push({
    type: 'payout_requested',
    message: `Payout request of ${amount} ${this.metadata.currency} via ${method} has been submitted.`,
    date: new Date()
  });

  await this.save();
  return payout;
};

// Method to process payout
earningsSchema.methods.processPayout = async function(payoutId, status, transactionId = null) {
  const payout = this.payouts.id(payoutId);
  if (!payout) {
    throw new Error('Payout not found');
  }

  payout.status = status;
  payout.processedAt = new Date();
  payout.transactionId = transactionId;

  if (status === 'completed') {
    this.earnings.pending -= payout.amount;
    this.earnings.withdrawn += payout.amount;

    // Add notification
    this.notifications.push({
      type: 'payout_completed',
      message: `Payout of ${payout.amount} ${this.metadata.currency} has been processed.`,
      date: new Date()
    });
  } else if (status === 'failed') {
    this.earnings.pending -= payout.amount;
    this.earnings.available += payout.amount;

    // Add notification
    this.notifications.push({
      type: 'payout_failed',
      message: `Payout of ${payout.amount} ${this.metadata.currency} has failed.`,
      date: new Date()
    });
  }

  await this.save();
  return payout;
};

// Static method to get earnings summary
earningsSchema.statics.getEarningsSummary = async function(userId, period) {
  return await this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        period: period
      }
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: '$earnings.total' },
        pendingEarnings: { $sum: '$earnings.pending' },
        availableEarnings: { $sum: '$earnings.available' },
        withdrawnEarnings: { $sum: '$earnings.withdrawn' },
        platformEarnings: {
          $push: {
            platform: '$platforms.name',
            amount: '$platforms.amount'
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Earnings', earningsSchema);
