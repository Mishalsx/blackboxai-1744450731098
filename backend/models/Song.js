const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a song title'],
    trim: true
  },
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  album: {
    type: String,
    trim: true
  },
  genre: [{
    type: String,
    required: [true, 'Please provide at least one genre']
  }],
  releaseDate: {
    type: Date,
    required: [true, 'Please provide a release date']
  },
  isrc: {
    type: String,
    unique: true,
    sparse: true
  },
  upc: {
    type: String,
    unique: true,
    sparse: true
  },
  audioFile: {
    url: String,
    duration: Number,
    format: String,
    size: Number,
    waveform: [Number]
  },
  artwork: {
    url: String,
    generatedByAI: Boolean,
    prompt: String
  },
  lyrics: {
    text: String,
    language: String,
    translations: [{
      language: String,
      text: String
    }],
    titleTranslations: [{
      language: String,
      title: String
    }]
  },
  credits: [{
    role: String,
    name: String,
    share: Number,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  distribution: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'distributed', 'rejected'],
      default: 'pending'
    },
    platforms: [{
      name: String,
      status: String,
      url: String,
      distributedAt: Date
    }],
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract'
    }
  },
  analytics: {
    totalPlays: {
      type: Number,
      default: 0
    },
    platformStats: [{
      platform: String,
      plays: Number,
      revenue: Number,
      lastUpdated: Date
    }],
    demographics: [{
      country: String,
      plays: Number,
      revenue: Number
    }],
    trending: {
      type: Boolean,
      default: false
    }
  },
  earnings: {
    pendingWithdrawals: [{
      amount: Number,
      date: Date,
      status: String
    }],
    total: {
      type: Number,
      default: 0
    },
    pending: {
      type: Number,
      default: 0
    },
    withdrawn: {
      type: Number,
      default: 0
    },
    history: [{
      amount: Number,
      platform: String,
      date: Date,
      status: String
    }]
  },
  metadata: {
    language: String,
    explicit: Boolean,
    mood: [String],
    bpm: Number,
    key: String,
    tags: [String],
    aiTags: [String],
    similarArtists: [String]
  },
  whiteLabelInfo: {
    customId: String,
    labelName: String,
    branding: {
      logo: String,
      colorScheme: String
    }
  },
  aiAnalysis: {
    quality: {
      score: Number,
      issues: [String],
      recommendations: [String]
    },
    marketingPotential: {
      score: Number,
      targetMarkets: [String],
      recommendations: [String]
    },
    contentMatch: {
      similar: [{
        songId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Song'
        },
        similarity: Number
      }],
      contentId: String
    }
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected', 'published'],
    default: 'draft'
  },
  moderationStatus: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    moderator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    reviewedAt: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
songSchema.index({ title: 'text', album: 'text' });
songSchema.index({ 'analytics.totalPlays': -1 });
songSchema.index({ releaseDate: -1 });
songSchema.index({ status: 1 });
songSchema.index({ 'distribution.status': 1 });

// Generate ISRC if not provided
songSchema.pre('save', async function(next) {
  if (!this.isrc) {
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    this.isrc = `XX-XXX-${year}-${random}`;
  }

  if (!this.contentId) {
    this.contentId = `content-${this._id}`;
  }
  next();
});

// Update analytics when new plays are added
songSchema.methods.updateAnalytics = async function(platform, plays, revenue, country) {
  this.analytics.totalPlays += plays;

  const platformStat = this.analytics.platformStats.find(p => p.platform === platform);
  if (platformStat) {
    platformStat.plays += plays;
    platformStat.revenue += revenue;
    platformStat.lastUpdated = new Date();
  } else {
    this.analytics.platformStats.push({
      platform,
      plays,
      revenue,
      lastUpdated: new Date()
    });
  }

  const demographic = this.analytics.demographics.find(d => d.country === country);
  if (demographic) {
    demographic.plays += plays;
    demographic.revenue += revenue;
  } else {
    this.analytics.demographics.push({
      country,
      plays,
      revenue
    });
  }

  this.earnings.total += revenue;
  this.earnings.pending += revenue;
  this.earnings.history.push({
    amount: revenue,
    platform,
    date: new Date(),
    status: 'pending'
  });

  await this.save();
};

module.exports = mongoose.model('Song', songSchema);
