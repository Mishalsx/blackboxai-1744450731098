const jwt = require('jsonwebtoken');
const User = require('../models/User');
const WhiteLabel = require('../models/WhiteLabel');

// Protect routes
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Get token from cookie
    else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is locked
      if (user.metadata.accountLocked && user.metadata.lockUntil > Date.now()) {
        return res.status(401).json({
          success: false,
          message: 'Account is temporarily locked'
        });
      }

      // Add user to request
      req.user = user;

      // Get white label domain if exists
      if (req.headers.host) {
        const whiteLabel = await WhiteLabel.findOne({ domain: req.headers.host });
        if (whiteLabel) {
          req.whiteLabel = whiteLabel;
        }
      }

      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check specific permissions
exports.checkPermission = (...permissions) => {
  return (req, res, next) => {
    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.every(p => userPermissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'User does not have required permissions'
      });
    }
    next();
  };
};

// Rate limiting middleware
exports.rateLimit = async (req, res, next) => {
  try {
    const key = `rateLimit:${req.ip}`;
    const limit = 100; // requests
    const window = 15 * 60; // 15 minutes in seconds

    // Implementation would use Redis for rate limiting
    // const current = await redis.incr(key);
    // if (current === 1) {
    //   await redis.expire(key, window);
    // }
    // if (current > limit) {
    //   return res.status(429).json({
    //     success: false,
    //     message: 'Too many requests'
    //   });
    // }

    next();
  } catch (error) {
    next(error);
  }
};

// API key authentication
exports.apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key is required'
      });
    }

    // Find user by API key
    const user = await User.findOne({ 'apiKeys.key': apiKey });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    // Get API key details
    const keyDetails = user.apiKeys.find(k => k.key === apiKey);

    // Check if key has required permissions
    if (req.requiredPermissions) {
      const hasPermission = req.requiredPermissions.every(
        p => keyDetails.permissions.includes(p)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'API key does not have required permissions'
        });
      }
    }

    req.user = user;
    req.apiKey = keyDetails;
    next();
  } catch (error) {
    next(error);
  }
};

// White label domain verification
exports.whiteLabelAuth = async (req, res, next) => {
  try {
    const domain = req.headers.host;

    if (!domain) {
      return res.status(401).json({
        success: false,
        message: 'Domain not provided'
      });
    }

    const whiteLabel = await WhiteLabel.findOne({ domain });

    if (!whiteLabel) {
      return res.status(401).json({
        success: false,
        message: 'Invalid white label domain'
      });
    }

    if (whiteLabel.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'White label domain is not active'
      });
    }

    req.whiteLabel = whiteLabel;
    next();
  } catch (error) {
    next(error);
  }
};

// Two-factor authentication verification
exports.verify2FA = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.settings.twoFactorAuth.enabled) {
      const { token } = req.body;

      if (!token) {
        return res.status(401).json({
          success: false,
          message: '2FA token is required'
        });
      }

      // Verify 2FA token
      // Implementation would use a 2FA library like speakeasy
      // const verified = speakeasy.totp.verify({
      //   secret: user.settings.twoFactorAuth.secret,
      //   encoding: 'base32',
      //   token: token
      // });

      // if (!verified) {
      //   return res.status(401).json({
      //     success: false,
      //     message: 'Invalid 2FA token'
      //   });
      // }
    }

    next();
  } catch (error) {
    next(error);
  }
};
