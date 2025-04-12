const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../backend/server');
const User = require('../../backend/models/User');

let mongoServer;
let server;

// Connect to in-memory database before tests
beforeAll(async () => {
  // Start MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to the in-memory database
  await mongoose.connect(mongoUri);

  // Start express server
  const port = process.env.PORT || 5001;
  server = app.listen(port);

  // Create admin user for tests that require admin privileges
  await User.create({
    email: 'admin@test.com',
    password: 'Admin123!',
    name: 'Admin User',
    role: 'admin',
    isVerified: true
  });
});

// Clear database between tests
beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  const adminUser = await User.findOne({ role: 'admin' });

  for (let collection of collections) {
    // Preserve admin user, delete everything else
    if (collection.collectionName === 'users') {
      await collection.deleteMany({ _id: { $ne: adminUser._id } });
    } else {
      await collection.deleteMany({});
    }
  }
});

// Disconnect and cleanup after tests
afterAll(async () => {
  // Close server
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }

  // Close database connection
  await mongoose.disconnect();

  // Stop MongoDB Memory Server
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Global test utilities
global.getAuthToken = async (email, password) => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  
  return response.body.token;
};

global.createTestData = async () => {
  // Create test user
  const user = await User.create({
    email: 'test@example.com',
    password: 'Password123!',
    name: 'Test User',
    role: 'user',
    isVerified: true
  });

  // Create test song
  const song = await global.createTestSong(user);

  // Create test contract
  const contract = await global.createTestContract(user, [song]);

  // Create test analytics
  const analytics = await global.createTestAnalytics(song);

  // Create test earnings
  const earnings = await global.createTestEarnings(user, song);

  return {
    user,
    song,
    contract,
    analytics,
    earnings
  };
};

// Mock external services
jest.mock('../../backend/utils/emailService');
jest.mock('../../backend/utils/storageService');
jest.mock('../../backend/utils/aiService');
jest.mock('../../backend/utils/paymentService');

// Custom matchers
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
  },
  toBeValidMongoId(received) {
    const pass = mongoose.Types.ObjectId.isValid(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid MongoDB ObjectId`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid MongoDB ObjectId`,
        pass: false
      };
    }
  }
});

// Global error handler
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});
