// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const UserRepository = require('../models/User');
const AuthService = require('../services/authService');
const logger = require('../utils/logger');

class AuthMiddleware {
  // Verify JWT token and attach user to request
  async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access token is required'
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token
      const decoded = AuthService.verifyAccessToken(token);

      // Get user from database
      const user = await UserRepository.findById(decoded.id);
      if (!user) {
        logger.security('token_user_not_found', {
          userId: decoded.id,
          ipAddress: req.ip
        });

        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        logger.security('inactive_user_access_attempt', {
          userId: user.id,
          ipAddress: req.ip
        });

        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Attach user to request
      req.user = user;
      req.token = token;

      next();

    } catch (error) {
      logger.security('authentication_failed', {
        error: error.message,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  }

  // Optional authentication - doesn't fail if no token provided
  async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = AuthService.verifyAccessToken(token);
        const user = await UserRepository.findById(decoded.id);

        if (user && user.isActive) {
          req.user = user;
          req.token = token;
        }
      }

      next();
    } catch (error) {
      // Continue without authentication for optional auth
      next();
    }
  }

  // Check if user is verified (email verification)
  requireVerified(req, res, next) {
    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }
    next();
  }

  // Check if user owns the resource or is admin
  requireOwnership(paramName = 'userId') {
    return (req, res, next) => {
      const resourceUserId = req.params[paramName];
      const currentUserId = req.user.id;

      if (resourceUserId !== currentUserId && !req.user.isAdmin) {
        logger.security('unauthorized_access_attempt', {
          userId: currentUserId,
          attemptedResource: resourceUserId,
          ipAddress: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      next();
    };
  }

  // Rate limiting by user ID
  createUserRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    const userRequestCounts = new Map();

    return (req, res, next) => {
      const userId = req.user?.id || req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      if (userRequestCounts.has(userId)) {
        const requests = userRequestCounts.get(userId);
        const validRequests = requests.filter(time => time > windowStart);
        userRequestCounts.set(userId, validRequests);
      }

      // Get current request count
      const requests = userRequestCounts.get(userId) || [];
      
      if (requests.length >= maxRequests) {
        logger.security('rate_limit_exceeded', {
          userId,
          requestCount: requests.length,
          ipAddress: req.ip
        });

        return res.status(429).json({
          success: false,
          message: 'Too many requests',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      // Add current request
      requests.push(now);
      userRequestCounts.set(userId, requests);

      next();
    };
  }
}

module.exports = new AuthMiddleware();
