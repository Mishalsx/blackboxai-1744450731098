const request = require('supertest');
const app = require('../../backend/server');
const WhiteLabel = require('../../backend/models/WhiteLabel');
const User = require('../../backend/models/User');
const storageService = require('../../backend/utils/storageService');

describe('White Label Routes', () => {
  let user;
  let token;
  let adminUser;
  let adminToken;

  beforeEach(async () => {
    // Create test users
    user = await global.createTestUser({ role: 'label' });
    token = global.generateAuthToken(user);

    adminUser = await global.createTestUser({
      email: 'admin@example.com',
      role: 'admin'
    });
    adminToken = global.generateAuthToken(adminUser);

    // Mock storage service responses
    storageService.uploadImage.mockResolvedValue({
      key: 'logos/test-logo.png',
      url: 'https://storage.com/logos/test-logo.png'
    });
  });

  describe('POST /api/white-label', () => {
    const validConfig = {
      domain: 'test-label.com',
      cname: 'custom.test-label.com',
      branding: {
        name: 'Test Label',
        logo: {
          light: 'https://storage.com/logos/light.png',
          dark: 'https://storage.com/logos/dark.png'
        },
        colors: {
          primary: '#007bff',
          secondary: '#6c757d'
        },
        favicon: 'https://storage.com/logos/favicon.ico'
      },
      features: {
        aiTools: true,
        analytics: true,
        customDomain: true
      },
      customization: {
        theme: 'light',
        layout: 'default',
        fontFamily: 'Arial'
      },
      settings: {
        defaultLanguage: 'en',
        timezone: 'UTC',
        currency: 'USD'
      },
      subscription: {
        plan: 'professional',
        status: 'active',
        features: ['custom_domain', 'analytics', 'ai_tools']
      }
    };

    it('should create white label configuration', async () => {
      const res = await request(app)
        .post('/api/white-label')
        .set('Authorization', `Bearer ${token}`)
        .send(validConfig);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('domain', validConfig.domain);
      expect(res.body.data.owner).toBe(user._id.toString());

      // Verify user was updated
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.whiteLabelDomain).toBe(validConfig.domain);
      expect(updatedUser.role).toBe('label');
    });

    it('should validate domain availability', async () => {
      // Create existing white label config
      await WhiteLabel.create({
        ...validConfig,
        owner: adminUser._id
      });

      const res = await request(app)
        .post('/api/white-label')
        .set('Authorization', `Bearer ${token}`)
        .send(validConfig);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already in use');
    });
  });

  describe('GET /api/white-label', () => {
    beforeEach(async () => {
      // Create test white label configurations
      await WhiteLabel.create([
        {
          domain: 'label1.com',
          owner: user._id,
          branding: { name: 'Label 1' }
        },
        {
          domain: 'label2.com',
          owner: adminUser._id,
          branding: { name: 'Label 2' }
        }
      ]);
    });

    it('should get all configurations (admin only)', async () => {
      const res = await request(app)
        .get('/api/white-label')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('should restrict access to non-admin users', async () => {
      const res = await request(app)
        .get('/api/white-label')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/white-label/:domain', () => {
    let whiteLabel;

    beforeEach(async () => {
      whiteLabel = await WhiteLabel.create({
        domain: 'test-label.com',
        owner: user._id,
        branding: { name: 'Test Label' }
      });
    });

    it('should get configuration by domain', async () => {
      const res = await request(app)
        .get(`/api/white-label/${whiteLabel.domain}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.domain).toBe(whiteLabel.domain);
      expect(res.body.data.owner._id).toBe(user._id.toString());
    });
  });

  describe('PUT /api/white-label/:domain', () => {
    let whiteLabel;

    beforeEach(async () => {
      whiteLabel = await WhiteLabel.create({
        domain: 'test-label.com',
        owner: user._id,
        branding: {
          name: 'Test Label',
          colors: { primary: '#000000' }
        }
      });
    });

    it('should update configuration', async () => {
      const updates = {
        branding: {
          ...whiteLabel.branding,
          colors: { primary: '#ffffff' }
        }
      };

      const res = await request(app)
        .put(`/api/white-label/${whiteLabel.domain}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.branding.colors.primary).toBe('#ffffff');
    });

    it('should handle logo uploads', async () => {
      const res = await request(app)
        .put(`/api/white-label/${whiteLabel.domain}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('lightLogo', Buffer.from('fake image data'), 'logo.png')
        .field('branding.name', 'Updated Label');

      expect(res.status).toBe(200);
      expect(storageService.uploadImage).toHaveBeenCalled();
      expect(res.body.data.branding.logo.light).toBeDefined();
    });
  });

  describe('PUT /api/white-label/:domain/subscription', () => {
    let whiteLabel;

    beforeEach(async () => {
      whiteLabel = await WhiteLabel.create({
        domain: 'test-label.com',
        owner: user._id,
        subscription: {
          plan: 'basic',
          status: 'active'
        }
      });
    });

    it('should update subscription (admin only)', async () => {
      const updates = {
        plan: 'professional',
        status: 'active',
        features: ['custom_domain', 'analytics']
      };

      const res = await request(app)
        .put(`/api/white-label/${whiteLabel.domain}/subscription`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscription.plan).toBe('professional');
    });
  });

  describe('GET /api/white-label/:domain/analytics', () => {
    let whiteLabel;

    beforeEach(async () => {
      whiteLabel = await WhiteLabel.create({
        domain: 'test-label.com',
        owner: user._id,
        analytics: {
          totalUsers: 100,
          activeUsers: 50,
          totalRevenue: 1000
        }
      });
    });

    it('should get white label analytics', async () => {
      const res = await request(app)
        .get(`/api/white-label/${whiteLabel.domain}/analytics`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalUsers');
      expect(res.body.data).toHaveProperty('activeUsers');
    });
  });

  describe('POST /api/white-label/:domain/api-keys', () => {
    let whiteLabel;

    beforeEach(async () => {
      whiteLabel = await WhiteLabel.create({
        domain: 'test-label.com',
        owner: user._id
      });
    });

    it('should generate API key', async () => {
      const keyData = {
        name: 'Test API Key',
        permissions: ['read:analytics', 'write:songs']
      };

      const res = await request(app)
        .post(`/api/white-label/${whiteLabel.domain}/api-keys`)
        .set('Authorization', `Bearer ${token}`)
        .send(keyData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.key).toBeDefined();
      expect(res.body.data.name).toBe(keyData.name);
      expect(res.body.data.permissions).toEqual(keyData.permissions);
    });
  });

  describe('PUT /api/white-label/:domain/security', () => {
    let whiteLabel;

    beforeEach(async () => {
      whiteLabel = await WhiteLabel.create({
        domain: 'test-label.com',
        owner: user._id,
        security: {
          twoFactorAuth: false,
          passwordPolicy: { minLength: 8 }
        }
      });
    });

    it('should update security settings', async () => {
      const updates = {
        twoFactorAuth: true,
        passwordPolicy: {
          minLength: 10,
          requireSpecialChars: true
        }
      };

      const res = await request(app)
        .put(`/api/white-label/${whiteLabel.domain}/security`)
        .set('Authorization', `Bearer ${token}`)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.twoFactorAuth).toBe(true);
      expect(res.body.data.passwordPolicy.minLength).toBe(10);
    });
  });

  describe('DELETE /api/white-label/:domain', () => {
    let whiteLabel;

    beforeEach(async () => {
      whiteLabel = await WhiteLabel.create({
        domain: 'test-label.com',
        owner: user._id
      });

      // Create users associated with the white label
      await User.create([
        {
          email: 'user1@test-label.com',
          password: 'password123',
          whiteLabelDomain: 'test-label.com',
          role: 'user'
        },
        {
          email: 'user2@test-label.com',
          password: 'password123',
          whiteLabelDomain: 'test-label.com',
          role: 'user'
        }
      ]);
    });

    it('should delete white label configuration (admin only)', async () => {
      const res = await request(app)
        .delete(`/api/white-label/${whiteLabel.domain}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify white label was deleted
      const deletedWhiteLabel = await WhiteLabel.findOne({ domain: whiteLabel.domain });
      expect(deletedWhiteLabel).toBeNull();

      // Verify associated users were updated
      const users = await User.find({ whiteLabelDomain: whiteLabel.domain });
      expect(users).toHaveLength(0);
    });

    it('should restrict deletion to admin users', async () => {
      const res = await request(app)
        .delete(`/api/white-label/${whiteLabel.domain}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
