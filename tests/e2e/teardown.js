const mongoose = require('mongoose');
const { execSync } = require('child_process');
const path = require('path');

module.exports = async () => {
  // Clean up database
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }

  // Clean up uploaded files
  const uploadsDir = path.join(__dirname, '../../uploads');
  try {
    execSync(`rm -rf ${uploadsDir}/*`);
  } catch (error) {
    console.warn('Error cleaning uploads directory:', error.message);
  }

  // Clean up test reports
  const reportsDir = path.join(__dirname, '../../reports/junit/e2e');
  try {
    execSync(`rm -rf ${reportsDir}/*`);
  } catch (error) {
    console.warn('Error cleaning reports directory:', error.message);
  }

  // Clean up coverage reports
  const coverageDir = path.join(__dirname, '../../coverage/e2e');
  try {
    execSync(`rm -rf ${coverageDir}/*`);
  } catch (error) {
    console.warn('Error cleaning coverage directory:', error.message);
  }

  // Additional cleanup tasks
  try {
    // Remove any temporary files
    execSync('rm -rf /tmp/test-*');

    // Kill any hanging processes (if running in CI)
    if (process.env.CI) {
      execSync('pkill -f node || true');
    }
  } catch (error) {
    console.warn('Error in additional cleanup:', error.message);
  }

  // Wait for all cleanup operations to complete
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Stop MongoDB Memory Server if it exists
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
    delete global.__MONGOD__;
  }

  // Log completion
  console.log('E2E test teardown completed successfully');
};
