// Create database
db = db.getSiblingDB('mazufa-records');

// Create collections with schema validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        password: {
          bsonType: 'string',
          minLength: 6
        },
        role: {
          enum: ['user', 'admin', 'label']
        }
      }
    }
  }
});

db.createCollection('songs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title', 'artist'],
      properties: {
        title: {
          bsonType: 'string',
          minLength: 1
        },
        artist: {
          bsonType: 'objectId'
        },
        isrc: {
          bsonType: 'string',
          pattern: '^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$'
        }
      }
    }
  }
});

db.createCollection('contracts', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['artist', 'type', 'terms'],
      properties: {
        artist: {
          bsonType: 'objectId'
        },
        type: {
          enum: ['single', 'album', 'distribution']
        },
        status: {
          enum: ['draft', 'active', 'terminated']
        }
      }
    }
  }
});

db.createCollection('analytics', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['song', 'period'],
      properties: {
        song: {
          bsonType: 'objectId'
        },
        period: {
          bsonType: 'object',
          required: ['start', 'end'],
          properties: {
            start: {
              bsonType: 'date'
            },
            end: {
              bsonType: 'date'
            }
          }
        }
      }
    }
  }
});

db.createCollection('earnings', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user', 'period'],
      properties: {
        user: {
          bsonType: 'objectId'
        },
        period: {
          bsonType: 'string',
          pattern: '^\\d{4}-\\d{2}$'
        }
      }
    }
  }
});

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ 'apiKeys.key': 1 });
db.users.createIndex({ whiteLabelDomain: 1 });

db.songs.createIndex({ artist: 1 });
db.songs.createIndex({ isrc: 1 }, { unique: true, sparse: true });
db.songs.createIndex({ 'distribution.status': 1 });
db.songs.createIndex({ 'whiteLabelInfo.domain': 1 });

db.contracts.createIndex({ artist: 1 });
db.contracts.createIndex({ 'songs': 1 });
db.contracts.createIndex({ status: 1 });
db.contracts.createIndex({ 'whiteLabelInfo.domain': 1 });

db.analytics.createIndex({ song: 1, 'period.start': 1, 'period.end': 1 });
db.analytics.createIndex({ artist: 1 });
db.analytics.createIndex({ whiteLabelDomain: 1 });

db.earnings.createIndex({ user: 1, period: 1 });
db.earnings.createIndex({ song: 1 });
db.earnings.createIndex({ whiteLabelDomain: 1 });

// Create admin user if it doesn't exist
db.users.insertOne({
  email: 'admin@mazufarecords.com',
  password: '$2a$10$your_hashed_password_here',  // Replace with actual hashed password
  name: 'Admin',
  role: 'admin',
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create default settings
db.settings.insertOne({
  type: 'global',
  payoutThreshold: 50,
  supportedPlatforms: ['spotify', 'apple_music', 'amazon_music', 'youtube_music'],
  defaultRevenueSplit: {
    artist: 80,
    platform: 20
  },
  aiFeatures: {
    enabled: true,
    artworkGeneration: true,
    contentAnalysis: true,
    marketingRecommendations: true
  },
  security: {
    maxLoginAttempts: 5,
    lockoutDuration: 30, // minutes
    passwordPolicy: {
      minLength: 8,
      requireNumbers: true,
      requireSpecialChars: true,
      requireUppercase: true,
      requireLowercase: true
    }
  },
  email: {
    templates: {
      welcome: true,
      verification: true,
      passwordReset: true,
      earnings: true,
      contractSigned: true
    }
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create indexes for full-text search
db.songs.createIndex({
  title: 'text',
  'metadata.tags': 'text',
  'metadata.description': 'text'
}, {
  weights: {
    title: 10,
    'metadata.tags': 5,
    'metadata.description': 1
  },
  name: 'songs_text_search'
});

// Create TTL index for notifications
db.notifications.createIndex({ 'expiresAt': 1 }, { expireAfterSeconds: 0 });

// Create compound indexes for common queries
db.analytics.createIndex({ 
  song: 1, 
  'period.start': 1, 
  'totalStats.plays': -1 
});

db.earnings.createIndex({ 
  user: 1, 
  period: 1, 
  'earnings.total': -1 
});

// Print completion message
print('MongoDB initialization completed successfully');
