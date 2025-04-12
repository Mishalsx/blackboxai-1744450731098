const request = require('supertest');
const app = require('../../backend/server');
const AIService = require('../../backend/models/AIService');
const aiService = require('../../backend/utils/aiService');

describe('AI Routes', () => {
  let user;
  let token;
  let song;

  beforeEach(async () => {
    // Create test user and song
    user = await global.createTestUser();
    token = global.generateAuthToken(user);
    song = await global.createTestSong(user);

    // Mock AI service responses
    aiService.generateArtwork.mockResolvedValue([
      {
        url: 'https://storage.com/artwork/generated-1.jpg',
        prompt: 'album cover art',
        style: 'digital art'
      }
    ]);

    aiService.analyzeAudio.mockResolvedValue({
      audioFeatures: {
        tempo: 120,
        key: 'C',
        mode: 'major',
        timeSignature: '4/4',
        duration: 180,
        loudness: -8
      },
      genreConfidence: [
        { genre: 'pop', confidence: 0.8 },
        { genre: 'electronic', confidence: 0.6 }
      ],
      moodAnalysis: [
        { mood: 'energetic', confidence: 0.9 },
        { mood: 'happy', confidence: 0.7 }
      ]
    });

    aiService.generateMarketingRecommendations.mockResolvedValue({
      campaigns: [
        {
          type: 'social_media',
          platform: 'instagram',
          strategy: 'Create engaging visual content'
        }
      ],
      targetAudience: {
        demographics: ['18-24', '25-34'],
        interests: ['pop music', 'dance']
      }
    });

    aiService.generateMetadata.mockResolvedValue({
      tags: ['pop', 'electronic', 'upbeat'],
      description: 'A catchy pop song with electronic elements',
      keywords: ['dance', 'summer', 'party']
    });

    aiService.analyzeTrends.mockResolvedValue({
      currentTrends: ['tropical house', 'afrobeats'],
      predictions: ['rising popularity in latin pop'],
      opportunities: ['collaboration potential'],
      risks: ['market saturation']
    });
  });

  describe('POST /api/ai/artwork', () => {
    it('should generate artwork successfully', async () => {
      const res = await request(app)
        .post('/api/ai/artwork')
        .set('Authorization', `Bearer ${token}`)
        .send({
          prompt: 'Create a modern album cover',
          style: 'digital art',
          songId: song._id
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('url');
      expect(aiService.generateArtwork).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Create a modern album cover',
          style: 'digital art'
        })
      );
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/ai/artwork')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/ai/analyze-audio', () => {
    it('should analyze audio content successfully', async () => {
      const res = await request(app)
        .post('/api/ai/analyze-audio')
        .set('Authorization', `Bearer ${token}`)
        .send({ songId: song._id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('audioFeatures');
      expect(res.body.data).toHaveProperty('genreConfidence');
      expect(res.body.data).toHaveProperty('moodAnalysis');
    });

    it('should handle non-existent song', async () => {
      const res = await request(app)
        .post('/api/ai/analyze-audio')
        .set('Authorization', `Bearer ${token}`)
        .send({ songId: '5f7d3a2b1c9d8b4a3c2e1f0a' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/ai/marketing', () => {
    it('should generate marketing recommendations', async () => {
      const res = await request(app)
        .post('/api/ai/marketing')
        .set('Authorization', `Bearer ${token}`)
        .send({ songId: song._id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('campaigns');
      expect(res.body.data).toHaveProperty('targetAudience');
    });

    it('should require song ownership', async () => {
      const otherUser = await global.createTestUser({ email: 'other@example.com' });
      const otherToken = global.generateAuthToken(otherUser);

      const res = await request(app)
        .post('/api/ai/marketing')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ songId: song._id });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/ai/metadata', () => {
    it('should generate metadata successfully', async () => {
      const res = await request(app)
        .post('/api/ai/metadata')
        .set('Authorization', `Bearer ${token}`)
        .send({ songId: song._id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('tags');
      expect(res.body.data).toHaveProperty('description');
      expect(res.body.data).toHaveProperty('keywords');
    });
  });

  describe('POST /api/ai/trends', () => {
    it('should analyze trends successfully', async () => {
      const res = await request(app)
        .post('/api/ai/trends')
        .set('Authorization', `Bearer ${token}`)
        .send({
          data: {
            genre: 'pop',
            region: 'global',
            timeframe: '6months'
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('currentTrends');
      expect(res.body.data).toHaveProperty('predictions');
      expect(res.body.data).toHaveProperty('opportunities');
    });
  });

  describe('GET /api/ai/history', () => {
    beforeEach(async () => {
      // Create some AI service history
      await AIService.create({
        user: user._id,
        type: 'artwork_generation',
        status: 'completed',
        result: {
          url: 'https://storage.com/artwork/test.jpg'
        }
      });
    });

    it('should get AI service history', async () => {
      const res = await request(app)
        .get('/api/ai/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('type', 'artwork_generation');
    });

    it('should filter history by type', async () => {
      const res = await request(app)
        .get('/api/ai/history')
        .query({ type: 'artwork_generation' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('artwork_generation');
    });
  });

  describe('POST /api/ai/:id/retry', () => {
    let failedService;

    beforeEach(async () => {
      failedService = await AIService.create({
        user: user._id,
        type: 'content_analysis',
        status: 'failed',
        result: {
          error: 'Processing error'
        }
      });
    });

    it('should retry failed AI service', async () => {
      const res = await request(app)
        .post(`/api/ai/${failedService._id}/retry`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('pending');
    });

    it('should only allow retrying failed services', async () => {
      const completedService = await AIService.create({
        user: user._id,
        type: 'metadata_generation',
        status: 'completed'
      });

      const res = await request(app)
        .post(`/api/ai/${completedService._id}/retry`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
