const request = require('supertest');
const app = require('../../backend/server');
const Notification = require('../../backend/models/Notification');
const User = require('../../backend/models/User');

describe('Notifications Routes', () => {
  let user;
  let token;

  beforeEach(async () => {
    user = await global.createTestUser();
    token = global.generateAuthToken(user);
  });

  describe('GET /api/notifications', () => {
    beforeEach(async () => {
      // Create test notifications
      await Notification.create([
        {
          recipient: user._id,
          type: 'song_upload',
          title: 'Song Upload Complete',
          message: 'Your song has been processed successfully',
          status: 'unread',
          priority: 'normal',
          metadata: {
            songId: '507f1f77bcf86cd799439011'
          }
        },
        {
          recipient: user._id,
          type: 'earnings_update',
          title: 'New Earnings Available',
          message: 'You have new earnings to review',
          status: 'unread',
          priority: 'high',
          metadata: {
            amount: 100
          }
        },
        {
          recipient: user._id,
          type: 'system_update',
          title: 'System Maintenance',
          message: 'Scheduled maintenance notice',
          status: 'read',
          priority: 'low'
        }
      ]);
    });

    it('should get all notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0]).toHaveProperty('title');
      expect(res.body.data[0]).toHaveProperty('message');
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .query({ status: 'unread' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every(n => n.status === 'unread')).toBe(true);
    });

    it('should limit results', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/notifications/unread', () => {
    beforeEach(async () => {
      await Notification.create([
        {
          recipient: user._id,
          type: 'contract_signed',
          title: 'Contract Signed',
          message: 'Your contract has been signed',
          status: 'unread'
        },
        {
          recipient: user._id,
          type: 'payout_processed',
          title: 'Payout Processed',
          message: 'Your payout has been processed',
          status: 'unread'
        }
      ]);
    });

    it('should get unread count', async () => {
      const res = await request(app)
        .get('/api/notifications/unread')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBe(2);
    });
  });

  describe('GET /api/notifications/summary', () => {
    beforeEach(async () => {
      await Notification.create([
        {
          recipient: user._id,
          type: 'song_upload',
          priority: 'high',
          status: 'unread'
        },
        {
          recipient: user._id,
          type: 'earnings_update',
          priority: 'normal',
          status: 'unread'
        },
        {
          recipient: user._id,
          type: 'system_update',
          priority: 'low',
          status: 'read'
        }
      ]);
    });

    it('should get notifications summary', async () => {
      const res = await request(app)
        .get('/api/notifications/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('unreadCount');
      expect(res.body.data).toHaveProperty('highPriorityCount');
      expect(res.body.data).toHaveProperty('latestNotification');
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    let notification;

    beforeEach(async () => {
      notification = await Notification.create({
        recipient: user._id,
        type: 'song_upload',
        title: 'Song Upload Complete',
        message: 'Your song has been processed',
        status: 'unread'
      });
    });

    it('should mark notification as read', async () => {
      const res = await request(app)
        .put(`/api/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('read');
      expect(res.body.data.readAt).toBeDefined();
    });

    it('should not allow marking other users\' notifications', async () => {
      const otherUser = await global.createTestUser({ email: 'other@example.com' });
      const otherToken = global.generateAuthToken(otherUser);

      const res = await request(app)
        .put(`/api/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    beforeEach(async () => {
      await Notification.create([
        {
          recipient: user._id,
          type: 'song_upload',
          status: 'unread'
        },
        {
          recipient: user._id,
          type: 'earnings_update',
          status: 'unread'
        }
      ]);
    });

    it('should mark all notifications as read', async () => {
      const res = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const unreadCount = await Notification.countDocuments({
        recipient: user._id,
        status: 'unread'
      });
      expect(unreadCount).toBe(0);
    });
  });

  describe('PUT /api/notifications/:id/archive', () => {
    let notification;

    beforeEach(async () => {
      notification = await Notification.create({
        recipient: user._id,
        type: 'system_update',
        status: 'read'
      });
    });

    it('should archive notification', async () => {
      const res = await request(app)
        .put(`/api/notifications/${notification._id}/archive`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('archived');
      expect(res.body.data.archivedAt).toBeDefined();
    });
  });

  describe('PUT /api/notifications/archive-all', () => {
    beforeEach(async () => {
      await Notification.create([
        {
          recipient: user._id,
          type: 'song_upload',
          status: 'read'
        },
        {
          recipient: user._id,
          type: 'earnings_update',
          status: 'read'
        }
      ]);
    });

    it('should archive all notifications', async () => {
      const res = await request(app)
        .put('/api/notifications/archive-all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const nonArchivedCount = await Notification.countDocuments({
        recipient: user._id,
        status: { $ne: 'archived' }
      });
      expect(nonArchivedCount).toBe(0);
    });
  });

  describe('PUT /api/notifications/preferences', () => {
    it('should update notification preferences', async () => {
      const preferences = {
        songUploads: true,
        earnings: true,
        contractUpdates: false,
        systemUpdates: true
      };

      const res = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send(preferences);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(preferences);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.settings.emailNotifications).toEqual(preferences);
    });
  });

  describe('POST /api/notifications/push/subscribe', () => {
    it('should subscribe to push notifications', async () => {
      const subscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/123',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key'
        }
      };

      const res = await request(app)
        .post('/api/notifications/push/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send({ subscription });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.pushSubscriptions).toHaveLength(1);
      expect(updatedUser.pushSubscriptions[0].endpoint).toBe(subscription.endpoint);
    });
  });

  describe('POST /api/notifications/push/unsubscribe', () => {
    beforeEach(async () => {
      user.pushSubscriptions = [{
        endpoint: 'https://fcm.googleapis.com/fcm/send/123',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key'
        }
      }];
      await user.save();
    });

    it('should unsubscribe from push notifications', async () => {
      const res = await request(app)
        .post('/api/notifications/push/unsubscribe')
        .set('Authorization', `Bearer ${token}`)
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.pushSubscriptions).toHaveLength(0);
    });
  });

  describe('POST /api/notifications/test', () => {
    it('should create test notification', async () => {
      const res = await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('type', 'system_update');
      expect(res.body.data).toHaveProperty('title', 'Test Notification');
    });
  });
});
