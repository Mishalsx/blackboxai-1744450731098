const express = require('express');
const router = express.Router();
const { protect, authorize, whiteLabelAuth } = require('../middleware/auth');
const WhiteLabel = require('../models/WhiteLabel');
const User = require('../models/User');
const storageService = require('../utils/storageService');
const ErrorResponse = require('../utils/errorResponse');

// Create white label configuration
router.post('/', protect, authorize('admin', 'label'), async (req, res, next) => {
  try {
    const {
      domain,
      cname,
      branding,
      features,
      customization,
      settings,
      subscription
    } = req.body;

    // Check domain availability
    const isDomainAvailable = await WhiteLabel.isDomainAvailable(domain);
    if (!isDomainAvailable) {
      return next(new ErrorResponse('Domain is already in use', 400));
    }

    // Create white label configuration
    const whiteLabel = await WhiteLabel.create({
      owner: req.user._id,
      domain,
      cname,
      branding,
      features,
      customization,
      settings,
      subscription
    });

    // Update user's white label domain
    await User.findByIdAndUpdate(req.user._id, {
      whiteLabelDomain: domain,
      role: 'label'
    });

    res.status(201).json({
      success: true,
      data: whiteLabel
    });
  } catch (error) {
    next(error);
  }
});

// Get all white label configurations (admin only)
router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const whiteLabels = await WhiteLabel.find()
      .populate('owner', 'name email');

    res.status(200).json({
      success: true,
      count: whiteLabels.length,
      data: whiteLabels
    });
  } catch (error) {
    next(error);
  }
});

// Get white label configuration by domain
router.get('/:domain', whiteLabelAuth, async (req, res, next) => {
  try {
    const whiteLabel = await WhiteLabel.findOne({ domain: req.params.domain })
      .populate('owner', 'name email');

    if (!whiteLabel) {
      return next(new ErrorResponse('White label configuration not found', 404));
    }

    res.status(200).json({
      success: true,
      data: whiteLabel
    });
  } catch (error) {
    next(error);
  }
});

// Update white label configuration
router.put('/:domain', protect, whiteLabelAuth, async (req, res, next) => {
  try {
    let whiteLabel = await WhiteLabel.findOne({ domain: req.params.domain });

    if (!whiteLabel) {
      return next(new ErrorResponse('White label configuration not found', 404));
    }

    // Check ownership
    if (whiteLabel.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this configuration', 403));
    }

    // Handle logo uploads
    if (req.files) {
      if (req.files.lightLogo) {
        const lightLogo = await storageService.uploadImage(req.files.lightLogo, {
          width: 300,
          height: 100
        });
        req.body.branding = {
          ...req.body.branding,
          logo: { ...whiteLabel.branding.logo, light: lightLogo }
        };
      }
      if (req.files.darkLogo) {
        const darkLogo = await storageService.uploadImage(req.files.darkLogo, {
          width: 300,
          height: 100
        });
        req.body.branding = {
          ...req.body.branding,
          logo: { ...whiteLabel.branding.logo, dark: darkLogo }
        };
      }
      if (req.files.favicon) {
        const favicon = await storageService.uploadImage(req.files.favicon, {
          width: 32,
          height: 32
        });
        req.body.branding = {
          ...req.body.branding,
          favicon
        };
      }
    }

    // Update configuration
    whiteLabel = await WhiteLabel.findOneAndUpdate(
      { domain: req.params.domain },
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: whiteLabel
    });
  } catch (error) {
    next(error);
  }
});

// Update subscription
router.put('/:domain/subscription', protect, authorize('admin'), async (req, res, next) => {
  try {
    const whiteLabel = await WhiteLabel.findOne({ domain: req.params.domain });

    if (!whiteLabel) {
      return next(new ErrorResponse('White label configuration not found', 404));
    }

    whiteLabel.subscription = {
      ...whiteLabel.subscription,
      ...req.body
    };

    await whiteLabel.save();

    res.status(200).json({
      success: true,
      data: whiteLabel
    });
  } catch (error) {
    next(error);
  }
});

// Get white label analytics
router.get('/:domain/analytics', protect, whiteLabelAuth, async (req, res, next) => {
  try {
    const whiteLabel = await WhiteLabel.findOne({ domain: req.params.domain });

    if (!whiteLabel) {
      return next(new ErrorResponse('White label configuration not found', 404));
    }

    // Check ownership
    if (whiteLabel.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to access these analytics', 403));
    }

    // Update analytics
    await whiteLabel.updateAnalytics();

    res.status(200).json({
      success: true,
      data: whiteLabel.analytics
    });
  } catch (error) {
    next(error);
  }
});

// Generate API key
router.post('/:domain/api-keys', protect, whiteLabelAuth, async (req, res, next) => {
  try {
    const whiteLabel = await WhiteLabel.findOne({ domain: req.params.domain });

    if (!whiteLabel) {
      return next(new ErrorResponse('White label configuration not found', 404));
    }

    // Check ownership
    if (whiteLabel.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to generate API keys', 403));
    }

    const apiKey = whiteLabel.generateApiKey(req.body.name, req.body.permissions);
    await whiteLabel.save();

    res.status(200).json({
      success: true,
      data: {
        key: apiKey,
        name: req.body.name,
        permissions: req.body.permissions
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update security settings
router.put('/:domain/security', protect, whiteLabelAuth, async (req, res, next) => {
  try {
    const whiteLabel = await WhiteLabel.findOne({ domain: req.params.domain });

    if (!whiteLabel) {
      return next(new ErrorResponse('White label configuration not found', 404));
    }

    // Check ownership
    if (whiteLabel.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update security settings', 403));
    }

    whiteLabel.security = {
      ...whiteLabel.security,
      ...req.body
    };

    await whiteLabel.save();

    res.status(200).json({
      success: true,
      data: whiteLabel.security
    });
  } catch (error) {
    next(error);
  }
});

// Delete white label configuration
router.delete('/:domain', protect, authorize('admin'), async (req, res, next) => {
  try {
    const whiteLabel = await WhiteLabel.findOne({ domain: req.params.domain });

    if (!whiteLabel) {
      return next(new ErrorResponse('White label configuration not found', 404));
    }

    // Update associated users
    await User.updateMany(
      { whiteLabelDomain: req.params.domain },
      {
        $unset: { whiteLabelDomain: '' },
        role: 'user'
      }
    );

    await whiteLabel.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
