// src/routes/index.js
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const socialRoutes = require('./social');
const healthRoutes = require('./health');

// API Info endpoint
router.get('/', (req, res) => {
  res.json({
    service: 'User Service',
    version: process.env.npm_package_version || '1.0.0',
    description: 'User management microservice for social platform',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      social: '/api/social',
      health: '/health'
    },
    documentation: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        refresh: 'POST /api/auth/refresh',
        changePassword: 'POST /api/auth/change-password',
        forgotPassword: 'POST /api/auth/forgot-password',
        resetPassword: 'POST /api/auth/reset-password',
        verifyEmail: 'POST /api/auth/verify-email',
        me: 'GET /api/auth/me',
        sessions: 'GET /api/auth/sessions'
      },
      users: {
        search: 'GET /api/users/search',
        profile: 'GET /api/users/:userId',
        updateProfile: 'PUT /api/users/profile',
        notifications: 'PUT /api/users/notifications',
        deactivate: 'POST /api/users/deactivate',
        stats: 'GET /api/users/:userId/stats'
      },
      social: {
        follow: 'POST /api/social/follow',
        unfollow: 'POST /api/social/unfollow',
        followers: 'GET /api/social/:userId/followers',
        following: 'GET /api/social/:userId/following',
        block: 'POST /api/social/block',
        unblock: 'POST /api/social/unblock',
        blocked: 'GET /api/social/blocked',
        report: 'POST /api/social/report',
        relationship: 'GET /api/social/relationship/:userId'
      }
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/social', socialRoutes);

module.exports = {
  apiRoutes: router,
  healthRoutes
};
