const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/auth');
const AIService = require('../models/AIService');
const Song = require('../models/Song');
const aiService = require('../utils/aiService');
const ErrorResponse = require('../utils/errorResponse');

// Generate artwork
router.post('/artwork', protect, checkPermission('use_ai_tools'), async (req, res, next) => {
  try {
    const { prompt, style, songId } = req.body;

    let song;
    if (songId) {
      song = await Song.findById(songId);
      if (!song) {
        return next(new ErrorResponse('Song not found', 404));
      }

      // Check ownership
      if (song.artist.toString() !== req.user._id.toString()) {
        return next(new ErrorResponse('Not authorized to generate artwork for this song', 403));
      }
    }

    const generations = await aiService.generateArtwork({
      prompt,
      style,
      artist: req.user,
      song
    });

    res.status(200).json({
      success: true,
      data: generations
    });
  } catch (error) {
    next(error);
  }
});

// Analyze audio content
router.post('/analyze-audio', protect, checkPermission('use_ai_tools'), async (req, res, next) => {
  try {
    const { songId } = req.body;

    const song = await Song.findById(songId);
    if (!song) {
      return next(new ErrorResponse('Song not found', 404));
    }

    // Check ownership
    if (song.artist.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Not authorized to analyze this song', 403));
    }

    const analysis = await aiService.analyzeAudio(song.audioFile.url, {
      userId: req.user._id,
      songId: song._id
    });

    // Update song with analysis results
    song.aiAnalysis = analysis;
    await song.save();

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    next(error);
  }
});

// Generate marketing recommendations
router.post('/marketing', protect, checkPermission('use_ai_tools'), async (req, res, next) => {
  try {
    const { songId } = req.body;

    const song = await Song.findById(songId)
      .populate('analytics');
    
    if (!song) {
      return next(new ErrorResponse('Song not found', 404));
    }

    // Check ownership
    if (song.artist.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Not authorized to generate recommendations for this song', 403));
    }

    const recommendations = await aiService.generateMarketingRecommendations(song, song.analytics);

    res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
});

// Generate metadata
router.post('/metadata', protect, checkPermission('use_ai_tools'), async (req, res, next) => {
  try {
    const { songId } = req.body;

    const song = await Song.findById(songId);
    if (!song) {
      return next(new ErrorResponse('Song not found', 404));
    }

    // Check ownership
    if (song.artist.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Not authorized to generate metadata for this song', 403));
    }

    const metadata = await aiService.generateMetadata(song);

    // Update song with generated metadata
    song.metadata = {
      ...song.metadata,
      ...metadata
    };
    await song.save();

    res.status(200).json({
      success: true,
      data: metadata
    });
  } catch (error) {
    next(error);
  }
});

// Analyze trends
router.post('/trends', protect, checkPermission('use_ai_tools'), async (req, res, next) => {
  try {
    const analysis = await aiService.analyzeTrends({
      userId: req.user._id,
      data: req.body.data
    });

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    next(error);
  }
});

// Get AI service history
router.get('/history', protect, async (req, res, next) => {
  try {
    const query = {
      user: req.user._id
    };

    // Add filters from query params
    if (req.query.type) {
      query.type = req.query.type;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    // Add white label domain filter if applicable
    if (req.whiteLabel) {
      query.whiteLabelDomain = req.whiteLabel.domain;
    }

    const history = await AIService.find(query)
      .populate('song', 'title')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    next(error);
  }
});

// Get AI service usage stats
router.get('/usage', protect, async (req, res, next) => {
  try {
    const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate || new Date();

    const stats = await AIService.getUsageStats(req.user._id, {
      start: new Date(startDate),
      end: new Date(endDate)
    });

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// Get single AI service result
router.get('/:id', protect, async (req, res, next) => {
  try {
    const aiService = await AIService.findById(req.params.id)
      .populate('song', 'title');

    if (!aiService) {
      return next(new ErrorResponse('AI service not found', 404));
    }

    // Check ownership
    if (aiService.user.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Not authorized to access this AI service', 403));
    }

    res.status(200).json({
      success: true,
      data: aiService
    });
  } catch (error) {
    next(error);
  }
});

// Retry failed AI service
router.post('/:id/retry', protect, async (req, res, next) => {
  try {
    const aiServiceRecord = await AIService.findById(req.params.id);

    if (!aiServiceRecord) {
      return next(new ErrorResponse('AI service not found', 404));
    }

    // Check ownership
    if (aiServiceRecord.user.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Not authorized to retry this AI service', 403));
    }

    // Check if service failed
    if (aiServiceRecord.status !== 'failed') {
      return next(new ErrorResponse('Only failed services can be retried', 400));
    }

    // Reset status and clear error
    aiServiceRecord.status = 'pending';
    aiServiceRecord.result.error = null;
    await aiServiceRecord.save();

    // Process the service again
    await aiServiceRecord.process();

    res.status(200).json({
      success: true,
      data: aiServiceRecord
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
