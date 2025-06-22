// src/models/User.js
const database = require('../database/connection');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class UserRepository {
  // Create a new user
  async create(userData) {
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, parseInt(process.env.BCRYPT_ROUNDS));
      
      // Insert user
      const userQuery = `
        INSERT INTO users (username, email, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, email, first_name, last_name, is_verified, is_active, created_at
      `;
      
      const userResult = await client.query(userQuery, [
        userData.username,
        userData.email,
        passwordHash,
        userData.firstName || null,
        userData.lastName || null
      ]);
      
      const user = userResult.rows[0];
      
      // Create user profile
      const profileQuery = `
        INSERT INTO user_profiles (user_id)
        VALUES ($1)
      `;
      
      await client.query(profileQuery, [user.id]);
      
      await client.query('COMMIT');
      
      logger.business('user_created', user.id, {
        username: user.username,
        email: user.email
      });
      
      return user;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.errorWithContext(error, { operation: 'create_user', userData });
      throw error;
    } finally {
      client.release();
    }
  }

  // Find user by ID
  async findById(userId) {
    try {
      const query = `
        SELECT 
          u.id, u.username, u.email, u.first_name, u.last_name,
          u.profile_picture, u.bio, u.date_of_birth, u.is_verified,
          u.is_active, u.last_login, u.created_at, u.updated_at,
          p.phone, p.location, p.website, p.occupation, p.interests,
          p.privacy_settings, p.notification_preferences, p.social_links
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        WHERE u.id = $1 AND u.is_active = true
      `;
      
      const result = await database.query(query, [userId]);
      return result.rows[0] || null;
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'find_user_by_id', userId });
      throw error;
    }
  }

  // Find user by email
  async findByEmail(email) {
    try {
      const query = `
        SELECT 
          u.id, u.username, u.email, u.password_hash, u.first_name, u.last_name,
          u.profile_picture, u.bio, u.is_verified, u.is_active, u.last_login,
          u.created_at, u.updated_at
        FROM users u
        WHERE LOWER(u.email) = LOWER($1) AND u.is_active = true
      `;
      
      const result = await database.query(query, [email]);
      return result.rows[0] || null;
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'find_user_by_email', email });
      throw error;
    }
  }

  // Find user by username
  async findByUsername(username) {
    try {
      const query = `
        SELECT 
          u.id, u.username, u.email, u.password_hash, u.first_name, u.last_name,
          u.profile_picture, u.bio, u.is_verified, u.is_active, u.last_login,
          u.created_at, u.updated_at
        FROM users u
        WHERE LOWER(u.username) = LOWER($1) AND u.is_active = true
      `;
      
      const result = await database.query(query, [username]);
      return result.rows[0] || null;
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'find_user_by_username', username });
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Update users table if basic info is provided
      if (updateData.firstName || updateData.lastName || updateData.bio || updateData.profilePicture) {
        const userUpdateQuery = `
          UPDATE users 
          SET 
            first_name = COALESCE($2, first_name),
            last_name = COALESCE($3, last_name),
            bio = COALESCE($4, bio),
            profile_picture = COALESCE($5, profile_picture)
          WHERE id = $1
        `;
        
        await client.query(userUpdateQuery, [
          userId,
          updateData.firstName,
          updateData.lastName,
          updateData.bio,
          updateData.profilePicture
        ]);
      }
      
      // Update user_profiles table
      const profileUpdateQuery = `
        UPDATE user_profiles 
        SET 
          phone = COALESCE($2, phone),
          location = COALESCE($3, location),
          website = COALESCE($4, website),
          occupation = COALESCE($5, occupation),
          interests = COALESCE($6, interests),
          privacy_settings = COALESCE($7, privacy_settings),
          notification_preferences = COALESCE($8, notification_preferences),
          social_links = COALESCE($9, social_links)
        WHERE user_id = $1
      `;
      
      await client.query(profileUpdateQuery, [
        userId,
        updateData.phone,
        updateData.location,
        updateData.website,
        updateData.occupation,
        updateData.interests,
        updateData.privacySettings,
        updateData.notificationPreferences,
        updateData.socialLinks
      ]);
      
      await client.query('COMMIT');
      
      logger.business('profile_updated', userId, { updateFields: Object.keys(updateData) });
      
      // Return updated user
      return await this.findById(userId);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.errorWithContext(error, { operation: 'update_profile', userId, updateData });
      throw error;
    } finally {
      client.release();
    }
  }

  // Update last login
  async updateLastLogin(userId) {
    try {
      const query = `
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      
      await database.query(query, [userId]);
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'update_last_login', userId });
      throw error;
    }
  }

  // Verify password
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.errorWithContext(error, { operation: 'verify_password' });
      throw error;
    }
  }

  // Change password
  async changePassword(userId, newPassword) {
    try {
      const passwordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS));
      
      const query = `
        UPDATE users 
        SET password_hash = $2 
        WHERE id = $1
      `;
      
      await database.query(query, [userId, passwordHash]);
      
      logger.business('password_changed', userId);
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'change_password', userId });
      throw error;
    }
  }

  // Search users
  async searchUsers(searchTerm, limit = 20, offset = 0) {
    try {
      const query = `
        SELECT 
          u.id, u.username, u.first_name, u.last_name,
          u.profile_picture, u.is_verified, u.created_at
        FROM users u
        WHERE 
          u.is_active = true AND
          (
            LOWER(u.username) LIKE LOWER($1) OR
            LOWER(u.first_name) LIKE LOWER($1) OR
            LOWER(u.last_name) LIKE LOWER($1) OR
            LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE LOWER($1)
          )
        ORDER BY 
          CASE 
            WHEN LOWER(u.username) = LOWER($2) THEN 1
            WHEN LOWER(u.username) LIKE LOWER($1) THEN 2
            ELSE 3
          END,
          u.created_at DESC
        LIMIT $3 OFFSET $4
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const result = await database.query(query, [searchPattern, searchTerm, limit, offset]);
      
      return result.rows;
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'search_users', searchTerm });
      throw error;
    }
  }

  // Get user statistics
  async getUserStats(userId) {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM user_relationships WHERE follower_id = $1 AND status = 'accepted') as following_count,
          (SELECT COUNT(*) FROM user_relationships WHERE following_id = $1 AND status = 'accepted') as followers_count,
          u.created_at as member_since
        FROM users u
        WHERE u.id = $1
      `;
      
      const result = await database.query(query, [userId]);
      return result.rows[0] || null;
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'get_user_stats', userId });
      throw error;
    }
  }

  // Check if username or email exists
  async checkExistence(username, email) {
    try {
      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE LOWER(username) = LOWER($1)) as username_exists,
          COUNT(*) FILTER (WHERE LOWER(email) = LOWER($2)) as email_exists
        FROM users 
        WHERE is_active = true
      `;
      
      const result = await database.query(query, [username, email]);
      const row = result.rows[0];
      
      return {
        usernameExists: parseInt(row.username_exists) > 0,
        emailExists: parseInt(row.email_exists) > 0
      };
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'check_existence', username, email });
      throw error;
    }
  }

  // Deactivate user (soft delete)
  async deactivateUser(userId) {
    try {
      const query = `
        UPDATE users 
        SET is_active = false 
        WHERE id = $1
      `;
      
      await database.query(query, [userId]);
      
      logger.business('user_deactivated', userId);
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'deactivate_user', userId });
      throw error;
    }
  }

  // Get users with pagination
  async getUsers(limit = 20, offset = 0, filters = {}) {
    try {
      let whereClause = 'WHERE u.is_active = true';
      const queryParams = [];
      let paramIndex = 1;
      
      // Add filters
      if (filters.verified !== undefined) {
        whereClause += ` AND u.is_verified = $${paramIndex}`;
        queryParams.push(filters.verified);
        paramIndex++;
      }
      
      if (filters.createdAfter) {
        whereClause += ` AND u.created_at >= $${paramIndex}`;
        queryParams.push(filters.createdAfter);
        paramIndex++;
      }
      
      const query = `
        SELECT 
          u.id, u.username, u.email, u.first_name, u.last_name,
          u.profile_picture, u.is_verified, u.created_at,
          COUNT(*) OVER() as total_count
        FROM users u
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      const result = await database.query(query, queryParams);
      
      return {
        users: result.rows,
        totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
      };
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'get_users', filters });
      throw error;
    }
  }
}

module.exports = new UserRepository();