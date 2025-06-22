// tests/setup.test.js
const request = require('supertest');

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';

describe('User Service Setup', () => {
  test('should load environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
  });

  test('should be able to require main modules', () => {
    expect(() => require('../src/utils/logger')).not.toThrow();
    expect(() => require('../src/database/connection')).not.toThrow();
    expect(() => require('../src/models/User')).not.toThrow();
    expect(() => require('../src/models/Relationship')).not.toThrow();
    expect(() => require('../src/services/authService')).not.toThrow();
    expect(() => require('../src/utils/tokenUtils')).not.toThrow();
    expect(() => require('../src/utils/emailService')).not.toThrow();
  });

  test('should be able to require validation schemas', () => {
    const schemas = require('../src/validation/schemas');
    expect(schemas.registerSchema).toBeDefined();
    expect(schemas.loginSchema).toBeDefined();
    expect(schemas.updateProfileSchema).toBeDefined();
  });

  test('should be able to require controllers', () => {
    expect(() => require('../src/controllers/userController')).not.toThrow();
    expect(() => require('../src/controllers/socialController')).not.toThrow();
  });

  test('should be able to require middleware', () => {
    expect(() => require('../src/middleware/auth')).not.toThrow();
    expect(() => require('../src/middleware/validation')).not.toThrow();
    expect(() => require('../src/middleware/errorHandler')).not.toThrow();
  });

  test('should be able to require routes', () => {
    expect(() => require('../src/routes/auth')).not.toThrow();
    expect(() => require('../src/routes/users')).not.toThrow();
    expect(() => require('../src/routes/social')).not.toThrow();
    expect(() => require('../src/routes/health')).not.toThrow();
  });
});
