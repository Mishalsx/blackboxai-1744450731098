const mongoose = require('mongoose');

const whiteLabelSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  cname: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended'],
    default: 'pending'
  },
  branding: {
    name: {
      type: String,
      required: true
    },
    logo: {
      light: String,
      dark: String
    },
    favicon: String,
    colors: {
      primary: {
        type: String,
        default: '#8B5CF6'
      },
      secondary: {
        type: String,
        default: '#EC4899'
      },
      accent: {
        type: String,
        default: '#F97316'
      },
      background: {
        light: {
          type: String,
          default: '#F3F4F6'
        },
        dark: {
          type: String,
          default: '#1F2937'
        }
      }
    },
    fonts: {
      primary: {
        type: String,
        default: 'Inter'
      },
      secondary: String
    }
  },
  features: {
    aiTools: {
      enabled: {
        type: Boolean,
        default: true
      },
      customModels: [String]
    },
    analytics: {
      enabled: {
        type: Boolean,
        default: true
      },
      customMetrics: [String]
    },
    distribution: {
      enabled: {
        type: Boolean,
        default: true
      },
      platforms: [{
        name: String,
        enabled: Boolean,
        customConfig: mongoose.Schema.Types.Mixed
      }]
    },
    contracts: {
      enabled: {
        type: Boolean,
        default: true
      },
      templates: [{
        name: String,
        content: String,
        variables: [String]
      }]
    },
    payments: {
      enabled: {
        type: Boolean,
        default: true
      },
      providers: [{
        name: String,
        enabled: Boolean,
        config: mongoose.Schema.Types.Mixed
      }]
    }
  },
  customization: {
    pages: [{
      path: String,
      title: String,
      content: String,
      enabled: Boolean
    }],
    emails: [{
      type: String,
      subject: String,
      template: String,
      enabled: Boolean
    }],
    languages: [{
      code: String,
      enabled: Boolean
    }]
  },
  api: {
    enabled: {
      type: Boolean,
      default: false
    },
    keys: [{
      key: String,
      name: String,
      permissions: [String],
      createdAt: Date
    }],
    webhooks: [{
      url: String,
      events: [String],
      secret: String,
      active: Boolean
    }]
  },
  settings: {
    emailFrom: String,
    supportEmail: String,
    defaultLanguage: {
      type: String,
      default: 'en'
    },
    signupEnabled: {
      type: Boolean,
      default: true
    },
    moderationRequired: {
      type: Boolean,
      default: true
    },
    autoDistribution: {
      type: Boolean,
      default: false
    }
  },
  analytics: {
    totalUsers: {
      type: Number,
      default: 0
    },
    totalSongs: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    monthlyStats: [{
      month: Date,
      users: Number,
      songs: Number,
      revenue: Number
    }]
  },
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'pro', 'enterprise'],
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'past_due', 'canceled'],
      default: 'active'
    },
    startDate: Date,
    endDate: Date,
    features: [String],
    limits: {
      users: Number,
      songs: Number,
      storage: Number
    }
  },
  security: {
    ipWhitelist: [String],
    twoFactorRequired: {
      type: Boolean,
      default: false
    },
    passwordPolicy: {
      minLength: Number,
      requireSpecialChars: Boolean,
      requireNumbers: Boolean
    },
    sessionTimeout: Number
  }
}, {
  timestamps: true
});

// Middleware to ensure domain is lowercase
whiteLabelSchema.pre('save', function(next) {
  if (this.domain) {
    this.domain = this.domain.toLowerCase();
  }
  if (this.cname) {
    this.cname = this.cname.toLowerCase();
  }
  next();
});

// Method to check if domain is available
whiteLabelSchema.statics.isDomainAvailable = async function(domain) {
  const existing = await this.findOne({ domain: domain.toLowerCase() });
  return !existing;
};

// Method to generate API key
whiteLabelSchema.methods.generateApiKey = function(name, permissions) {
  const apiKey = crypto.randomBytes(32).toString('hex');
  
  this.api.keys.push({
    key: apiKey,
    name,
    permissions,
    createdAt: new Date()
  });

  return apiKey;
};

// Method to update analytics
whiteLabelSchema.methods.updateAnalytics = async function() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  let monthStats = this.analytics.monthlyStats.find(
    stat => stat.month.getMonth() === monthStart.getMonth() &&
           stat.month.getFullYear() === monthStart.getFullYear()
  );

  if (!monthStats) {
    monthStats = {
      month: monthStart,
      users: 0,
      songs: 0,
      revenue: 0
    };
    this.analytics.monthlyStats.push(monthStats);
  }

  // Update current month stats
  const users = await mongoose.model('User').countDocuments({ 'whiteLabelDomain': this.domain });
  const songs = await mongoose.model('Song').countDocuments({ 'whiteLabelInfo.domain': this.domain });
  
  monthStats.users = users;
  monthStats.songs = songs;
  
  // Update total stats
  this.analytics.totalUsers = users;
  this.analytics.totalSongs = songs;

  await this.save();
};

module.exports = mongoose.model('WhiteLabel', whiteLabelSchema);
