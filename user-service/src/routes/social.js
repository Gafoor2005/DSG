// src/routes/social.js
const express = require('express');
const router = express.Router();
const SocialController = require('../controllers/socialController');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');
const errorHandler = require('../middleware/errorHandler');
const {
  followUserSchema,
  blockUserSchema,
  reportUserSchema,
  paginationSchema
} = require('../validation/schemas');
const Joi = require('joi');

// Parameter validation schemas
const userIdParamSchema = Joi.object({
  userId: Joi.string().uuid().required()
});

const followersQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
});

// All social routes require authentication

/**
 * @route   POST /api/social/follow
 * @desc    Follow a user
 * @access  Private
 */
router.post('/follow',
  authMiddleware.authenticate,
  authMiddleware.createUserRateLimit(50, 15 * 60 * 1000), // 50 follows per 15 minutes
  validationMiddleware.sanitizeInput,
  validationMiddleware.validateBody(followUserSchema),
  errorHandler.asyncHandler(SocialController.followUser)
);

/**
 * @route   POST /api/social/unfollow
 * @desc    Unfollow a user
 * @access  Private
 */
router.post('/unfollow',
  authMiddleware.authenticate,
  validationMiddleware.sanitizeInput,
  validationMiddleware.validateBody(followUserSchema),
  errorHandler.asyncHandler(SocialController.unfollowUser)
);

/**
 * @route   GET /api/social/:userId/followers
 * @desc    Get user followers
 * @access  Private
 */
router.get('/:userId/followers',
  authMiddleware.authenticate,
  validationMiddleware.validateParams(userIdParamSchema),
  validationMiddleware.validateQuery(followersQuerySchema),
  errorHandler.asyncHandler(SocialController.getFollowers)
);

/**
 * @route   GET /api/social/:userId/following
 * @desc    Get users that the user is following
 * @access  Private
 */
router.get('/:userId/following',
  authMiddleware.authenticate,
  validationMiddleware.validateParams(userIdParamSchema),
  validationMiddleware.validateQuery(followersQuerySchema),
  errorHandler.asyncHandler(SocialController.getFollowing)
);

/**
 * @route   POST /api/social/block
 * @desc    Block a user
 * @access  Private
 */
router.post('/block',
  authMiddleware.authenticate,
  authMiddleware.createUserRateLimit(20, 15 * 60 * 1000), // 20 blocks per 15 minutes
  validationMiddleware.sanitizeInput,
  validationMiddleware.validateBody(blockUserSchema),
  errorHandler.asyncHandler(SocialController.blockUser)
);

/**
 * @route   POST /api/social/unblock
 * @desc    Unblock a user
 * @access  Private
 */
router.post('/unblock',
  authMiddleware.authenticate,
  validationMiddleware.sanitizeInput,
  validationMiddleware.validateBody(followUserSchema),
  errorHandler.asyncHandler(SocialController.unblockUser)
);

/**
 * @route   GET /api/social/blocked
 * @desc    Get blocked users
 * @access  Private
 */
router.get('/blocked',
  authMiddleware.authenticate,
  validationMiddleware.validateQuery(followersQuerySchema),
  errorHandler.asyncHandler(SocialController.getBlockedUsers)
);

/**
 * @route   POST /api/social/report
 * @desc    Report a user
 * @access  Private
 */
router.post('/report',
  authMiddleware.authenticate,
  authMiddleware.requireVerified, // Only verified users can report
  authMiddleware.createUserRateLimit(10, 60 * 60 * 1000), // 10 reports per hour
  validationMiddleware.sanitizeInput,
  validationMiddleware.validateBody(reportUserSchema),
  errorHandler.asyncHandler(SocialController.reportUser)
);

/**
 * @route   GET /api/social/relationship/:userId
 * @desc    Get relationship status with a user
 * @access  Private
 */
router.get('/relationship/:userId',
  authMiddleware.authenticate,
  validationMiddleware.validateParams(userIdParamSchema),
  errorHandler.asyncHandler(async (req, res) => {
    const currentUserId = req.user.id;
    const { userId: targetUserId } = req.params;

    try {
      // Get relationship from current user to target user
      const outgoingRelationship = await SocialController.getRelationship(currentUserId, targetUserId);
      
      // Get relationship from target user to current user
      const incomingRelationship = await SocialController.getRelationship(targetUserId, currentUserId);

      const relationshipStatus = {
        isFollowing: outgoingRelationship?.relationshipType === 'following',
        isFollowedBy: incomingRelationship?.relationshipType === 'following',
        isBlocked: outgoingRelationship?.relationshipType === 'blocked',
        isBlockedBy: incomingRelationship?.relationshipType === 'blocked',
        canInteract: !outgoingRelationship?.relationshipType === 'blocked' && 
                    !incomingRelationship?.relationshipType === 'blocked'
      };

      res.json({
        success: true,
        data: {
          relationship: relationshipStatus
        }
      });

    } catch (error) {
      throw error;
    }
  })
);

module.exports = router;
