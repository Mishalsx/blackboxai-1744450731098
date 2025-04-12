const mockResponses = {
  order: {
    id: 'ORDER_TEST_123',
    status: 'COMPLETED',
    purchase_units: [{
      amount: {
        currency_code: 'USD',
        value: '100.00'
      },
      payee: {
        email_address: 'merchant@test.com'
      }
    }],
    payer: {
      email_address: 'customer@test.com',
      payer_id: 'PAYER_TEST_123'
    },
    create_time: new Date().toISOString(),
    update_time: new Date().toISOString()
  },
  payout: {
    batch_header: {
      payout_batch_id: 'BATCH_TEST_123',
      batch_status: 'SUCCESS',
      time_created: new Date().toISOString()
    },
    items: [{
      payout_item_id: 'ITEM_TEST_123',
      transaction_status: 'SUCCESS',
      payout_item_fee: {
        currency: 'USD',
        value: '1.00'
      },
      payout_batch_id: 'BATCH_TEST_123',
      recipient_type: 'EMAIL',
      amount: {
        currency: 'USD',
        value: '100.00'
      },
      receiver: 'artist@test.com'
    }]
  }
};

class PayPalClient {
  constructor(clientId, clientSecret) {
    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials are required');
    }
  }

  static sandbox() {
    return new PayPalClient('test_client_id', 'test_client_secret');
  }

  async execute(request) {
    if (request instanceof OrdersCreateRequest) {
      return mockResponses.order;
    }
    if (request instanceof OrdersCaptureRequest) {
      return { ...mockResponses.order, status: 'COMPLETED' };
    }
    if (request instanceof PayoutsPostRequest) {
      return mockResponses.payout;
    }
    throw new Error('Unknown request type');
  }
}

class OrdersCreateRequest {
  constructor() {
    this.requestBody = null;
  }

  requestBody(body) {
    this.requestBody = body;
    return this;
  }

  prefer(prefer) {
    this.preferHeader = prefer;
    return this;
  }
}

class OrdersCaptureRequest {
  constructor(orderId) {
    this.orderId = orderId;
  }
}

class PayoutsPostRequest {
  constructor() {
    this.requestBody = null;
  }

  requestBody(body) {
    this.requestBody = body;
    return this;
  }
}

class PayPalError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'PayPalError';
    this.details = details;
  }
}

const errors = {
  PayPalError,
  ResourceNotFoundError: class extends PayPalError {
    constructor(resource) {
      super(`${resource} not found`);
      this.name = 'ResourceNotFoundError';
    }
  },
  InvalidRequestError: class extends PayPalError {
    constructor(message) {
      super(message);
      this.name = 'InvalidRequestError';
    }
  },
  AuthorizationError: class extends PayPalError {
    constructor() {
      super('Authorization failed');
      this.name = 'AuthorizationError';
    }
  }
};

module.exports = {
  core: {
    PayPalHttpClient: PayPalClient
  },
  orders: {
    OrdersCreateRequest,
    OrdersCaptureRequest
  },
  payouts: {
    PayoutsPostRequest
  },
  mockResponses,
  errors,
  setMockResponse: (type, response) => {
    mockResponses[type] = response;
  },
  resetMockResponses: () => {
    Object.keys(mockResponses).forEach(key => {
      delete mockResponses[key];
    });
  }
};
