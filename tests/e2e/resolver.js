const defaultResolver = require('jest-resolve/build/defaultResolver').default;
const path = require('path');

/**
 * Custom resolver for Jest to handle module resolution and mocking
 * during E2E tests.
 */
module.exports = (request, options) => {
  // Configuration for mock modules
  const MOCK_MODULES = {
    // External services
    '@sendgrid/mail': path.resolve(__dirname, '__mocks__/sendgrid.js'),
    'aws-sdk': path.resolve(__dirname, '__mocks__/aws-sdk.js'),
    'stripe': path.resolve(__dirname, '__mocks__/stripe.js'),
    '@paypal/checkout-server-sdk': path.resolve(__dirname, '__mocks__/paypal.js'),
    'openai': path.resolve(__dirname, '__mocks__/openai.js'),

    // Third-party integrations
    'web-push': path.resolve(__dirname, '__mocks__/web-push.js'),
    'nodemailer': path.resolve(__dirname, '__mocks__/nodemailer.js'),

    // Database
    'mongodb-memory-server': path.resolve(__dirname, '__mocks__/mongodb-memory-server.js'),
  };

  // Check if the module should be mocked
  if (MOCK_MODULES[request]) {
    return MOCK_MODULES[request];
  }

  // Handle path aliases
  if (request.startsWith('@/')) {
    return defaultResolver(
      request.replace('@/', path.resolve(__dirname, '../../backend/')),
      options
    );
  }

  // Handle relative imports within tests
  if (request.startsWith('./') || request.startsWith('../')) {
    try {
      return defaultResolver(request, options);
    } catch (error) {
      // Try resolving from the test directory
      return defaultResolver(
        path.resolve(__dirname, request),
        options
      );
    }
  }

  // Handle absolute imports from the project root
  if (request.startsWith('backend/')) {
    return defaultResolver(
      path.resolve(__dirname, '../../', request),
      options
    );
  }

  // Handle test utilities
  if (request.startsWith('test-utils/')) {
    return defaultResolver(
      path.resolve(__dirname, 'utils', request.replace('test-utils/', '')),
      options
    );
  }

  // Handle environment-specific modules
  if (process.env.NODE_ENV === 'test') {
    const testSpecificModules = {
      // Add any test-specific module mappings here
      'some-production-only-module': path.resolve(__dirname, '__mocks__/some-production-only-module.js')
    };

    if (testSpecificModules[request]) {
      return testSpecificModules[request];
    }
  }

  // Handle dynamic imports
  if (request.includes('dynamic-import')) {
    return defaultResolver(
      path.resolve(__dirname, '__dynamic__', request),
      options
    );
  }

  // Handle binary modules
  if (request.endsWith('.node')) {
    return defaultResolver(
      path.resolve(__dirname, '__binary__', request),
      options
    );
  }

  // Fallback to default resolver
  try {
    return defaultResolver(request, {
      ...options,
      paths: [
        ...options.paths,
        path.resolve(__dirname, '../../node_modules'),
        path.resolve(__dirname, '../../backend'),
        path.resolve(__dirname, '../')
      ]
    });
  } catch (error) {
    // If module not found, throw a more descriptive error
    throw new Error(
      `Cannot resolve module '${request}' from '${options.basedir}'\n` +
      `Original error: ${error.message}\n` +
      'Make sure the module is installed and the path is correct.'
    );
  }
};

// Export additional utilities for test configuration
module.exports.createModule = (name, factory) => {
  const modulePath = path.resolve(__dirname, '__dynamic__', `${name}.js`);
  require('fs').writeFileSync(modulePath, factory());
  return modulePath;
};

module.exports.clearModuleCache = () => {
  Object.keys(require.cache).forEach(key => {
    delete require.cache[key];
  });
};

module.exports.getMockPath = (moduleName) => {
  return path.resolve(__dirname, '__mocks__', `${moduleName}.js`);
};
