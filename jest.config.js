module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/tests/**',
    '!**/node_modules/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test timeout
  testTimeout: 30000,

  // Setup files
  setupFiles: ['./tests/setup.js'],

  // Module file extensions
  moduleFileExtensions: ['js', 'json'],

  // Module name mapper for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/backend/$1'
  },

  // Test environment variables
  testEnvironmentVariables: {
    NODE_ENV: 'test'
  },

  // Verbose output
  verbose: true,

  // Automatically clear mock calls and instances between tests
  clearMocks: true,

  // Indicates whether each individual test should be reported during the run
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'reports/junit',
        outputName: 'js-test-results.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ]
};
