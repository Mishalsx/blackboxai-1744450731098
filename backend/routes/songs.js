const express = require('express');
const router = express.Router();
const { protect, authorize, checkPermission } = require('../middleware/auth');
const Song = require('../models/Song');
const AIService = require('../models/AIService');
const Analytics = require('../models/Analytics');
const Contract = require('../models/Contract');
const storageService = require('../utils/storageService');
const aiService = require('../utils/aiService');
const ErrorResponse = require('../utils/errorResponse');

// Upload song
router.post('/', protect, checkPermission('upload_songs'), async (req, res, next) => {
  try {
    const {
      title,
      album,
      genre,
      releaseDate,
      isrc,
      upc,
      lyrics,
      credits,
      titleTranslations
    } = req.body;

    // Upload audio file
    const audioFile = await storageService.uploadAudio(req.files.audio, {
      duration: req.body.duration
    });

    // Generate or upload artwork
    let artwork;
    if (req.files.artwork) {
      artwork = await storageService.uploadImage(req.files.artwork, {
        width: 3000,
        height: 3000
      });
    } else {
      // Generate artwork using AI
      const artworkGeneration = await aiService.generateArtwork({
        prompt: `Album artwork for "${title}" by ${req.user.name}`,
        artist: req.user,
        song: null
      });
      artwork = {
        url: artworkGeneration[0].url,
        generatedByAI: true,
        prompt: artworkGeneration[0].prompt
      };
    }

    // Create song
    const song = await Song.create({
      title,
      artist: req.user._id,
      album,
      genre,
      releaseDate,
      isrc,
      upc,
      audioFile,
      artwork,
      lyrics,
      credits,
      whiteLabelInfo: req.whiteLabel ? {
        domain: req.whiteLabel.domain,
        labelName: req.whiteLabel.branding.name
      } : undefined
    });

    // Generate metadata using AI
    const aiMetadata = await aiService.generateMetadata(song);
    song.metadata = aiMetadata;

    // Analyze audio content
    const contentAnalysis = await aiService.analyzeAudio(req.files.audio.buffer, {
      userId: req.user._id,
      songId: song._id
    });
    song.aiAnalysis = contentAnalysis;

    await song.save();

    // Create contract
    const contract = await Contract.create({
      artist: req.user._id,
      songs: [song._id],
      type: album ? 'album' : 'single',
      terms: {
        startDate: new Date(),
        territory: ['worldwide'],
        revenueSplit: {
          artist: 80,
          platform: 20
        }
      },
      rights: {
        mechanical: true,
        performance: true,
        digital: true,
        streaming: true,
        download: true
      }
    });

    song.distribution.contract = contract._id;
    await song.save();

    res.status(201).json({
      success: true,
      data: song
    });
  } catch (error) {
    next(error);
  }
});

// Get all songs
router.get('/', protect, async (req, res, next) => {
  try {
    const query = {};

    // Filter by artist if not admin
    if (req.user.role !== 'admin') {
      query.artist = req.user._id;
    }

    // Add white label domain filter if applicable
    if (req.whiteLabel) {
      query['whiteLabelInfo.domain'] = req.whiteLabel.domain;
    }

    const songs = await Song.find(query)
      .populate('artist', 'name email')
      .populate('distribution.contract')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: songs.length,
      data: songs
    });
  } catch (error) {
    next(error);
  }
});

// Get single song
router.get('/:id', protect, async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate('artist', 'name email')
      .populate('distribution.contract');

    if (!song) {
      return next(new ErrorResponse('Song not found', 404));
    }

    // Check ownership or admin
    if (song.artist._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to access this song', 403));
    }

    res.status(200).json({
      success: true,
      data: song
    });
  } catch (error) {
    next(error);
  }
});

// Update song
router.put('/:id', protect, async (req, res, next) => {
  try {
    let song = await Song.findById(req.params.id);

    if (!song) {
      return next(new ErrorResponse('Song not found', 404));
    }

    // Check ownership
    if (song.artist.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this song', 403));
    }

    // Update fields
    const allowedUpdates = ['title', 'album', 'genre', 'releaseDate', 'lyrics', 'credits'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        song[field] = req.body[field];
      }
    });

    // Update artwork if provided
    if (req.files && req.files.artwork) {
      const artwork = await storageService.uploadImage(req.files.artwork, {
        width: 3000,
        height: 3000
      });
      song.artwork = artwork;
    }

    await song.save();

    res.status(200).json({
      success: true,
      data: song
    });
  } catch (error) {
    next(error);
  }
});

// Delete song
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return next(new ErrorResponse('Song not found', 404));
    }

    // Check ownership
    if (song.artist.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this song', 403));
    }

    // Delete associated files
    await storageService.deleteFile(song.audioFile.key);
    if (song.artwork && !song.artwork.generatedByAI) {
      await storageService.deleteFile(song.artwork.key);
    }

    await song.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
});

// Get song analytics
router.get('/:id/analytics', protect, async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return next(new ErrorResponse('Song not found', 404));
    }

    // Check ownership
    if (song.artist.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to access this song\'s analytics', 403));
    }

    const analytics = await Analytics.find({ song: req.params.id })
      .sort('-period.start');

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

// Generate AI recommendations
router.post('/:id/recommendations', protect, async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return next(new ErrorResponse('Song not found', 404));
    }

    // Check ownership
    if (song.artist.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to access this song', 403));
    }

    const analytics = await Analytics.find({ song: req.params.id });
    const recommendations = await aiService.generateMarketingRecommendations(song, analytics);
    
    // New logic for playlist suggestions
    const playlistSuggestions = await aiService.generatePlaylistSuggestions(song);

    res.status(200).json({
      success: true,
      data: {
        recommendations,
        playlistSuggestions
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update distribution status
router.put('/:id/distribution', protect, authorize('admin'), async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return next(new ErrorResponse('Song not found', 404));
    }

    song.distribution.status = req.body.status;
    if (req.body.platforms) {
      song.distribution.platforms = req.body.platforms;
    }

    await song.save();

    res.status(200).json({
      success: true,
      data: song
    });
  } catch (error) {
    next(error);
  }
});

// Request withdrawal
router.post('/:id/withdraw', protect, async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return next(new ErrorResponse('Song not found', 404));
    }

    // Check ownership
    if (song.artist.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Not authorized to request withdrawal for this song', 403));
    }

    // Logic for processing withdrawal request
    const amount = req.body.amount; // Amount to withdraw
    if (amount > song.earnings.pending) {
      return next(new ErrorResponse('Insufficient pending earnings for withdrawal', 400));
    }

    // Update earnings
    song.earnings.pending -= amount;
    song.earnings.pendingWithdrawals.push({
      amount,
      date: new Date(),
      status: 'pending'
    });

    await song.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Withdrawal request submitted successfully',
        amount
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
