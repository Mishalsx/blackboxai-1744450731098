const request = require('supertest');
const app = require('../../backend/server');
const User = require('../../backend/models/User');
const emailService = require('../../backend/utils/emailService');

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    const validUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!'
    };

    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(validUser.email);
      expect(res.body.user.name).toBe(validUser.name);
      expect(res.body.user).not.toHaveProperty('password');

      // Verify user was saved to database
      const user = await User.findOne({ email: validUser.email });
      expect(user).toBeTruthy();
      expect(user.name).toBe(validUser.name);

      // Verify welcome email was sent
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: validUser.email })
      );
    });

    it('should return error for existing email', async () => {
      // Create user first
      await User.create(validUser);

      // Try to register with same email
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Email already registered');
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('required');
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          email: 'invalid-email'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('valid email');
    });

    it('should validate password strength', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          password: 'weak'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('password');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await global.createTestUser();
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
    });

    it('should return error for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid credentials');
    });

    it('should lock account after too many failed attempts', async () => {
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });
      }

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('locked');
    });
  });

  describe('GET /api/auth/me', () => {
    let user;
    let token;

    beforeEach(async () => {
      user = await global.createTestUser();
      token = global.generateAuthToken(user);
    });

    it('should return current user when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(user._id.toString());
      expect(res.body.data.email).toBe(user.email);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      await global.createTestUser();
    });

    it('should send reset password email for valid user', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should not reveal if email exists', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/auth/reset-password/:token', () => {
    let user;
    let resetToken;

    beforeEach(async () => {
      user = await global.createTestUser();
      resetToken = user.generatePasswordResetToken();
      await user.save();
    });

    it('should reset password with valid token', async () => {
      const res = await request(app)
        .put(`/api/auth/reset-password/${resetToken}`)
        .send({
          password: 'newpassword123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify password was changed
      const updatedUser = await User.findById(user._id);
      const isMatch = await updatedUser.matchPassword('newpassword123');
      expect(isMatch).toBe(true);
    });

    it('should return error for invalid token', async () => {
      const res = await request(app)
        .put('/api/auth/reset-password/invalid-token')
        .send({
          password: 'newpassword123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
