const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Connect to in-memory database before tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

// Clear database between tests
beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    await collection.deleteMany({});
  }
});

// Disconnect and stop server after tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  JWT_SECRET: 'test-jwt-secret',
  JWT_EXPIRE: '1h',
  MONGODB_URI: 'mongodb://localhost:27017/test',
  AWS_ACCESS_KEY_ID: 'test-access-key',
  AWS_SECRET_ACCESS_KEY: 'test-secret-key',
  AWS_REGION: 'us-east-1',
  AWS_S3_BUCKET: 'test-bucket',
  STRIPE_SECRET_KEY: 'test-stripe-key',
  OPENAI_API_KEY: 'test-openai-key'
};

// Global test utilities
global.createTestUser = async (overrides = {}) => {
  const User = require('../backend/models/User');
  const defaultUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    role: 'user'
  };

  return await User.create({ ...defaultUser, ...overrides });
};

global.createTestSong = async (artist, overrides = {}) => {
  const Song = require('../backend/models/Song');
  const defaultSong = {
    title: 'Test Song',
    artist: artist._id,
    genre: ['pop'],
    releaseDate: new Date(),
    audioFile: {
      url: 'https://test-bucket.s3.amazonaws.com/test-song.mp3',
      key: 'test-song.mp3'
    }
  };

  return await Song.create({ ...defaultSong, ...overrides });
};

global.createTestContract = async (artist, songs, overrides = {}) => {
  const Contract = require('../backend/models/Contract');
  const defaultContract = {
    artist: artist._id,
    songs: songs.map(song => song._id),
    type: 'single',
    terms: {
      startDate: new Date(),
      territory: ['worldwide'],
      revenueSplit: {
        artist: 80,
        platform: 20
      }
    },
    rights: {
      mechanical: true,
      performance: true,
      digital: true
    }
  };

  return await Contract.create({ ...defaultContract, ...overrides });
};

global.createTestAnalytics = async (song, overrides = {}) => {
  const Analytics = require('../backend/models/Analytics');
  const defaultAnalytics = {
    song: song._id,
    artist: song.artist,
    period: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    },
    totalStats: {
      plays: 1000,
      revenue: 100,
      uniqueListeners: 800
    }
  };

  return await Analytics.create({ ...defaultAnalytics, ...overrides });
};

global.createTestEarnings = async (user, song, overrides = {}) => {
  const Earnings = require('../backend/models/Earnings');
  const defaultEarnings = {
    user: user._id,
    song: song._id,
    period: new Date().toISOString().slice(0, 7),
    earnings: {
      total: 100,
      available: 80,
      pending: 20,
      withdrawn: 0
    }
  };

  return await Earnings.create({ ...defaultEarnings, ...overrides });
};

global.generateAuthToken = (user) => {
  return user.getSignedJwtToken();
};

// Mock external services
jest.mock('../backend/utils/emailService', () => ({
  sendWelcomeEmail: jest.fn(),
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendContractSignedEmail: jest.fn(),
  sendPayoutConfirmationEmail: jest.fn()
}));

jest.mock('../backend/utils/storageService', () => ({
  uploadAudio: jest.fn(),
  uploadImage: jest.fn(),
  deleteFile: jest.fn(),
  generateSignedUrl: jest.fn()
}));

jest.mock('../backend/utils/aiService', () => ({
  generateArtwork: jest.fn(),
  analyzeAudio: jest.fn(),
  generateMarketingRecommendations: jest.fn(),
  generateMetadata: jest.fn(),
  analyzeTrends: jest.fn()
}));

jest.mock('../backend/utils/paymentService', () => ({
  createSubscription: jest.fn(),
  processPayout: jest.fn(),
  processBankTransfer: jest.fn(),
  handleStripeWebhook: jest.fn(),
  handlePayPalWebhook: jest.fn()
}));

// Custom test matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false
      };
    }
  }
});
