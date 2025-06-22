// src/models/Relationship.js
const database = require('../database/connection');
const logger = require('../utils/logger');

class RelationshipRepository {
  // Follow a user
  async followUser(followerId, followingId, relationshipType = 'follow') {
    try {
      // Prevent self-following
      if (followerId === followingId) {
        throw new Error('Cannot follow yourself');
      }

      // Check if relationship already exists
      const existingQuery = `
        SELECT id, status, relationship_type 
        FROM user_relationships 
        WHERE follower_id = $1 AND following_id = $2
      `;
      
      const existing = await database.query(existingQuery, [followerId, followingId]);
      
      if (existing.rows.length > 0) {
        const rel = existing.rows[0];
        if (rel.status === 'accepted') {
          throw new Error('Already following this user');
        }
        if (rel.status === 'pending') {
          throw new Error('Follow request already pending');
        }
      }

      // Insert or update relationship
      const query = `
        INSERT INTO user_relationships (follower_id, following_id, relationship_type, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (follower_id, following_id) 
        DO UPDATE SET 
          relationship_type = EXCLUDED.relationship_type,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, status, created_at
      `;

      // For follow relationships, auto-accept. For friend relationships, keep pending
      const status = relationshipType === 'follow' ? 'accepted' : 'pending';
      
      const result = await database.query(query, [
        followerId,
        followingId,
        relationshipType,
        status
      ]);

      logger.business('user_follow', followerId, {
        followingId,
        relationshipType,
        status
      });

      return result.rows[0];
    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'follow_user', 
        followerId, 
        followingId, 
        relationshipType 
      });
      throw error;
    }
  }

  // Unfollow a user
  async unfollowUser(followerId, followingId) {
    try {
      const query = `
        DELETE FROM user_relationships
        WHERE follower_id = $1 AND following_id = $2
        RETURNING id
      `;

      const result = await database.query(query, [followerId, followingId]);
      
      if (result.rows.length === 0) {
        throw new Error('Relationship not found');
      }

      logger.business('user_unfollow', followerId, { followingId });
      
      return true;
    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'unfollow_user', 
        followerId, 
        followingId 
      });
      throw error;
    }
  }

  // Accept friend request
  async acceptFriendRequest(followerId, followingId) {
    try {
      const query = `
        UPDATE user_relationships
        SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
        WHERE follower_id = $1 AND following_id = $2 AND status = 'pending'
        RETURNING id
      `;

      const result = await database.query(query, [followerId, followingId]);
      
      if (result.rows.length === 0) {
        throw new Error('Friend request not found or already processed');
      }

      logger.business('friend_request_accepted', followingId, { fromUserId: followerId });
      
      return true;
    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'accept_friend_request', 
        followerId, 
        followingId 
      });
      throw error;
    }
  }

  // Reject friend request
  async rejectFriendRequest(followerId, followingId) {
    try {
      const query = `
        UPDATE user_relationships
        SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE follower_id = $1 AND following_id = $2 AND status = 'pending'
        RETURNING id
      `;

      const result = await database.query(query, [followerId, followingId]);
      
      if (result.rows.length === 0) {
        throw new Error('Friend request not found or already processed');
      }

      logger.business('friend_request_rejected', followingId, { fromUserId: followerId });
      
      return true;
    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'reject_friend_request', 
        followerId, 
        followingId 
      });
      throw error;
    }
  }

  // Block a user
  async blockUser(blockerId, blockedId) {
    try {
      // Prevent self-blocking
      if (blockerId === blockedId) {
        throw new Error('Cannot block yourself');
      }

      const query = `
        INSERT INTO user_relationships (follower_id, following_id, relationship_type, status)
        VALUES ($1, $2, 'block', 'accepted')
        ON CONFLICT (follower_id, following_id) 
        DO UPDATE SET 
          relationship_type = 'block',
          status = 'accepted',
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

      const result = await database.query(query, [blockerId, blockedId]);

      logger.business('user_blocked', blockerId, { blockedUserId: blockedId });

      return result.rows[0];
    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'block_user', 
        blockerId, 
        blockedId 
      });
      throw error;
    }
  }

  // Unblock a user
  async unblockUser(blockerId, blockedId) {
    try {
      const query = `
        DELETE FROM user_relationships
        WHERE follower_id = $1 AND following_id = $2 AND relationship_type = 'block'
        RETURNING id
      `;

      const result = await database.query(query, [blockerId, blockedId]);
      
      if (result.rows.length === 0) {
        throw new Error('Block relationship not found');
      }

      logger.business('user_unblocked', blockerId, { unblockedUserId: blockedId });
      
      return true;
    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'unblock_user', 
        blockerId, 
        blockedId 
      });
      throw error;
    }
  }

  // Get user's followers
  async getFollowers(userId, limit = 20, offset = 0) {
    try {
      const query = `
        SELECT 
          u.id, u.username, u.first_name, u.last_name, 
          u.profile_picture, u.is_verified,
          r.created_at as followed_at,
          r.relationship_type,
          COUNT(*) OVER() as total_count
        FROM user_relationships r
        JOIN users u ON r.follower_id = u.id
        WHERE r.following_id = $1 
          AND r.status = 'accepted' 
          AND r.relationship_type != 'block'
          AND u.is_active = true
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await database.query(query, [userId, limit, offset]);
      
      return {
        followers: result.rows,
        totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
      };
    } catch (error) {
      logger.errorWithContext(error, { operation: 'get_followers', userId });
      throw error;
    }
  }

  // Get users that the user is following
  async getFollowing(userId, limit = 20, offset = 0) {
    try {
      const query = `
        SELECT 
          u.id, u.username, u.first_name, u.last_name, 
          u.profile_picture, u.is_verified,
          r.created_at as followed_at,
          r.relationship_type,
          COUNT(*) OVER() as total_count
        FROM user_relationships r
        JOIN users u ON r.following_id = u.id
        WHERE r.follower_id = $1 
          AND r.status = 'accepted' 
          AND r.relationship_type != 'block'
          AND u.is_active = true
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await database.query(query, [userId, limit, offset]);
      
      return {
        following: result.rows,
        totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
      };
    } catch (error) {
      logger.errorWithContext(error, { operation: 'get_following', userId });
      throw error;
    }
  }

  // Get pending friend requests (received)
  async getPendingRequests(userId, limit = 20, offset = 0) {
    try {
      const query = `
        SELECT 
          u.id, u.username, u.first_name, u.last_name, 
          u.profile_picture, u.is_verified,
          r.created_at as request_date,
          r.relationship_type,
          COUNT(*) OVER() as total_count
        FROM user_relationships r
        JOIN users u ON r.follower_id = u.id
        WHERE r.following_id = $1 
          AND r.status = 'pending'
          AND u.is_active = true
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await database.query(query, [userId, limit, offset]);
      
      return {
        requests: result.rows,
        totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
      };
    } catch (error) {
      logger.errorWithContext(error, { operation: 'get_pending_requests', userId });
      throw error;
    }
  }

  // Get blocked users
  async getBlockedUsers(userId, limit = 20, offset = 0) {
    try {
      const query = `
        SELECT 
          u.id, u.username, u.first_name, u.last_name, 
          u.profile_picture,
          r.created_at as blocked_at,
          COUNT(*) OVER() as total_count
        FROM user_relationships r
        JOIN users u ON r.following_id = u.id
        WHERE r.follower_id = $1 
          AND r.relationship_type = 'block'
          AND r.status = 'accepted'
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await database.query(query, [userId, limit, offset]);
      
      return {
        blocked: result.rows,
        totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
      };
    } catch (error) {
      logger.errorWithContext(error, { operation: 'get_blocked_users', userId });
      throw error;
    }
  }

  // Check relationship status between two users
  async getRelationshipStatus(userId1, userId2) {
    try {
      const query = `
        SELECT 
          relationship_type, status, created_at,
          CASE 
            WHEN follower_id = $1 THEN 'outgoing'
            WHEN following_id = $1 THEN 'incoming'
          END as direction
        FROM user_relationships
        WHERE (follower_id = $1 AND following_id = $2)
           OR (follower_id = $2 AND following_id = $1)
      `;

      const result = await database.query(query, [userId1, userId2]);
      
      if (result.rows.length === 0) {
        return { status: 'none' };
      }

      return result.rows[0];
    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'get_relationship_status', 
        userId1, 
        userId2 
      });
      throw error;
    }
  }

  // Get mutual followers/friends
  async getMutualConnections(userId1, userId2, limit = 20) {
    try {
      const query = `
        SELECT DISTINCT
          u.id, u.username, u.first_name, u.last_name, 
          u.profile_picture, u.is_verified
        FROM users u
        WHERE u.id IN (
          -- Users that both follow
          SELECT r1.following_id
          FROM user_relationships r1
          JOIN user_relationships r2 ON r1.following_id = r2.following_id
          WHERE r1.follower_id = $1 
            AND r2.follower_id = $2
            AND r1.status = 'accepted' 
            AND r2.status = 'accepted'
            AND r1.relationship_type != 'block'
            AND r2.relationship_type != 'block'
        ) AND u.is_active = true
        ORDER BY u.username
        LIMIT $3
      `;

      const result = await database.query(query, [userId1, userId2, limit]);
      
      return result.rows;
    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'get_mutual_connections', 
        userId1, 
        userId2 
      });
      throw error;
    }
  }

  // Get relationship statistics
  async getRelationshipStats(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) FILTER (
            WHERE follower_id = $1 AND status = 'accepted' AND relationship_type != 'block'
          ) as following_count,
          COUNT(*) FILTER (
            WHERE following_id = $1 AND status = 'accepted' AND relationship_type != 'block'
          ) as followers_count,
          COUNT(*) FILTER (
            WHERE following_id = $1 AND status = 'pending'
          ) as pending_requests_count,
          COUNT(*) FILTER (
            WHERE follower_id = $1 AND relationship_type = 'block'
          ) as blocked_count
        FROM user_relationships
        WHERE follower_id = $1 OR following_id = $1
      `;

      const result = await database.query(query, [userId]);
      
      return result.rows[0] || {
        following_count: 0,
        followers_count: 0,
        pending_requests_count: 0,
        blocked_count: 0
      };
    } catch (error) {
      logger.errorWithContext(error, { operation: 'get_relationship_stats', userId });
      throw error;
    }
  }
}

module.exports = new RelationshipRepository();
