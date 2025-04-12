const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error stack:', err.stack);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    
    // Get the duplicate field from the error message
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new ErrorResponse(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new ErrorResponse(message, 401);
  }

  // File upload error
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size exceeds limit';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file type';
        break;
      default:
        message = err.message;
    }
    
    error = new ErrorResponse(message, 400);
  }

  // Rate limit exceeded
  if (err.type === 'RateLimit') {
    const message = 'Too many requests, please try again later';
    error = new ErrorResponse(message, 429);
  }

  // API key errors
  if (err.name === 'APIKeyError') {
    const message = err.message || 'Invalid API key';
    error = new ErrorResponse(message, 401);
  }

  // White label errors
  if (err.name === 'WhiteLabelError') {
    const message = err.message || 'White label configuration error';
    error = new ErrorResponse(message, 400);
  }

  // Payment service errors
  if (err.type === 'StripeError') {
    let message = 'Payment processing error';
    
    switch (err.code) {
      case 'card_declined':
        message = 'Card was declined';
        break;
      case 'expired_card':
        message = 'Card has expired';
        break;
      case 'incorrect_cvc':
        message = 'Incorrect CVC code';
        break;
      case 'processing_error':
        message = 'Payment processing error, please try again';
        break;
      default:
        message = err.message;
    }
    
    error = new ErrorResponse(message, 400);
  }

  // AI service errors
  if (err.name === 'AIServiceError') {
    const message = err.message || 'AI processing error';
    error = new ErrorResponse(message, 500);
  }

  // Storage service errors
  if (err.name === 'StorageError') {
    const message = err.message || 'File storage error';
    error = new ErrorResponse(message, 500);
  }

  // Send formatted error response
  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Server Error',
      code: error.code || 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.details : undefined
    },
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Log error to monitoring service
  if (error.statusCode >= 500) {
    // Implementation would integrate with error monitoring service
    // await errorMonitoring.log({
    //   error,
    //   request: {
    //     method: req.method,
    //     url: req.originalUrl,
    //     headers: req.headers,
    //     body: req.body
    //   },
    //   user: req.user ? {
    //     id: req.user._id,
    //     email: req.user.email
    //   } : null
    // });
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Rejection:', err.message);
  
  // Close server & exit process
  if (process.env.NODE_ENV === 'production') {
    // Log to monitoring service before exiting
    // errorMonitoring.log({
    //   error: err,
    //   type: 'UNHANDLED_REJECTION'
    // }).finally(() => {
    //   process.exit(1);
    // });
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err.message);
  
  // Close server & exit process
  if (process.env.NODE_ENV === 'production') {
    // Log to monitoring service before exiting
    // errorMonitoring.log({
    //   error: err,
    //   type: 'UNCAUGHT_EXCEPTION'
    // }).finally(() => {
    //   process.exit(1);
    // });
  }
});

module.exports = errorHandler;
