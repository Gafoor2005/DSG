// src/controllers/socialController.js
const RelationshipRepository = require('../models/Relationship');
const UserRepository = require('../models/User');
const database = require('../database/connection');
const logger = require('../utils/logger');
const {
  followUserSchema,
  blockUserSchema,
  reportUserSchema
} = require('../validation/schemas');

class SocialController {
  // Follow a user
  async followUser(req, res) {
    try {
      const currentUserId = req.user.id;

      // Validate input
      const { error, value } = followUserSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }

      const { userId: targetUserId } = value;

      // Check if trying to follow self
      if (currentUserId === targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot follow yourself'
        });
      }

      // Check if target user exists
      const targetUser = await UserRepository.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if already following
      const existingRelationship = await this.getRelationship(currentUserId, targetUserId);
      if (existingRelationship && existingRelationship.relationshipType === 'following') {
        return res.status(409).json({
          success: false,
          message: 'Already following this user'
        });
      }

      // Create follow relationship
      await this.createOrUpdateRelationship(currentUserId, targetUserId, 'following');

      logger.business('user_followed', currentUserId, {
        targetUserId,
        targetUsername: targetUser.username
      });

      res.json({
        success: true,
        message: 'User followed successfully',
        data: {
          followedUser: {
            id: targetUser.id,
            username: targetUser.username,
            firstName: targetUser.firstName,
            lastName: targetUser.lastName,
            profilePicture: targetUser.profilePicture
          }
        }
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'follow_user',
        userId: req.user.id,
        targetUserId: req.body.userId
      });

      res.status(500).json({
        success: false,
        message: 'Error following user'
      });
    }
  }

  // Unfollow a user
  async unfollowUser(req, res) {
    try {
      const currentUserId = req.user.id;

      // Validate input
      const { error, value } = followUserSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }

      const { userId: targetUserId } = value;

      // Check if trying to unfollow self
      if (currentUserId === targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot unfollow yourself'
        });
      }

      // Check if currently following
      const existingRelationship = await this.getRelationship(currentUserId, targetUserId);
      if (!existingRelationship || existingRelationship.relationshipType !== 'following') {
        return res.status(409).json({
          success: false,
          message: 'Not currently following this user'
        });
      }

      // Remove follow relationship
      await this.removeRelationship(currentUserId, targetUserId);

      logger.business('user_unfollowed', currentUserId, {
        targetUserId
      });

      res.json({
        success: true,
        message: 'User unfollowed successfully'
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'unfollow_user',
        userId: req.user.id,
        targetUserId: req.body.userId
      });

      res.status(500).json({
        success: false,
        message: 'Error unfollowing user'
      });
    }
  }

  // Get user followers
  async getFollowers(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      // Check if user exists
      const user = await UserRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const followers = await this.getUserFollowers(userId, limit, offset);

      res.json({
        success: true,
        data: {
          followers,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: followers.length
          }
        }
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'get_followers',
        userId: req.params.userId
      });

      res.status(500).json({
        success: false,
        message: 'Error retrieving followers'
      });
    }
  }

  // Get user following
  async getFollowing(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      // Check if user exists
      const user = await UserRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const following = await this.getUserFollowing(userId, limit, offset);

      res.json({
        success: true,
        data: {
          following,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: following.length
          }
        }
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'get_following',
        userId: req.params.userId
      });

      res.status(500).json({
        success: false,
        message: 'Error retrieving following'
      });
    }
  }

  // Block a user
  async blockUser(req, res) {
    try {
      const currentUserId = req.user.id;

      // Validate input
      const { error, value } = blockUserSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }

      const { userId: targetUserId, reason } = value;

      // Check if trying to block self
      if (currentUserId === targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot block yourself'
        });
      }

      // Check if target user exists
      const targetUser = await UserRepository.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if already blocked
      const existingRelationship = await this.getRelationship(currentUserId, targetUserId);
      if (existingRelationship && existingRelationship.relationshipType === 'blocked') {
        return res.status(409).json({
          success: false,
          message: 'User is already blocked'
        });
      }

      // Create block relationship (this will also remove any existing follow relationship)
      await this.createOrUpdateRelationship(currentUserId, targetUserId, 'blocked', { reason });

      logger.security('user_blocked', {
        userId: currentUserId,
        targetUserId,
        reason,
        ipAddress: req.ip
      });

      res.json({
        success: true,
        message: 'User blocked successfully'
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'block_user',
        userId: req.user.id,
        targetUserId: req.body.userId
      });

      res.status(500).json({
        success: false,
        message: 'Error blocking user'
      });
    }
  }

  // Unblock a user
  async unblockUser(req, res) {
    try {
      const currentUserId = req.user.id;

      // Validate input
      const { error, value } = followUserSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }

      const { userId: targetUserId } = value;

      // Check if currently blocked
      const existingRelationship = await this.getRelationship(currentUserId, targetUserId);
      if (!existingRelationship || existingRelationship.relationshipType !== 'blocked') {
        return res.status(409).json({
          success: false,
          message: 'User is not currently blocked'
        });
      }

      // Remove block relationship
      await this.removeRelationship(currentUserId, targetUserId);

      logger.business('user_unblocked', currentUserId, {
        targetUserId
      });

      res.json({
        success: true,
        message: 'User unblocked successfully'
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'unblock_user',
        userId: req.user.id,
        targetUserId: req.body.userId
      });

      res.status(500).json({
        success: false,
        message: 'Error unblocking user'
      });
    }
  }

  // Report a user
  async reportUser(req, res) {
    try {
      const reporterId = req.user.id;

      // Validate input
      const { error, value } = reportUserSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }

      const { userId: reportedUserId, reason, description } = value;

      // Check if trying to report self
      if (reporterId === reportedUserId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot report yourself'
        });
      }

      // Check if target user exists
      const reportedUser = await UserRepository.findById(reportedUserId);
      if (!reportedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Create user report
      const reportId = await this.createUserReport(reporterId, reportedUserId, reason, description);

      logger.security('user_reported', {
        reporterId,
        reportedUserId,
        reason,
        reportId,
        ipAddress: req.ip
      });

      res.json({
        success: true,
        message: 'User reported successfully',
        data: {
          reportId
        }
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'report_user',
        userId: req.user.id,
        reportedUserId: req.body.userId
      });

      res.status(500).json({
        success: false,
        message: 'Error reporting user'
      });
    }
  }

  // Get blocked users
  async getBlockedUsers(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0 } = req.query;

      const blockedUsers = await this.getUserBlocked(userId, limit, offset);

      res.json({
        success: true,
        data: {
          blockedUsers,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: blockedUsers.length
          }
        }
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'get_blocked_users',
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Error retrieving blocked users'
      });
    }
  }

  // Helper methods for database operations
  async getRelationship(followerId, followingId) {
    try {
      const query = `
        SELECT * FROM user_relationships 
        WHERE follower_id = $1 AND following_id = $2
      `;
      const result = await database.query(query, [followerId, followingId]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async createOrUpdateRelationship(followerId, followingId, relationshipType, metadata = {}) {
    try {
      const query = `
        INSERT INTO user_relationships (follower_id, following_id, relationship_type, metadata)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (follower_id, following_id)
        DO UPDATE SET 
          relationship_type = $3,
          metadata = $4,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;
      const result = await database.query(query, [
        followerId,
        followingId,
        relationshipType,
        JSON.stringify(metadata)
      ]);
      return result.rows[0].id;
    } catch (error) {
      throw error;
    }
  }

  async removeRelationship(followerId, followingId) {
    try {
      const query = `
        DELETE FROM user_relationships 
        WHERE follower_id = $1 AND following_id = $2
      `;
      await database.query(query, [followerId, followingId]);
    } catch (error) {
      throw error;
    }
  }

  async getUserFollowers(userId, limit, offset) {
    try {
      const query = `
        SELECT 
          u.id,
          u.username,
          u.first_name,
          u.last_name,
          u.profile_picture,
          u.is_verified,
          ur.created_at as followed_at
        FROM user_relationships ur
        JOIN users u ON ur.follower_id = u.id
        WHERE ur.following_id = $1 
          AND ur.relationship_type = 'following'
          AND u.is_active = true
        ORDER BY ur.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await database.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getUserFollowing(userId, limit, offset) {
    try {
      const query = `
        SELECT 
          u.id,
          u.username,
          u.first_name,
          u.last_name,
          u.profile_picture,
          u.is_verified,
          ur.created_at as followed_at
        FROM user_relationships ur
        JOIN users u ON ur.following_id = u.id
        WHERE ur.follower_id = $1 
          AND ur.relationship_type = 'following'
          AND u.is_active = true
        ORDER BY ur.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await database.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getUserBlocked(userId, limit, offset) {
    try {
      const query = `
        SELECT 
          u.id,
          u.username,
          u.first_name,
          u.last_name,
          u.profile_picture,
          ur.metadata,
          ur.created_at as blocked_at
        FROM user_relationships ur
        JOIN users u ON ur.following_id = u.id
        WHERE ur.follower_id = $1 
          AND ur.relationship_type = 'blocked'
          AND u.is_active = true
        ORDER BY ur.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await database.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async createUserReport(reporterId, reportedUserId, reason, description) {
    try {
      // First, create a user_reports table if it doesn't exist
      await this.createUserReportsTable();

      const query = `
        INSERT INTO user_reports (reporter_id, reported_user_id, reason, description, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING id
      `;
      const result = await database.query(query, [reporterId, reportedUserId, reason, description]);
      return result.rows[0].id;
    } catch (error) {
      throw error;
    }
  }

  async createUserReportsTable() {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS user_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reason VARCHAR(50) NOT NULL,
          description TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          reviewed_by UUID REFERENCES users(id),
          reviewed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);
        CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_user_id);
        CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
      `;
      await database.query(createTableQuery);
    } catch (error) {
      // Table might already exist, which is fine
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }
}

module.exports = new SocialController();
