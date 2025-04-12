const request = require('supertest');
const app = require('../../backend/server');
const Analytics = require('../../backend/models/Analytics');
const aiService = require('../../backend/utils/aiService');

describe('Analytics Routes', () => {
  let user;
  let token;
  let song;

  beforeEach(async () => {
    // Create test user and song
    user = await global.createTestUser();
    token = global.generateAuthToken(user);
    song = await global.createTestSong(user);

    // Mock AI service responses
    aiService.generateAnalyticsInsights.mockResolvedValue({
      trends: {
        growth: 'positive',
        rate: '15%',
        factors: ['increased playlist adds', 'viral growth']
      },
      recommendations: [
        'Focus on playlist pitching',
        'Engage with trending topics'
      ]
    });
  });

  describe('GET /api/analytics/overview', () => {
    beforeEach(async () => {
      // Create test analytics data
      await Analytics.create({
        song: song._id,
        artist: user._id,
        period: {
          start: new Date('2023-08-01'),
          end: new Date('2023-08-31')
        },
        totalStats: {
          plays: 10000,
          revenue: 500,
          uniqueListeners: 8000,
          saves: 1500,
          shares: 300,
          playlists: 50
        }
      });
    });

    it('should get overall analytics', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalPlays');
      expect(res.body.data).toHaveProperty('totalRevenue');
      expect(res.body.data).toHaveProperty('uniqueListeners');
    });

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .query({
          startDate: '2023-08-01',
          endDate: '2023-08-31'
        })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalPlays).toBe(10000);
    });
  });

  describe('GET /api/analytics/song/:songId', () => {
    beforeEach(async () => {
      await global.createTestAnalytics(song, {
        totalStats: {
          plays: 5000,
          revenue: 250,
          uniqueListeners: 4000
        },
        demographics: {
          age: [
            { range: '18-24', percentage: 40 },
            { range: '25-34', percentage: 35 }
          ],
          gender: [
            { type: 'male', percentage: 55 },
            { type: 'female', percentage: 45 }
          ]
        }
      });
    });

    it('should get song analytics', async () => {
      const res = await request(app)
        .get(`/api/analytics/song/${song._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0]).toHaveProperty('totalStats');
      expect(res.body.data[0]).toHaveProperty('demographics');
    });

    it('should not allow accessing other users\' song analytics', async () => {
      const otherUser = await global.createTestUser({ email: 'other@example.com' });
      const otherToken = global.generateAuthToken(otherUser);

      const res = await request(app)
        .get(`/api/analytics/song/${song._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/analytics/platforms', () => {
    beforeEach(async () => {
      await Analytics.create({
        song: song._id,
        artist: user._id,
        platforms: [
          { name: 'spotify', plays: 5000, revenue: 250 },
          { name: 'apple_music', plays: 3000, revenue: 150 }
        ]
      });
    });

    it('should get platform analytics', async () => {
      const res = await request(app)
        .get('/api/analytics/platforms')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('plays');
      expect(res.body.data[0]).toHaveProperty('revenue');
    });
  });

  describe('GET /api/analytics/geography', () => {
    beforeEach(async () => {
      await Analytics.create({
        song: song._id,
        artist: user._id,
        demographics: {
          countries: [
            { code: 'US', name: 'United States', plays: 3000, revenue: 150 },
            { code: 'GB', name: 'United Kingdom', plays: 2000, revenue: 100 }
          ]
        }
      });
    });

    it('should get geographic analytics', async () => {
      const res = await request(app)
        .get('/api/analytics/geography')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('country');
      expect(res.body.data[0]).toHaveProperty('plays');
    });
  });

  describe('GET /api/analytics/trends', () => {
    beforeEach(async () => {
      // Create analytics with trend data
      const periods = ['2023-06', '2023-07', '2023-08'];
      for (const period of periods) {
        await Analytics.create({
          song: song._id,
          artist: user._id,
          period: {
            start: new Date(`${period}-01`),
            end: new Date(`${period}-31`)
          },
          trends: {
            daily: [
              { date: `${period}-15`, plays: 1000, revenue: 50 }
            ],
            weekly: [
              { date: `${period}-W2`, plays: 5000, revenue: 250 }
            ],
            monthly: [
              { date: period, plays: 20000, revenue: 1000 }
            ]
          }
        });
      }
    });

    it('should get trend analytics', async () => {
      const res = await request(app)
        .get('/api/analytics/trends')
        .query({ period: 'monthly' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0]).toHaveProperty('plays');
      expect(res.body.data[0]).toHaveProperty('revenue');
    });
  });

  describe('GET /api/analytics/engagement', () => {
    beforeEach(async () => {
      await Analytics.create({
        song: song._id,
        artist: user._id,
        engagement: {
          averageListenTime: 180,
          completionRate: 85,
          skipRate: 15,
          repeatListens: 2.5,
          playlistAddRate: 3,
          socialShares: {
            total: 500,
            platforms: {
              instagram: 200,
              facebook: 150,
              twitter: 150
            }
          }
        }
      });
    });

    it('should get engagement analytics', async () => {
      const res = await request(app)
        .get('/api/analytics/engagement')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('averageListenTime');
      expect(res.body.data).toHaveProperty('completionRate');
      expect(res.body.data).toHaveProperty('socialShares');
    });
  });

  describe('GET /api/analytics/insights', () => {
    beforeEach(async () => {
      await Analytics.create({
        song: song._id,
        artist: user._id,
        aiInsights: {
          trends: {
            growth: 'positive',
            rate: '15%'
          },
          recommendations: [
            'Focus on playlist pitching'
          ]
        }
      });
    });

    it('should get AI insights', async () => {
      const res = await request(app)
        .get('/api/analytics/insights')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('trends');
      expect(res.body.data).toHaveProperty('recommendations');
    });

    it('should generate new insights when requested', async () => {
      const res = await request(app)
        .get('/api/analytics/insights')
        .query({ refresh: 'true' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(aiService.generateAnalyticsInsights).toHaveBeenCalled();
    });
  });

  describe('POST /api/analytics/export', () => {
    beforeEach(async () => {
      await global.createTestAnalytics(song);
    });

    it('should export analytics in JSON format', async () => {
      const res = await request(app)
        .post('/api/analytics/export')
        .set('Authorization', `Bearer ${token}`)
        .send({
          format: 'json',
          startDate: '2023-08-01',
          endDate: '2023-08-31'
        });

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/json');
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should export analytics in CSV format', async () => {
      const res = await request(app)
        .post('/api/analytics/export')
        .set('Authorization', `Bearer ${token}`)
        .send({
          format: 'csv',
          startDate: '2023-08-01',
          endDate: '2023-08-31'
        });

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.header['content-disposition']).toContain('analytics.csv');
    });
  });
});
