const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

module.exports = async () => {
  // Create necessary directories
  const dirs = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../reports/junit/e2e'),
    path.join(__dirname, '../../coverage/e2e')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Set up environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.PORT = 5001;
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_EXPIRE = '1h';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/mazufa-records-e2e';

  // Mock external service credentials
  process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
  process.env.AWS_REGION = 'us-east-1';
  process.env.AWS_S3_BUCKET = 'test-bucket';
  
  process.env.STRIPE_SECRET_KEY = 'test-stripe-key';
  process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook-secret';
  
  process.env.PAYPAL_CLIENT_ID = 'test-paypal-client';
  process.env.PAYPAL_CLIENT_SECRET = 'test-paypal-secret';
  
  process.env.OPENAI_API_KEY = 'test-openai-key';
  
  process.env.SMTP_HOST = 'smtp.test.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'test@test.com';
  process.env.SMTP_PASSWORD = 'test-smtp-password';

  // Start MongoDB Memory Server if not already running
  if (!global.__MONGOD__) {
    const mongod = await MongoMemoryServer.create({
      instance: {
        dbName: 'mazufa-records-e2e',
        port: 27017
      }
    });
    global.__MONGOD__ = mongod;
    process.env.MONGODB_URI = mongod.getUri();
  }

  // Connect to MongoDB
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB Memory Server');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }

  // Create test data directory if it doesn't exist
  const testDataDir = path.join(__dirname, 'test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  // Create test audio file
  const audioFilePath = path.join(testDataDir, 'test-song.mp3');
  if (!fs.existsSync(audioFilePath)) {
    fs.writeFileSync(audioFilePath, Buffer.from('fake audio data'));
  }

  // Create test image file
  const imageFilePath = path.join(testDataDir, 'test-artwork.jpg');
  if (!fs.existsSync(imageFilePath)) {
    fs.writeFileSync(imageFilePath, Buffer.from('fake image data'));
  }

  // Set up global test configuration
  global.__TEST_CONFIG__ = {
    testDataDir,
    testFiles: {
      audio: audioFilePath,
      image: imageFilePath
    },
    mongoUri: process.env.MONGODB_URI
  };

  // Log setup completion
  console.log('E2E test environment setup completed successfully');
  console.log('Test data directory:', testDataDir);
  console.log('MongoDB URI:', process.env.MONGODB_URI);

  // Return configuration for use in tests
  return {
    testDataDir,
    mongoUri: process.env.MONGODB_URI
  };
};
