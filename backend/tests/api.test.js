const request = require('supertest');
const { app } = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const Donor = require('../models/Donor');

describe('Authentication Endpoints', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/lifelink-test');
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123!',
          phone: '1234567890',
          role: 'donor'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
    });

    it('should not register with duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User 2',
          email: 'test@example.com',
          password: 'Password123!',
          phone: '9876543210',
          role: 'donor'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});

describe('Donor Endpoints', () => {
  let token;
  let userId;
  let donorId;

  beforeAll(async () => {
    // Create test user and get token
    const user = await User.create({
      name: 'Test Donor',
      email: 'donor@example.com',
      password: 'Password123!',
      phone: '5555555555',
      role: 'donor'
    });
    userId = user._id;
    
    const jwt = require('jsonwebtoken');
    token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret');
  });

  afterAll(async () => {
    await Donor.deleteMany({});
  });

  describe('POST /api/donor/profile', () => {
    it('should create donor profile', async () => {
      const response = await request(app)
        .post('/api/donor/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bloodGroup: 'O+',
          longitude: 77.5946,
          latitude: 12.9716,
          address: '123 Test Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          ageGroup: '26-35'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.bloodGroup).toBe('O+');

      donorId = response.body.data._id;
    });
  });

  describe('GET /api/donor/nearby-requests', () => {
    it('should not return requests created by the same user', async () => {
      const BloodRequest = require('../models/BloodRequest');

      // Create a request owned by the same user near the donor location
      await BloodRequest.create({
        receiverId: userId,
        bloodGroup: 'A+',
        urgency: 'urgent',
        hospitalName: 'Self Hospital',
        patientName: 'Self Patient',
        contactNumber: '9999999999',
        unitsRequired: 2,
        address: 'Self Address',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        description: 'Self created request',
        isFake: false,
        location: {
          type: 'Point',
          coordinates: [77.5947, 12.9717]
        },
        status: 'pending'
      });

      const response = await request(app)
        .get('/api/donor/nearby-requests')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Ensure none of the returned requests belong to the same receiverId
      const ownsAny = (response.body.data || []).some(r => {
        const rid = r.receiverId && (r.receiverId._id || r.receiverId);
        return rid && rid.toString() === userId.toString();
      });
      expect(ownsAny).toBe(false);
    });
  });

  describe('GET /api/donor/profile', () => {
    it('should get donor profile', async () => {
      const response = await request(app)
        .get('/api/donor/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('bloodGroup');
    });
  });
});

describe('Gamification Endpoints', () => {
  let token;

  beforeAll(async () => {
    const user = await User.findOne({ email: 'donor@example.com' });
    const jwt = require('jsonwebtoken');
    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'test-secret');
  });

  describe('GET /api/gamification/profile', () => {
    it('should get gamification profile', async () => {
      const response = await request(app)
        .get('/api/gamification/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('points');
      expect(response.body.data).toHaveProperty('level');
    });
  });

  describe('GET /api/gamification/leaderboard', () => {
    it('should get leaderboard', async () => {
      const response = await request(app)
        .get('/api/gamification/leaderboard?limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
