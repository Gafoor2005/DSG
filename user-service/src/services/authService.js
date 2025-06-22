// src/services/authService.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const database = require('../database/connection');
const logger = require('../utils/logger');
const UserRepository = require('../models/User');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  // Generate JWT access token
  generateAccessToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      isVerified: user.is_verified,
      type: 'access'
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'user-service',
      audience: 'social-platform'
    });
  }

  // Generate refresh token
  generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  // Verify JWT token
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'user-service',
        audience: 'social-platform'
      });
    } catch (error) {
      logger.security('invalid_token_verification', { error: error.message });
      throw new Error('Invalid or expired token');
    }
  }

  // Store refresh token in database
  async storeRefreshToken(userId, refreshToken, deviceInfo, ipAddress) {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const query = `
        INSERT INTO user_sessions (user_id, refresh_token, device_info, ip_address, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      const result = await database.query(query, [
        userId,
        refreshToken,
        deviceInfo,
        ipAddress,
        expiresAt
      ]);

      return result.rows[0].id;
    } catch (error) {
      logger.errorWithContext(error, { operation: 'store_refresh_token', userId });
      throw error;
    }
  }

  // Verify refresh token
  async verifyRefreshToken(refreshToken) {
    try {
      const query = `
        SELECT s.id, s.user_id, s.expires_at, u.username, u.email, u.is_active, u.is_verified
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.refresh_token = $1 AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = true
      `;

      const result = await database.query(query, [refreshToken]);
      
      if (result.rows.length === 0) {
        throw new Error('Invalid or expired refresh token');
      }

      // Update last used timestamp
      await database.query(
        'UPDATE user_sessions SET last_used = CURRENT_TIMESTAMP WHERE id = $1',
        [result.rows[0].id]
      );

      return result.rows[0];
    } catch (error) {
      logger.security('invalid_refresh_token', { error: error.message });
      throw error;
    }
  }

  // Revoke refresh token
  async revokeRefreshToken(refreshToken) {
    try {
      const query = `
        DELETE FROM user_sessions 
        WHERE refresh_token = $1
      `;

      await database.query(query, [refreshToken]);
      logger.authLogger('refresh_token_revoked', null, { refreshToken: refreshToken.substring(0, 10) + '...' });
    } catch (error) {
      logger.errorWithContext(error, { operation: 'revoke_refresh_token' });
      throw error;
    }
  }

  // Revoke all user sessions
  async revokeAllUserSessions(userId) {
    try {
      const query = `
        DELETE FROM user_sessions 
        WHERE user_id = $1
      `;

      const result = await database.query(query, [userId]);
      logger.authLogger('all_sessions_revoked', userId, { deletedSessions: result.rowCount });
    } catch (error) {
      logger.errorWithContext(error, { operation: 'revoke_all_sessions', userId });
      throw error;
    }
  }

  // Login user
  async login(identifier, password, deviceInfo, ipAddress) {
    try {
      // Find user by email or username
      let user = await UserRepository.findByEmail(identifier);
      if (!user) {
        user = await UserRepository.findByUsername(identifier);
      }

      if (!user) {
        logger.security('login_attempt_invalid_user', { identifier, ipAddress });
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await UserRepository.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        logger.security('login_attempt_invalid_password', { 
          userId: user.id, 
          identifier, 
          ipAddress 
        });
        throw new Error('Invalid credentials');
      }

      // Check if user is active
      if (!user.is_active) {
        logger.security('login_attempt_inactive_user', { userId: user.id, ipAddress });
        throw new Error('Account is deactivated');
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken();

      // Store refresh token
      await this.storeRefreshToken(user.id, refreshToken, deviceInfo, ipAddress);

      // Update last login
      await UserRepository.updateLastLogin(user.id);

      // Remove password hash from response
      delete user.password_hash;

      logger.authLogger('user_login_success', user.id, { 
        ipAddress, 
        deviceInfo: deviceInfo?.userAgent 
      });

      return {
        user,
        accessToken,
        refreshToken,
        expiresIn: this.jwtExpiresIn
      };
    } catch (error) {
      logger.errorWithContext(error, { operation: 'login', identifier });
      throw error;
    }
  }

  // Register user
  async register(userData, deviceInfo, ipAddress) {
    try {
      // Check if user already exists
      const existenceCheck = await UserRepository.checkExistence(userData.username, userData.email);
      
      if (existenceCheck.emailExists) {
        throw new Error('Email already registered');
      }
      
      if (existenceCheck.usernameExists) {
        throw new Error('Username already taken');
      }

      // Create user
      const user = await UserRepository.create(userData);

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken();

      // Store refresh token
      await this.storeRefreshToken(user.id, refreshToken, deviceInfo, ipAddress);

      logger.authLogger('user_registration_success', user.id, { 
        ipAddress, 
        deviceInfo: deviceInfo?.userAgent 
      });

      return {
        user,
        accessToken,
        refreshToken,
        expiresIn: this.jwtExpiresIn
      };
    } catch (error) {
      logger.errorWithContext(error, { operation: 'register', userData: { ...userData, password: '[REDACTED]' } });
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      const session = await this.verifyRefreshToken(refreshToken);
      
      const user = {
        id: session.user_id,
        username: session.username,
        email: session.email,
        is_verified: session.is_verified
      };

      const newAccessToken = this.generateAccessToken(user);

      logger.authLogger('token_refreshed', user.id);

      return {
        accessToken: newAccessToken,
        expiresIn: this.jwtExpiresIn
      };
    } catch (error) {
      logger.errorWithContext(error, { operation: 'refresh_token' });
      throw error;
    }
  }

  // Logout user
  async logout(refreshToken) {
    try {
      if (refreshToken) {
        await this.revokeRefreshToken(refreshToken);
      }
      
      logger.authLogger('user_logout');
    } catch (error) {
      logger.errorWithContext(error, { operation: 'logout' });
      throw error;
    }
  }

  // Get user sessions
  async getUserSessions(userId) {
    try {
      const query = `
        SELECT 
          id, device_info, ip_address, created_at, last_used, expires_at
        FROM user_sessions
        WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
        ORDER BY last_used DESC
      `;

      const result = await database.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.errorWithContext(error, { operation: 'get_user_sessions', userId });
      throw error;
    }
  }

  // Clean up expired sessions
  async cleanupExpiredSessions() {
    try {
      const query = `
        DELETE FROM user_sessions 
        WHERE expires_at < CURRENT_TIMESTAMP
      `;

      const result = await database.query(query);
      
      if (result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} expired sessions`);
      }
      
      return result.rowCount;
    } catch (error) {
      logger.errorWithContext(error, { operation: 'cleanup_expired_sessions' });
      throw error;
    }
  }

  // Validate token strength
  validateTokenStrength(token) {
    if (!token || token.length < 10) {
      return false;
    }
    
    // Check for basic complexity
    const hasNumbers = /\d/.test(token);
    const hasLetters = /[a-zA-Z]/.test(token);
    
    return hasNumbers && hasLetters;
  }

  // Get device info from request
  extractDeviceInfo(req) {
    return {
      userAgent: req.get('User-Agent') || 'Unknown',
      platform: req.get('Sec-CH-UA-Platform') || 'Unknown',
      mobile: req.get('Sec-CH-UA-Mobile') === '?1',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new AuthService();