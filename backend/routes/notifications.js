const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');
const ErrorResponse = require('../utils/errorResponse');

// Get all notifications
router.get('/', protect, async (req, res, next) => {
  try {
    const query = {
      recipient: req.user._id
    };

    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Add white label domain filter if applicable
    if (req.whiteLabel) {
      query['metadata.whiteLabelDomain'] = req.whiteLabel.domain;
    }

    const notifications = await Notification.find(query)
      .sort('-createdAt')
      .limit(parseInt(req.query.limit) || 50);

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
});

// Get unread notifications count
router.get('/unread', protect, async (req, res, next) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);

    res.status(200).json({
      success: true,
      data: count
    });
  } catch (error) {
    next(error);
  }
});

// Get notifications summary
router.get('/summary', protect, async (req, res, next) => {
  try {
    const summary = await Notification.getSummary(req.user._id);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return next(new ErrorResponse('Notification not found', 404));
    }

    // Check ownership
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Not authorized to update this notification', 403));
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.put('/read-all', protect, async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.user._id,
        status: 'unread'
      },
      {
        status: 'read',
        readAt: new Date()
      }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
});

// Archive notification
router.put('/:id/archive', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return next(new ErrorResponse('Notification not found', 404));
    }

    // Check ownership
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Not authorized to archive this notification', 403));
    }

    await notification.archive();

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
});

// Archive all notifications
router.put('/archive-all', protect, async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.user._id,
        status: { $ne: 'archived' }
      },
      {
        status: 'archived',
        archivedAt: new Date()
      }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications archived'
    });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return next(new ErrorResponse('Notification not found', 404));
    }

    // Check ownership
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Not authorized to delete this notification', 403));
    }

    await notification.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
});

// Update notification preferences
router.put('/preferences', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    user.settings.emailNotifications = {
      ...user.settings.emailNotifications,
      ...req.body
    };

    await user.save();

    res.status(200).json({
      success: true,
      data: user.settings.emailNotifications
    });
  } catch (error) {
    next(error);
  }
});

// Subscribe to push notifications
router.post('/push/subscribe', protect, async (req, res, next) => {
  try {
    const { subscription } = req.body;

    const user = await User.findById(req.user._id);
    
    // Add subscription if it doesn't exist
    if (!user.pushSubscriptions.find(sub => sub.endpoint === subscription.endpoint)) {
      user.pushSubscriptions.push(subscription);
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Successfully subscribed to push notifications'
    });
  } catch (error) {
    next(error);
  }
});

// Unsubscribe from push notifications
router.post('/push/unsubscribe', protect, async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    const user = await User.findById(req.user._id);
    
    user.pushSubscriptions = user.pushSubscriptions.filter(
      sub => sub.endpoint !== endpoint
    );
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from push notifications'
    });
  } catch (error) {
    next(error);
  }
});

// Test notification
router.post('/test', protect, async (req, res, next) => {
  try {
    const notification = await Notification.createAndSend({
      recipient: req.user._id,
      type: 'system_update',
      title: 'Test Notification',
      message: 'This is a test notification',
      priority: 'low',
      metadata: {
        source: 'system',
        whiteLabelDomain: req.whiteLabel?.domain
      }
    });

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
