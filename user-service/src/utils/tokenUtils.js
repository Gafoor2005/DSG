// src/utils/tokenUtils.js
const crypto = require('crypto');
const database = require('../database/connection');
const logger = require('./logger');

class TokenUtils {
  // Generate a secure random token
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate a verification token for email verification
  async generateVerificationToken(userId, type = 'email_verification', expiresInHours = 24) {
    try {
      const token = this.generateToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      // Store token in database (you might want to create a tokens table)
      const query = `
        INSERT INTO user_tokens (user_id, token, token_type, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, token_type) 
        DO UPDATE SET 
          token = EXCLUDED.token,
          expires_at = EXCLUDED.expires_at,
          created_at = CURRENT_TIMESTAMP
        RETURNING token
      `;

      // For now, we'll create the tokens table if it doesn't exist
      await this.ensureTokensTable();
      
      const result = await database.query(query, [userId, token, type, expiresAt]);
      
      logger.info('Verification token generated', { userId, type, expiresAt });
      
      return result.rows[0].token;
    } catch (error) {
      logger.errorWithContext(error, { operation: 'generate_verification_token', userId, type });
      throw error;
    }
  }

  // Verify a token
  async verifyToken(token, type = 'email_verification') {
    try {
      const query = `
        SELECT user_id, token_type, expires_at, created_at
        FROM user_tokens
        WHERE token = $1 AND token_type = $2 AND expires_at > CURRENT_TIMESTAMP
      `;

      const result = await database.query(query, [token, type]);
      
      if (result.rows.length === 0) {
        throw new Error('Invalid or expired token');
      }

      const tokenData = result.rows[0];
      
      logger.info('Token verified', { userId: tokenData.user_id, type });
      
      return tokenData;
    } catch (error) {
      logger.errorWithContext(error, { operation: 'verify_token', type });
      throw error;
    }
  }

  // Invalidate a token
  async invalidateToken(token, type = 'email_verification') {
    try {
      const query = `
        DELETE FROM user_tokens
        WHERE token = $1 AND token_type = $2
        RETURNING user_id
      `;

      const result = await database.query(query, [token, type]);
      
      if (result.rows.length > 0) {
        logger.info('Token invalidated', { userId: result.rows[0].user_id, type });
      }
      
      return result.rows.length > 0;
    } catch (error) {
      logger.errorWithContext(error, { operation: 'invalidate_token', type });
      throw error;
    }
  }

  // Invalidate all tokens for a user
  async invalidateUserTokens(userId, type = null) {
    try {
      let query = 'DELETE FROM user_tokens WHERE user_id = $1';
      let params = [userId];

      if (type) {
        query += ' AND token_type = $2';
        params.push(type);
      }

      query += ' RETURNING token_type';

      const result = await database.query(query, params);
      
      logger.info('User tokens invalidated', { 
        userId, 
        type, 
        invalidatedCount: result.rows.length 
      });
      
      return result.rows.length;
    } catch (error) {
      logger.errorWithContext(error, { operation: 'invalidate_user_tokens', userId, type });
      throw error;
    }
  }

  // Clean up expired tokens
  async cleanupExpiredTokens() {
    try {
      const query = `
        DELETE FROM user_tokens
        WHERE expires_at < CURRENT_TIMESTAMP
        RETURNING COUNT(*) as deleted_count
      `;

      const result = await database.query(query);
      const deletedCount = result.rows[0]?.deleted_count || 0;
      
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired tokens`);
      }
      
      return deletedCount;
    } catch (error) {
      logger.errorWithContext(error, { operation: 'cleanup_expired_tokens' });
      throw error;
    }
  }

  // Ensure tokens table exists
  async ensureTokensTable() {
    try {
      const createTokensTable = `
        CREATE TABLE IF NOT EXISTS user_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) NOT NULL,
          token_type VARCHAR(50) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT unique_user_token_type UNIQUE (user_id, token_type)
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON user_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_tokens_token ON user_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_tokens_expires ON user_tokens(expires_at);
        CREATE INDEX IF NOT EXISTS idx_tokens_type ON user_tokens(token_type);
      `;

      await database.query(createTokensTable);
    } catch (error) {
      // Table might already exist, which is fine
      if (!error.message.includes('already exists')) {
        logger.errorWithContext(error, { operation: 'ensure_tokens_table' });
        throw error;
      }
    }
  }

  // Generate a secure 6-digit code for SMS or email verification
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Hash a sensitive token for storage
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Verify hashed token
  verifyHashedToken(plainToken, hashedToken) {
    const hash = this.hashToken(plainToken);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedToken));
  }
}

module.exports = new TokenUtils();
