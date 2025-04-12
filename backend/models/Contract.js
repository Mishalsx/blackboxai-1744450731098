const mongoose = require('mongoose');
const crypto = require('crypto');

const contractSchema = new mongoose.Schema({
  contractId: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(10).toString('hex').toUpperCase()
  },
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  songs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song'
  }],
  type: {
    type: String,
    enum: ['single', 'album', 'ep', 'distribution', 'label'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'expired', 'terminated'],
    default: 'draft'
  },
  terms: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: Date,
    territory: {
      type: [String],
      default: ['worldwide']
    },
    exclusivity: {
      type: Boolean,
      default: true
    },
    revenueSplit: {
      artist: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      platform: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      label: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    }
  },
  rights: {
    mechanical: Boolean,
    performance: Boolean,
    synchronization: Boolean,
    digital: Boolean,
    streaming: Boolean,
    download: Boolean
  },
  platforms: [{
    name: String,
    enabled: {
      type: Boolean,
      default: true
    },
    customTerms: {
      revenueSplit: Number,
      minimumPrice: Number
    }
  }],
  signatures: {
    artist: {
      signed: Boolean,
      date: Date,
      ip: String,
      signature: String
    },
    label: {
      signed: Boolean,
      date: Date,
      ip: String,
      signature: String
    }
  },
  documents: [{
    type: {
      type: String,
      enum: ['contract', 'addendum', 'termination', 'rights'],
      required: true
    },
    url: String,
    version: Number,
    createdAt: Date
  }],
  whiteLabelInfo: {
    domain: String,
    labelName: String,
    customTerms: mongoose.Schema.Types.Mixed
  },
  aiAnalysis: {
    summary: String,
    recommendations: [String],
    riskAssessment: {
      level: String,
      factors: [String]
    }
  },
  history: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'signed', 'activated', 'terminated']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: Date,
    changes: mongoose.Schema.Types.Mixed,
    notes: String
  }],
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    version: {
      type: Number,
      default: 1
    },
    language: {
      type: String,
      default: 'en'
    }
  }
}, {
  timestamps: true
});

// Validate revenue split total equals 100%
contractSchema.pre('save', function(next) {
  const total = this.terms.revenueSplit.artist + 
                this.terms.revenueSplit.platform + 
                this.terms.revenueSplit.label;
  
  if (total !== 100) {
    next(new Error('Revenue split must total 100%'));
  }
  next();
});

// Generate PDF contract
contractSchema.methods.generatePDF = async function() {
  // Implementation for generating PDF contract
  // This would use a PDF generation library like PDFKit
  // and include all contract terms, signatures, etc.
};

// Check if contract is valid
contractSchema.methods.isValid = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.terms.startDate <= now && 
         (!this.terms.endDate || this.terms.endDate > now);
};

// Add contract history entry
contractSchema.methods.addHistoryEntry = function(action, user, changes = null, notes = '') {
  this.history.push({
    action,
    user,
    date: new Date(),
    changes,
    notes
  });
};

// Get contract summary using AI
contractSchema.methods.getAISummary = async function() {
  // Implementation for generating AI summary of contract terms
  // This would use OpenAI or similar service to analyze and summarize
};

module.exports = mongoose.model('Contract', contractSchema);
