const express = require('express');
const router = express.Router();
const { protect, authorize, checkPermission } = require('../middleware/auth');
const Contract = require('../models/Contract');
const Song = require('../models/Song');
const aiService = require('../utils/aiService');
const emailService = require('../utils/emailService');
const ErrorResponse = require('../utils/errorResponse');

// Create contract
router.post('/', protect, checkPermission('manage_contracts'), async (req, res, next) => {
  try {
    const {
      type,
      songs,
      terms,
      rights,
      platforms
    } = req.body;

    // Validate songs ownership
    if (songs && songs.length > 0) {
      const songsCheck = await Song.find({
        _id: { $in: songs },
        artist: req.user._id
      });

      if (songsCheck.length !== songs.length) {
        return next(new ErrorResponse('Not authorized to create contract for some songs', 403));
      }
    }

    // Create contract
    const contract = await Contract.create({
      artist: req.user._id,
      type,
      songs,
      terms,
      rights,
      platforms,
      whiteLabelInfo: req.whiteLabel ? {
        domain: req.whiteLabel.domain,
        labelName: req.whiteLabel.branding.name
      } : undefined
    });

    // Generate AI analysis
    const aiAnalysis = await aiService.generateContractAnalysis(contract);
    contract.aiAnalysis = aiAnalysis;
    await contract.save();

    // Update songs with contract reference
    if (songs && songs.length > 0) {
      await Song.updateMany(
        { _id: { $in: songs } },
        { 'distribution.contract': contract._id }
      );
    }

    res.status(201).json({
      success: true,
      data: contract
    });
  } catch (error) {
    next(error);
  }
});

// Get all contracts
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

    const contracts = await Contract.find(query)
      .populate('artist', 'name email')
      .populate('songs')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: contracts.length,
      data: contracts
    });
  } catch (error) {
    next(error);
  }
});

// Get single contract
router.get('/:id', protect, async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('artist', 'name email')
      .populate('songs');

    if (!contract) {
      return next(new ErrorResponse('Contract not found', 404));
    }

    // Check ownership or admin
    if (contract.artist._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to access this contract', 403));
    }

    res.status(200).json({
      success: true,
      data: contract
    });
  } catch (error) {
    next(error);
  }
});

// Update contract
router.put('/:id', protect, async (req, res, next) => {
  try {
    let contract = await Contract.findById(req.params.id);

    if (!contract) {
      return next(new ErrorResponse('Contract not found', 404));
    }

    // Check ownership or admin
    if (contract.artist.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this contract', 403));
    }

    // Check if contract is modifiable
    if (contract.status !== 'draft' && req.user.role !== 'admin') {
      return next(new ErrorResponse('Contract cannot be modified after activation', 400));
    }

    // Update fields
    const allowedUpdates = ['terms', 'rights', 'platforms'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        contract[field] = req.body[field];
      }
    });

    // Add history entry
    contract.addHistoryEntry('updated', req.user._id, req.body, req.body.notes);

    await contract.save();

    res.status(200).json({
      success: true,
      data: contract
    });
  } catch (error) {
    next(error);
  }
});

// Sign contract
router.post('/:id/sign', protect, async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return next(new ErrorResponse('Contract not found', 404));
    }

    // Check authorization
    if (contract.artist.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to sign this contract', 403));
    }

    // Sign contract
    if (req.user.role === 'admin') {
      contract.signatures.label = {
        signed: true,
        date: new Date(),
        ip: req.ip,
        signature: req.body.signature
      };
    } else {
      contract.signatures.artist = {
        signed: true,
        date: new Date(),
        ip: req.ip,
        signature: req.body.signature
      };
    }

    // Check if both parties have signed
    if (contract.signatures.artist?.signed && contract.signatures.label?.signed) {
      contract.status = 'active';
      contract.terms.startDate = new Date();
      
      // Generate PDF
      await contract.generatePDF();

      // Send email notifications
      await emailService.sendContractSignedEmail(
        await User.findById(contract.artist),
        contract
      );
    }

    // Add history entry
    contract.addHistoryEntry('signed', req.user._id);

    await contract.save();

    res.status(200).json({
      success: true,
      data: contract
    });
  } catch (error) {
    next(error);
  }
});

// Terminate contract
router.post('/:id/terminate', protect, authorize('admin'), async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return next(new ErrorResponse('Contract not found', 404));
    }

    contract.status = 'terminated';
    contract.addHistoryEntry('terminated', req.user._id, null, req.body.reason);

    await contract.save();

    // Update associated songs
    await Song.updateMany(
      { 'distribution.contract': contract._id },
      { $unset: { 'distribution.contract': '' } }
    );

    res.status(200).json({
      success: true,
      data: contract
    });
  } catch (error) {
    next(error);
  }
});

// Get contract history
router.get('/:id/history', protect, async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return next(new ErrorResponse('Contract not found', 404));
    }

    // Check ownership or admin
    if (contract.artist.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to access this contract', 403));
    }

    res.status(200).json({
      success: true,
      data: contract.history
    });
  } catch (error) {
    next(error);
  }
});

// Get AI analysis
router.get('/:id/analysis', protect, async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return next(new ErrorResponse('Contract not found', 404));
    }

    // Check ownership or admin
    if (contract.artist.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to access this contract', 403));
    }

    // Generate new analysis if needed
    if (!contract.aiAnalysis || req.query.refresh === 'true') {
      contract.aiAnalysis = await aiService.generateContractAnalysis(contract);
      await contract.save();
    }

    res.status(200).json({
      success: true,
      data: contract.aiAnalysis
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
