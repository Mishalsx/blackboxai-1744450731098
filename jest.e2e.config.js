module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test match patterns for e2e tests
  testMatch: [
    '**/tests/e2e/**/*.test.js',
    '**/tests/e2e/**/*.spec.js'
  ],

  // Setup files
  setupFiles: ['./tests/e2e/setup.js'],

  // Test timeout (increased for e2e tests)
  testTimeout: 60000,

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'lcov', 'clover'],
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/tests/**',
    '!**/node_modules/**'
  ],

  // Coverage thresholds for e2e tests
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'json'],

  // Module name mapper for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/backend/$1'
  },

  // Test environment variables
  testEnvironmentVariables: {
    NODE_ENV: 'test',
    PORT: '5001', // Different port for e2e tests
    MONGODB_URI: 'mongodb://localhost:27017/mazufa-records-e2e'
  },

  // Verbose output
  verbose: true,

  // Automatically clear mock calls and instances between tests
  clearMocks: true,

  // Global teardown
  globalTeardown: './tests/e2e/teardown.js',

  // Reporters configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'reports/junit/e2e',
        outputName: 'e2e-test-results.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],

  // Global setup
  globalSetup: './tests/e2e/globalSetup.js',

  // Test sequencer
  testSequencer: './tests/e2e/sequencer.js',

  // Retry failed tests
  retry: 2,

  // Maximum number of workers
  maxWorkers: 1,

  // Fail fast in CI environment
  bail: process.env.CI === 'true' ? 1 : 0,

  // Display options
  errorOnDeprecated: true,
  detectOpenHandles: true,
  forceExit: true,

  // Custom resolver
  resolver: './tests/e2e/resolver.js',

  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Module paths
  modulePaths: [
    '<rootDir>/backend'
  ],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Global configuration
  globals: {
    __E2E__: true
  }
};
