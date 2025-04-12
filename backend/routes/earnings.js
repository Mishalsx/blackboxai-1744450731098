const express = require('express');
const router = express.Router();
const { protect, authorize, checkPermission } = require('../middleware/auth');
const Earnings = require('../models/Earnings');
const Song = require('../models/Song');
const paymentService = require('../utils/paymentService');
const emailService = require('../utils/emailService');
const ErrorResponse = require('../utils/errorResponse');

// Get earnings summary
router.get('/summary', protect, async (req, res, next) => {
  try {
    const query = {
      user: req.user._id
    };

    // Add white label domain filter if applicable
    if (req.whiteLabel) {
      query.whiteLabelDomain = req.whiteLabel.domain;
    }

    // Get period from query params or default to current month
    const period = req.query.period || new Date().toISOString().slice(0, 7); // YYYY-MM
    query.period = period;

    const summary = await Earnings.getEarningsSummary(req.user._id, period);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
});

// Get earnings history
router.get('/history', protect, async (req, res, next) => {
  try {
    const query = {
      user: req.user._id
    };

    // Add white label domain filter if applicable
    if (req.whiteLabel) {
      query.whiteLabelDomain = req.whiteLabel.domain;
    }

    // Add date range filter if provided
    if (req.query.startDate && req.query.endDate) {
      query.period = {
        $gte: req.query.startDate,
        $lte: req.query.endDate
      };
    }

    const earnings = await Earnings.find(query)
      .populate('song', 'title')
      .sort('-period');

    res.status(200).json({
      success: true,
      count: earnings.length,
      data: earnings
    });
  } catch (error) {
    next(error);
  }
});

// Get song earnings
router.get('/song/:songId', protect, async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.songId);

    if (!song) {
      return next(new ErrorResponse('Song not found', 404));
    }

    // Check ownership
    if (song.artist.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to access these earnings', 403));
    }

    const earnings = await Earnings.find({ song: req.params.songId })
      .sort('-period');

    res.status(200).json({
      success: true,
      count: earnings.length,
      data: earnings
    });
  } catch (error) {
    next(error);
  }
});

// Request payout
router.post('/payout', protect, async (req, res, next) => {
  try {
    const {
      amount,
      method,
      currency = 'USD'
    } = req.body;

    // Get user's available balance
    const availableBalance = await Earnings.aggregate([
      {
        $match: {
          user: req.user._id,
          'earnings.available': { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$earnings.available' }
        }
      }
    ]);

    const totalAvailable = availableBalance[0]?.total || 0;

    if (amount > totalAvailable) {
      return next(new ErrorResponse('Insufficient available balance', 400));
    }

    let payoutResult;

    // Process payout based on method
    switch (method) {
      case 'paypal':
        payoutResult = await paymentService.processPayout(req.user, amount, currency);
        break;
      
      case 'bank_transfer':
        if (!req.user.bankDetails) {
          return next(new ErrorResponse('Bank details not provided', 400));
        }
        payoutResult = await paymentService.processBankTransfer(req.user, amount, req.user.bankDetails);
        break;
      
      default:
        return next(new ErrorResponse('Invalid payout method', 400));
    }

    // Update earnings records
    const earningsToUpdate = await Earnings.find({
      user: req.user._id,
      'earnings.available': { $gt: 0 }
    }).sort('period');

    let remainingAmount = amount;

    for (const earning of earningsToUpdate) {
      if (remainingAmount <= 0) break;

      const availableAmount = earning.earnings.available;
      const amountToDeduct = Math.min(availableAmount, remainingAmount);

      earning.earnings.available -= amountToDeduct;
      earning.earnings.withdrawn += amountToDeduct;
      
      earning.payouts.push({
        amount: amountToDeduct,
        method,
        status: 'completed',
        transactionId: payoutResult.transferId || payoutResult.batchId,
        processedAt: new Date()
      });

      await earning.save();
      remainingAmount -= amountToDeduct;
    }

    // Send confirmation email
    await emailService.sendPayoutConfirmationEmail(req.user, {
      amount,
      method,
      transactionId: payoutResult.transferId || payoutResult.batchId,
      processedAt: new Date()
    });

    res.status(200).json({
      success: true,
      data: payoutResult
    });
  } catch (error) {
    next(error);
  }
});

// Get payout history
router.get('/payouts', protect, async (req, res, next) => {
  try {
    const payouts = await Earnings.aggregate([
      {
        $match: {
          user: req.user._id,
          'payouts.0': { $exists: true }
        }
      },
      {
        $unwind: '$payouts'
      },
      {
        $sort: {
          'payouts.processedAt': -1
        }
      },
      {
        $group: {
          _id: null,
          payouts: { $push: '$payouts' },
          total: { $sum: '$payouts.amount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: payouts[0] || { payouts: [], total: 0 }
    });
  } catch (error) {
    next(error);
  }
});

// Get earnings analytics
router.get('/analytics', protect, async (req, res, next) => {
  try {
    const period = req.query.period || 'monthly'; // daily, monthly, yearly
    const startDate = req.query.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate || new Date();

    const analytics = await Earnings.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                {
                  case: { $eq: [period, 'daily'] },
                  then: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                },
                {
                  case: { $eq: [period, 'monthly'] },
                  then: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
                }
              ],
              default: { $dateToString: { format: '%Y', date: '$createdAt' } }
            }
          },
          total: { $sum: '$earnings.total' },
          platforms: {
            $push: {
              name: '$platforms.name',
              amount: '$platforms.amount'
            }
          }
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

module.exports = router;
