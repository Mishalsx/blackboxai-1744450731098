// Mock Stripe SDK
const mockStripe = {
  customers: {
    create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
    update: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
    del: jest.fn().mockResolvedValue({ deleted: true })
  },
  paymentIntents: {
    create: jest.fn().mockResolvedValue({
      id: 'pi_test123',
      client_secret: 'pi_test123_secret',
      status: 'succeeded'
    }),
    confirm: jest.fn().mockResolvedValue({ status: 'succeeded' }),
    cancel: jest.fn().mockResolvedValue({ status: 'canceled' })
  },
  payouts: {
    create: jest.fn().mockResolvedValue({
      id: 'po_test123',
      status: 'paid',
      amount: 1000
    })
  },
  webhooks: {
    constructEvent: jest.fn().mockReturnValue({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test123',
          status: 'succeeded',
          amount: 1000
        }
      }
    })
  },
  refunds: {
    create: jest.fn().mockResolvedValue({
      id: 'ref_test123',
      status: 'succeeded',
      amount: 1000
    })
  },
  transfers: {
    create: jest.fn().mockResolvedValue({
      id: 'tr_test123',
      status: 'paid',
      amount: 1000
    })
  },
  accounts: {
    create: jest.fn().mockResolvedValue({
      id: 'acct_test123',
      type: 'custom',
      capabilities: { transfers: 'active' }
    }),
    update: jest.fn().mockResolvedValue({
      id: 'acct_test123',
      type: 'custom',
      capabilities: { transfers: 'active' }
    })
  },
  balance: {
    retrieve: jest.fn().mockResolvedValue({
      available: [{ amount: 10000, currency: 'usd' }],
      pending: [{ amount: 5000, currency: 'usd' }]
    })
  },
  subscriptions: {
    create: jest.fn().mockResolvedValue({
      id: 'sub_test123',
      status: 'active',
      current_period_end: Date.now() + 30 * 24 * 60 * 60 * 1000
    }),
    update: jest.fn().mockResolvedValue({
      id: 'sub_test123',
      status: 'active'
    }),
    cancel: jest.fn().mockResolvedValue({
      id: 'sub_test123',
      status: 'canceled'
    })
  }
};

// Export mock constructor
module.exports = function(apiKey) {
  if (!apiKey) {
    throw new Error('Stripe API key is required');
  }
  return mockStripe;
};

// Export mock instance for direct access in tests
module.exports.mockStripe = mockStripe;

// Export Stripe error types for error handling tests
module.exports.errors = {
  StripeError: class StripeError extends Error {
    constructor(message) {
      super(message);
      this.type = 'StripeError';
    }
  },
  StripeCardError: class StripeCardError extends Error {
    constructor(message) {
      super(message);
      this.type = 'StripeCardError';
      this.code = 'card_error';
    }
  },
  StripeInvalidRequestError: class StripeInvalidRequestError extends Error {
    constructor(message) {
      super(message);
      this.type = 'StripeInvalidRequestError';
    }
  }
};
