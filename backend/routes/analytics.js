const express = require('express');
const router = express.Router();
const { protect, authorize, checkPermission } = require('../middleware/auth');
const Analytics = require('../models/Analytics');
const Song = require('../models/Song');
const aiService = require('../utils/aiService');
const ErrorResponse = require('../utils/errorResponse');

// Get overall analytics
router.get('/overview', protect, async (req, res, next) => {
  try {
    const query = {};

    // Filter by artist if not admin
    if (req.user.role !== 'admin') {
      query.artist = req.user._id;
    }

    // Add white label domain filter if applicable
    if (req.whiteLabel) {
      query.whiteLabelDomain = req.whiteLabel.domain;
    }

    // Get date range from query params or default to last 30 days
    const endDate = new Date();
    const startDate = new Date(endDate - 30 * 24 * 60 * 60 * 1000);
    
    if (req.query.startDate) {
      query['period.start'] = { $gte: new Date(req.query.startDate) };
    }
    if (req.query.endDate) {
      query['period.end'] = { $lte: new Date(req.query.endDate) };
    }

    const analytics = await Analytics.aggregate([
      {
        $match: query
      },
      {
        $group: {
          _id: null,
          totalPlays: { $sum: '$totalStats.plays' },
          totalRevenue: { $sum: '$totalStats.revenue' },
          uniqueListeners: { $sum: '$totalStats.uniqueListeners' },
          totalSaves: { $sum: '$totalStats.saves' },
          totalShares: { $sum: '$totalStats.shares' },
          totalPlaylists: { $sum: '$totalStats.playlists' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: analytics[0] || {
        totalPlays: 0,
        totalRevenue: 0,
        uniqueListeners: 0,
        totalSaves: 0,
        totalShares: 0,
        totalPlaylists: 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get song analytics
router.get('/song/:songId', protect, async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.songId);
    if (!song) {
      return next(new ErrorResponse('Song not found', 404));
    }

    // Check ownership
    if (song.artist.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to access these analytics', 403));
    }

    const analytics = await Analytics.find({ song: req.params.songId })
      .sort('-period.start');

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

// Get platform analytics
router.get('/platforms', protect, async (req, res, next) => {
  try {
    const query = {};

    // Filter by artist if not admin
    if (req.user.role !== 'admin') {
      query.artist = req.user._id;
    }

    // Add white label domain filter if applicable
    if (req.whiteLabel) {
      query.whiteLabelDomain = req.whiteLabel.domain;
    }

    const analytics = await Analytics.aggregate([
      {
        $match: query
      },
      {
        $unwind: '$platforms'
      },
      {
        $group: {
          _id: '$platforms.name',
          plays: { $sum: '$platforms.plays' },
          revenue: { $sum: '$platforms.revenue' },
          listeners: { $sum: '$platforms.listeners' }
        }
      },
      {
        $sort: { revenue: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

// Get geographic analytics
router.get('/geography', protect, async (req, res, next) => {
  try {
    const query = {};

    // Filter by artist if not admin
    if (req.user.role !== 'admin') {
      query.artist = req.user._id;
    }

    // Add white label domain filter if applicable
    if (req.whiteLabel) {
      query.whiteLabelDomain = req.whiteLabel.domain;
    }

    const analytics = await Analytics.aggregate([
      {
        $match: query
      },
      {
        $unwind: '$demographics.countries'
      },
      {
        $group: {
          _id: '$demographics.countries.code',
          country: { $first: '$demographics.countries.name' },
          plays: { $sum: '$demographics.countries.plays' },
          revenue: { $sum: '$demographics.countries.revenue' }
        }
      },
      {
        $sort: { plays: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

// Get trend analytics
router.get('/trends', protect, async (req, res, next) => {
  try {
    const query = {};

    // Filter by artist if not admin
    if (req.user.role !== 'admin') {
      query.artist = req.user._id;
    }

    // Add white label domain filter if applicable
    if (req.whiteLabel) {
      query.whiteLabelDomain = req.whiteLabel.domain;
    }

    const period = req.query.period || 'daily'; // daily, weekly, monthly

    const analytics = await Analytics.aggregate([
      {
        $match: query
      },
      {
        $unwind: `$trends.${period}`
      },
      {
        $group: {
          _id: `$trends.${period}.date`,
          plays: { $sum: `$trends.${period}.plays` },
          revenue: { $sum: `$trends.${period}.revenue` }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

// Get engagement analytics
router.get('/engagement', protect, async (req, res, next) => {
  try {
    const query = {};

    // Filter by artist if not admin
    if (req.user.role !== 'admin') {
      query.artist = req.user._id;
    }

    // Add white label domain filter if applicable
    if (req.whiteLabel) {
      query.whiteLabelDomain = req.whiteLabel.domain;
    }

    const analytics = await Analytics.aggregate([
      {
        $match: query
      },
      {
        $group: {
          _id: null,
          averageListenTime: { $avg: '$engagement.averageListenTime' },
          completionRate: { $avg: '$engagement.completionRate' },
          skipRate: { $avg: '$engagement.skipRate' },
          repeatListens: { $avg: '$engagement.repeatListens' },
          playlistAddRate: { $avg: '$engagement.playlistAddRate' },
          socialShares: { $sum: '$engagement.socialShares.total' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: analytics[0] || {}
    });
  } catch (error) {
    next(error);
  }
});

// Get AI insights
router.get('/insights', protect, checkPermission('use_ai_tools'), async (req, res, next) => {
  try {
    const query = {};

    // Filter by artist if not admin
    if (req.user.role !== 'admin') {
      query.artist = req.user._id;
    }

    // Add white label domain filter if applicable
    if (req.whiteLabel) {
      query.whiteLabelDomain = req.whiteLabel.domain;
    }

    const analytics = await Analytics.find(query)
      .select('aiInsights')
      .sort('-period.start')
      .limit(1);

    // Generate new insights if none exist or if refresh requested
    if (!analytics.length || req.query.refresh === 'true') {
      const insights = await aiService.generateAnalyticsInsights(query);
      
      const newAnalytics = await Analytics.findOneAndUpdate(
        query,
        { aiInsights: insights },
        { new: true, upsert: true }
      );

      return res.status(200).json({
        success: true,
        data: newAnalytics.aiInsights
      });
    }

    res.status(200).json({
      success: true,
      data: analytics[0].aiInsights
    });
  } catch (error) {
    next(error);
  }
});

// Export analytics report
router.post('/export', protect, async (req, res, next) => {
  try {
    const query = {};

    // Filter by artist if not admin
    if (req.user.role !== 'admin') {
      query.artist = req.user._id;
    }

    // Add white label domain filter if applicable
    if (req.whiteLabel) {
      query.whiteLabelDomain = req.whiteLabel.domain;
    }

    // Add date range filter
    if (req.body.startDate) {
      query['period.start'] = { $gte: new Date(req.body.startDate) };
    }
    if (req.body.endDate) {
      query['period.end'] = { $lte: new Date(req.body.endDate) };
    }

    const analytics = await Analytics.find(query)
      .populate('song', 'title')
      .sort('-period.start');

    // Generate report based on format
    const format = req.body.format || 'json';
    let report;

    switch (format) {
      case 'csv':
        report = generateCSVReport(analytics);
        res.header('Content-Type', 'text/csv');
        res.attachment('analytics.csv');
        break;
      case 'pdf':
        report = await generatePDFReport(analytics);
        res.header('Content-Type', 'application/pdf');
        res.attachment('analytics.pdf');
        break;
      default:
        report = analytics;
        res.header('Content-Type', 'application/json');
    }

    res.send(report);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
