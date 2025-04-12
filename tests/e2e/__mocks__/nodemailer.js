// Store sent emails for verification in tests
const sentEmails = [];

// Mock transport
const mockTransport = {
  name: 'mock',
  version: '1.0.0',
  send: (mail, callback) => {
    const info = {
      messageId: `mock-email-${Date.now()}`,
      envelope: mail.data.envelope || {
        from: mail.data.from,
        to: mail.data.to
      },
      accepted: [mail.data.to],
      rejected: [],
      pending: [],
      response: '250 Message accepted'
    };

    // Store the email for test verification
    sentEmails.push({
      ...mail.data,
      timestamp: new Date(),
      messageId: info.messageId
    });

    callback(null, info);
  }
};

// Mock createTransport function
const createTransport = (options) => {
  return {
    name: 'mock-transport',
    version: '1.0.0',
    send: mockTransport.send,
    close: () => {},
    verify: () => Promise.resolve(true),
    options
  };
};

// Helper functions for tests
const getLastEmail = () => sentEmails[sentEmails.length - 1];
const getAllEmails = () => [...sentEmails];
const clearSentEmails = () => sentEmails.splice(0, sentEmails.length);
const getSentEmailsByRecipient = (recipient) => 
  sentEmails.filter(email => 
    email.to === recipient || 
    (Array.isArray(email.to) && email.to.includes(recipient))
  );

// Mock email templates
const templates = {
  welcome: {
    subject: 'Welcome to Mazufa Records!',
    html: '<h1>Welcome!</h1><p>Thank you for joining Mazufa Records.</p>'
  },
  verification: {
    subject: 'Verify your email address',
    html: '<h1>Email Verification</h1><p>Click the link to verify your email.</p>'
  },
  passwordReset: {
    subject: 'Reset your password',
    html: '<h1>Password Reset</h1><p>Click the link to reset your password.</p>'
  },
  contractSigned: {
    subject: 'Contract Signed',
    html: '<h1>Contract Update</h1><p>Your contract has been signed.</p>'
  },
  payoutProcessed: {
    subject: 'Payout Processed',
    html: '<h1>Payout Update</h1><p>Your payout has been processed.</p>'
  },
  songUploaded: {
    subject: 'Song Upload Complete',
    html: '<h1>Upload Complete</h1><p>Your song has been processed.</p>'
  }
};

// Mock errors
class NodemailerError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'NodemailerError';
    this.code = code;
  }
}

// Export the mock module
module.exports = {
  createTransport,
  getTestMessageUrl: () => 'https://ethereal.email/message/mock-id',
  createTestAccount: () => Promise.resolve({
    user: 'test@ethereal.email',
    pass: 'mock-password'
  }),
  // Test helpers
  __testing: {
    getLastEmail,
    getAllEmails,
    clearSentEmails,
    getSentEmailsByRecipient,
    templates,
    mockTransport
  },
  // Mock errors
  errors: {
    NodemailerError,
    ConnectionError: class extends NodemailerError {
      constructor() {
        super('Connection failed', 'ECONNECTION');
      }
    },
    AuthenticationError: class extends NodemailerError {
      constructor() {
        super('Invalid credentials', 'EAUTH');
      }
    },
    MessageError: class extends NodemailerError {
      constructor(message) {
        super(message, 'EMESSAGE');
      }
    }
  },
  // Helper to simulate errors
  __setError: (error) => {
    mockTransport.send = (mail, callback) => {
      callback(error);
    };
  },
  // Helper to restore normal behavior
  __restoreTransport: () => {
    mockTransport.send = (mail, callback) => {
      const info = {
        messageId: `mock-email-${Date.now()}`,
        envelope: mail.data.envelope || {
          from: mail.data.from,
          to: mail.data.to
        },
        accepted: [mail.data.to],
        rejected: [],
        pending: [],
        response: '250 Message accepted'
      };

      sentEmails.push({
        ...mail.data,
        timestamp: new Date(),
        messageId: info.messageId
      });

      callback(null, info);
    };
  }
};
