const request = require('supertest');
const app = require('../../backend/server');
const User = require('../../backend/models/User');
const Song = require('../../backend/models/Song');
const emailService = require('../../backend/utils/emailService');
const storageService = require('../../backend/utils/storageService');

describe('Users Routes', () => {
  let user;
  let token;
  let adminUser;
  let adminToken;

  beforeEach(async () => {
    // Create test users
    user = await global.createTestUser();
    token = global.generateAuthToken(user);

    adminUser = await global.createTestUser({
      email: 'admin@example.com',
      role: 'admin'
    });
    adminToken = global.generateAuthToken(adminUser);

    // Mock storage service
    storageService.uploadImage.mockResolvedValue({
      key: 'avatars/test-avatar.jpg',
      url: 'https://storage.com/avatars/test-avatar.jpg'
    });
  });

  describe('GET /api/users', () => {
    beforeEach(async () => {
      // Create additional test users
      await User.create([
        {
          email: 'user1@example.com',
          password: 'password123',
          name: 'User One',
          role: 'user'
        },
        {
          email: 'user2@example.com',
          password: 'password123',
          name: 'User Two',
          role: 'label'
        }
      ]);
    });

    it('should get all users (admin only)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(4); // Including admin and test user
      expect(res.body.data[0]).toHaveProperty('email');
      expect(res.body.data[0]).not.toHaveProperty('password');
    });

    it('should filter users by role', async () => {
      const res = await request(app)
        .get('/api/users')
        .query({ role: 'label' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].role).toBe('label');
    });

    it('should restrict access to non-admin users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by id', async () => {
      const res = await request(app)
        .get(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(user._id.toString());
      expect(res.body.data.email).toBe(user.email);
    });

    it('should get own profile', async () => {
      const res = await request(app)
        .get(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(user._id.toString());
    });

    it('should not allow accessing other users\' profiles', async () => {
      const otherUser = await global.createTestUser({ email: 'other@example.com' });
      const otherToken = global.generateAuthToken(otherUser);

      const res = await request(app)
        .get(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user profile', async () => {
      const updates = {
        name: 'Updated Name',
        bio: 'New bio',
        socialLinks: {
          twitter: 'https://twitter.com/updated',
          instagram: 'https://instagram.com/updated'
        }
      };

      const res = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updates.name);
      expect(res.body.data.bio).toBe(updates.bio);
    });

    it('should handle avatar upload', async () => {
      const res = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('avatar', Buffer.from('fake image data'), 'avatar.jpg');

      expect(res.status).toBe(200);
      expect(storageService.uploadImage).toHaveBeenCalled();
      expect(res.body.data.avatar).toBeDefined();
    });

    it('should not allow updating sensitive fields', async () => {
      const res = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'admin',
          email: 'hacked@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/:id/role', () => {
    it('should update user role (admin only)', async () => {
      const res = await request(app)
        .put(`/api/users/${user._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'label' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('label');
    });

    it('should validate role value', async () => {
      const res = await request(app)
        .put(`/api/users/${user._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'invalid_role' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/:id/password', () => {
    it('should update password', async () => {
      const res = await request(app)
        .put(`/api/users/${user._id}/password`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify new password works
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'newpassword123'
        });

      expect(loginRes.status).toBe(200);
    });

    it('should validate current password', async () => {
      const res = await request(app)
        .put(`/api/users/${user._id}/password`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/users/:id/songs', () => {
    beforeEach(async () => {
      // Create test songs
      await Song.create([
        {
          title: 'Song One',
          artist: user._id,
          genre: ['pop']
        },
        {
          title: 'Song Two',
          artist: user._id,
          genre: ['rock']
        }
      ]);
    });

    it('should get user\'s songs', async () => {
      const res = await request(app)
        .get(`/api/users/${user._id}/songs`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('should filter songs by genre', async () => {
      const res = await request(app)
        .get(`/api/users/${user._id}/songs`)
        .query({ genre: 'rock' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].genre).toContain('rock');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user account', async () => {
      const res = await request(app)
        .delete(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify user was deleted
      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });

    it('should allow admin to delete any user', async () => {
      const res = await request(app)
        .delete(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not allow deleting other users', async () => {
      const otherUser = await global.createTestUser({ email: 'other@example.com' });
      const otherToken = global.generateAuthToken(otherUser);

      const res = await request(app)
        .delete(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/users/:id/verify-email', () => {
    it('should verify email address', async () => {
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      const res = await request(app)
        .post(`/api/users/${user._id}/verify-email`)
        .send({ token: verificationToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const verifiedUser = await User.findById(user._id);
      expect(verifiedUser.isVerified).toBe(true);
    });

    it('should handle invalid verification token', async () => {
      const res = await request(app)
        .post(`/api/users/${user._id}/verify-email`)
        .send({ token: 'invalid-token' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/users/:id/resend-verification', () => {
    it('should resend verification email', async () => {
      const res = await request(app)
        .post(`/api/users/${user._id}/resend-verification`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: user.email })
      );
    });
  });
});
