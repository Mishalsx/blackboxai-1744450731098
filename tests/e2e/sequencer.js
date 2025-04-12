const Sequencer = require('@jest/test-sequencer').default;
const path = require('path');

class CustomSequencer extends Sequencer {
  /**
   * Sort test paths in specific order
   * 1. Auth tests (user registration, login)
   * 2. User management tests
   * 3. Song management tests
   * 4. Contract tests
   * 5. Analytics tests
   * 6. Earnings tests
   * 7. AI features tests
   * 8. White label tests
   * 9. Notification tests
   */
  sort(tests) {
    const testSequence = [
      'auth',
      'users',
      'songs',
      'contracts',
      'analytics',
      'earnings',
      'ai',
      'whiteLabel',
      'notifications'
    ];

    // Copy tests array to avoid mutating the original
    const copyTests = Array.from(tests);

    // Sort tests based on the sequence
    return copyTests.sort((testA, testB) => {
      const testAPath = testA.path;
      const testBPath = testB.path;

      // Get the test category from the file path
      const getCategory = (testPath) => {
        const fileName = path.basename(testPath);
        const category = testSequence.find(seq => fileName.includes(seq));
        return category ? testSequence.indexOf(category) : testSequence.length;
      };

      const categoryA = getCategory(testAPath);
      const categoryB = getCategory(testBPath);

      // Sort by category first
      if (categoryA !== categoryB) {
        return categoryA - categoryB;
      }

      // For tests in the same category, sort by specific test cases
      const getPriority = (testPath) => {
        const fileName = path.basename(testPath);
        if (fileName.includes('create')) return 0;
        if (fileName.includes('read')) return 1;
        if (fileName.includes('update')) return 2;
        if (fileName.includes('delete')) return 3;
        return 4;
      };

      const priorityA = getPriority(testAPath);
      const priorityB = getPriority(testBPath);

      return priorityA - priorityB;
    });
  }

  /**
   * Determine if tests should run in parallel
   * Some tests might need to run serially due to shared resources
   */
  shard(tests, { shardIndex, shardCount }) {
    const shardSize = Math.ceil(tests.length / shardCount);
    const shardStart = shardSize * shardIndex;
    const shardEnd = shardStart + shardSize;

    return tests
      .sort((a, b) => (a.path > b.path ? 1 : -1))
      .slice(shardStart, shardEnd);
  }

  /**
   * Allow failing fast in CI environment
   */
  async allFailedTests(tests) {
    // In CI, stop after first failure
    if (process.env.CI === 'true') {
      return [];
    }

    // In development, rerun failed tests
    return tests;
  }

  /**
   * Custom caching logic for test results
   */
  getCacheKey(test) {
    const { path: testPath } = test;
    return `${testPath}:${process.env.NODE_ENV}`;
  }

  /**
   * Determine if a test should be skipped based on environment
   */
  shouldSkipTest(test) {
    const { path: testPath } = test;

    // Skip certain tests in CI environment
    if (process.env.CI === 'true') {
      // Skip time-consuming tests in CI
      if (testPath.includes('performance')) {
        return true;
      }
      // Skip tests that require external services in CI
      if (testPath.includes('external-api')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Run setup before each test
   */
  async setup(tests) {
    // Any additional setup needed before running tests
    console.log(`Running ${tests.length} E2E tests...`);
    return tests;
  }

  /**
   * Run cleanup after each test
   */
  async cleanup(tests) {
    // Any additional cleanup needed after running tests
    console.log(`Completed ${tests.length} E2E tests`);
    return tests;
  }
}

module.exports = CustomSequencer;
