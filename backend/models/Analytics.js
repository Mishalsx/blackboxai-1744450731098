const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  song: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song',
    required: true
  },
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  whiteLabelDomain: String,
  period: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  platforms: [{
    name: String,
    plays: Number,
    revenue: Number,
    listeners: Number,
    saves: Number,
    playlists: Number,
    shares: Number,
    demographics: [{
      country: String,
      plays: Number,
      revenue: Number,
      listeners: Number
    }],
    devices: [{
      type: String,
      count: Number,
      percentage: Number
    }],
    timeOfDay: [{
      hour: Number,
      plays: Number
    }]
  }],
  totalStats: {
    plays: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    uniqueListeners: {
      type: Number,
      default: 0
    },
    saves: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    playlists: {
      type: Number,
      default: 0
    }
  },
  demographics: {
    age: [{
      range: String,
      percentage: Number
    }],
    gender: [{
      type: String,
      percentage: Number
    }],
    countries: [{
      code: String,
      name: String,
      plays: Number,
      revenue: Number,
      percentage: Number
    }],
    cities: [{
      name: String,
      country: String,
      plays: Number,
      percentage: Number
    }]
  },
  engagement: {
    averageListenTime: Number,
    completionRate: Number,
    skipRate: Number,
    repeatListens: Number,
    playlistAddRate: Number,
    socialShares: {
      total: Number,
      platforms: [{
        name: String,
        count: Number
      }]
    }
  },
  playlists: {
    total: Number,
    types: [{
      type: String,
      count: Number
    }],
    top: [{
      name: String,
      platform: String,
      followers: Number,
      plays: Number
    }]
  },
  trends: {
    daily: [{
      date: Date,
      plays: Number,
      revenue: Number
    }],
    weekly: [{
      week: Date,
      plays: Number,
      revenue: Number
    }],
    monthly: [{
      month: Date,
      plays: Number,
      revenue: Number
    }]
  },
  aiInsights: {
    performancePrediction: {
      nextMonth: {
        plays: Number,
        revenue: Number,
        confidence: Number
      },
      nextQuarter: {
        plays: Number,
        revenue: Number,
        confidence: Number
      }
    },
    recommendations: [{
      type: String,
      description: String,
      impact: String,
      confidence: Number
    }],
    marketingOpportunities: [{
      platform: String,
      strategy: String,
      potentialImpact: String,
      targetAudience: mongoose.Schema.Types.Mixed
    }],
    audienceInsights: [{
      insight: String,
      relevance: Number,
      actionable: Boolean
    }]
  },
  comparisons: {
    similarArtists: [{
      artist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      similarity: Number,
      performanceRatio: Number
    }],
    genreAverages: {
      plays: Number,
      revenue: Number,
      engagement: Number
    },
    historicalGrowth: {
      playsGrowth: Number,
      revenueGrowth: Number,
      listenerGrowth: Number
    }
  },
  marketingEffectiveness: {
    campaigns: [{
      name: String,
      platform: String,
      spend: Number,
      impressions: Number,
      clicks: Number,
      conversions: Number,
      roi: Number
    }],
    influencerMentions: [{
      platform: String,
      influencer: String,
      followers: Number,
      engagement: Number,
      impact: Number
    }]
  },
  metadata: {
    lastUpdated: Date,
    dataQuality: {
      score: Number,
      issues: [String]
    },
    sources: [{
      platform: String,
      lastSync: Date,
      status: String
    }]
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
analyticsSchema.index({ song: 1, 'period.start': 1, 'period.end': 1 });
analyticsSchema.index({ artist: 1, 'period.start': 1, 'period.end': 1 });
analyticsSchema.index({ whiteLabelDomain: 1 });
analyticsSchema.index({ 'totalStats.plays': -1 });
analyticsSchema.index({ 'totalStats.revenue': -1 });

// Method to aggregate analytics for a specific period
analyticsSchema.statics.getAggregatedStats = async function(filter, period) {
  return await this.aggregate([
    {
      $match: {
        ...filter,
        'period.start': { $gte: period.start },
        'period.end': { $lte: period.end }
      }
    },
    {
      $group: {
        _id: null,
        totalPlays: { $sum: '$totalStats.plays' },
        totalRevenue: { $sum: '$totalStats.revenue' },
        totalListeners: { $sum: '$totalStats.uniqueListeners' },
        avgEngagement: { $avg: '$engagement.averageListenTime' }
      }
    }
  ]);
};

// Method to get trending songs
analyticsSchema.statics.getTrendingSongs = async function(limit = 10) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return await this.aggregate([
    {
      $match: {
        'period.start': { $gte: oneWeekAgo }
      }
    },
    {
      $group: {
        _id: '$song',
        totalPlays: { $sum: '$totalStats.plays' },
        growth: {
          $avg: {
            $divide: [
              { $subtract: ['$totalStats.plays', '$trends.daily.plays'] },
              '$trends.daily.plays'
            ]
          }
        }
      }
    },
    {
      $sort: { growth: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Method to update analytics with new data
analyticsSchema.methods.updateStats = async function(newData) {
  // Update platform-specific stats
  newData.platforms.forEach(platformData => {
    const platform = this.platforms.find(p => p.name === platformData.name);
    if (platform) {
      Object.assign(platform, platformData);
    } else {
      this.platforms.push(platformData);
    }
  });

  // Update total stats
  this.totalStats = {
    plays: this.platforms.reduce((sum, p) => sum + p.plays, 0),
    revenue: this.platforms.reduce((sum, p) => sum + p.revenue, 0),
    uniqueListeners: this.platforms.reduce((sum, p) => sum + p.listeners, 0),
    saves: this.platforms.reduce((sum, p) => sum + p.saves, 0),
    shares: this.platforms.reduce((sum, p) => sum + p.shares, 0),
    playlists: this.platforms.reduce((sum, p) => sum + p.playlists, 0)
  };

  // Update metadata
  this.metadata.lastUpdated = new Date();

  await this.save();
};

module.exports = mongoose.model('Analytics', analyticsSchema);
