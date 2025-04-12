// Store sent notifications for verification in tests
const sentNotifications = [];

// Default VAPID keys
const defaultVapidKeys = {
  publicKey: 'BDd3_hVL9fZi9Ybo2UUzA284WG5FZR30_95YeZJsiApwXKpNcF1rRPF3foIiBHXRdJI2Qhumhf6_LFTeZaNndIo',
  privateKey: 'TVe_nJlciQxNJygSTZaNndIo_95YeZJsiApwXKp'
};

// Mock subscription
const mockSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/mock-subscription-id',
  keys: {
    p256dh: 'mock-p256dh-key',
    auth: 'mock-auth-key'
  }
};

// Mock notification options
const defaultNotificationOptions = {
  TTL: 7200,
  vapidDetails: {
    subject: 'mailto:test@example.com',
    publicKey: defaultVapidKeys.publicKey,
    privateKey: defaultVapidKeys.privateKey
  },
  headers: {}
};

// Mock web-push functions
const webPush = {
  // Generate VAPID keys
  generateVAPIDKeys: () => ({
    ...defaultVapidKeys
  }),

  // Set VAPID details
  setVapidDetails: (subject, publicKey, privateKey) => {
    defaultNotificationOptions.vapidDetails = {
      subject,
      publicKey,
      privateKey
    };
  },

  // Send notification
  sendNotification: (subscription, payload, options = {}) => {
    return new Promise((resolve, reject) => {
      // Validate subscription
      if (!subscription || !subscription.endpoint) {
        reject(new Error('Subscription must have an endpoint'));
        return;
      }

      // Validate payload
      if (payload && !(payload instanceof Buffer) && typeof payload !== 'string') {
        reject(new Error('Payload must be either a string or a Buffer'));
        return;
      }

      // Store notification for test verification
      const notification = {
        subscription,
        payload: payload ? payload.toString() : '',
        options: { ...defaultNotificationOptions, ...options },
        timestamp: new Date()
      };

      sentNotifications.push(notification);

      // Simulate successful push
      resolve({
        statusCode: 201,
        body: '',
        headers: {
          location: 'https://fcm.googleapis.com/fcm/send/mock-message-id'
        }
      });
    });
  },

  // Get notification count
  getNotificationCount: () => sentNotifications.length,

  // Clear sent notifications
  clearNotifications: () => {
    sentNotifications.splice(0, sentNotifications.length);
  },

  // Get sent notifications
  getSentNotifications: () => [...sentNotifications],

  // Get last sent notification
  getLastNotification: () => sentNotifications[sentNotifications.length - 1],

  // Mock errors
  errors: {
    WebPushError: class WebPushError extends Error {
      constructor(message, statusCode, body, headers) {
        super(message);
        this.name = 'WebPushError';
        this.statusCode = statusCode;
        this.body = body;
        this.headers = headers;
      }
    }
  }
};

// Helper functions to simulate different scenarios
webPush.__setError = (error) => {
  const originalSendNotification = webPush.sendNotification;
  webPush.sendNotification = () => Promise.reject(error);
  return () => {
    webPush.sendNotification = originalSendNotification;
  };
};

webPush.__setSubscriptionExpired = () => {
  return webPush.__setError(
    new webPush.errors.WebPushError(
      'Subscription has expired or is no longer valid',
      410,
      null,
      {}
    )
  );
};

webPush.__setQuotaExceeded = () => {
  return webPush.__setError(
    new webPush.errors.WebPushError(
      'Quota exceeded',
      429,
      null,
      { 'retry-after': '3600' }
    )
  );
};

// Export mock module
module.exports = {
  ...webPush,
  // Export test helpers
  __testing: {
    mockSubscription,
    defaultVapidKeys,
    defaultNotificationOptions,
    sentNotifications
  }
};
