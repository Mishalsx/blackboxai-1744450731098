// Mock OpenAI API responses
const mockResponses = {
  imageGeneration: {
    created: Date.now(),
    data: [
      {
        url: 'https://test-storage.com/generated-image-1.png',
        revised_prompt: 'A professional album cover with modern design'
      },
      {
        url: 'https://test-storage.com/generated-image-2.png',
        revised_prompt: 'Alternative version of the album cover'
      }
    ]
  },
  contentAnalysis: {
    id: 'analysis_test123',
    created: Date.now(),
    choices: [
      {
        text: 'Analysis of the audio content reveals a pop song with strong melodic elements...',
        finish_reason: 'stop'
      }
    ]
  },
  marketingRecommendations: {
    id: 'marketing_test123',
    created: Date.now(),
    choices: [
      {
        text: JSON.stringify({
          targetAudience: ['18-24', '25-34'],
          platforms: ['Instagram', 'TikTok'],
          contentStrategy: 'Focus on short-form video content...',
          recommendations: [
            'Create behind-the-scenes content',
            'Engage with trending challenges',
            'Collaborate with influencers'
          ]
        }),
        finish_reason: 'stop'
      }
    ]
  },
  metadataGeneration: {
    id: 'metadata_test123',
    created: Date.now(),
    choices: [
      {
        text: JSON.stringify({
          tags: ['pop', 'electronic', 'upbeat'],
          description: 'A catchy pop song with electronic elements',
          keywords: ['summer hit', 'dance', 'party'],
          mood: 'energetic',
          genre: 'pop'
        }),
        finish_reason: 'stop'
      }
    ]
  }
};

// Mock OpenAI Client
class OpenAIApi {
  constructor(config) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.config = config;
  }

  async createImage(params) {
    if (!params.prompt) {
      throw new Error('Prompt is required for image generation');
    }
    return mockResponses.imageGeneration;
  }

  async createCompletion(params) {
    switch (params.model) {
      case 'content-analysis':
        return mockResponses.contentAnalysis;
      case 'marketing-recommendations':
        return mockResponses.marketingRecommendations;
      case 'metadata-generation':
        return mockResponses.metadataGeneration;
      default:
        throw new Error(`Unknown model: ${params.model}`);
    }
  }

  async createChatCompletion(params) {
    return {
      id: 'chat_test123',
      created: Date.now(),
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'This is a mock chat completion response'
          },
          finish_reason: 'stop'
        }
      ]
    };
  }
}

// Mock Configuration class
class Configuration {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.organization = config.organization;
  }
}

// Export mock classes and responses
module.exports = {
  OpenAIApi,
  Configuration,
  mockResponses
};

// Export error types for error handling tests
module.exports.APIError = class APIError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.type = 'OpenAIError';
  }
};

// Export rate limit error
module.exports.RateLimitError = class RateLimitError extends module.exports.APIError {
  constructor() {
    super('Rate limit exceeded', 429);
  }
};

// Export validation error
module.exports.ValidationError = class ValidationError extends module.exports.APIError {
  constructor(message) {
    super(message, 400);
  }
};

// Export authentication error
module.exports.AuthenticationError = class AuthenticationError extends module.exports.APIError {
  constructor() {
    super('Invalid API key', 401);
  }
};

// Helper function to simulate rate limiting
module.exports.enableRateLimit = () => {
  OpenAIApi.prototype.createImage = async () => {
    throw new module.exports.RateLimitError();
  };
};

// Helper function to restore normal behavior
module.exports.disableRateLimit = () => {
  OpenAIApi.prototype.createImage = async (params) => {
    if (!params.prompt) {
      throw new Error('Prompt is required for image generation');
    }
    return mockResponses.imageGeneration;
  };
};
