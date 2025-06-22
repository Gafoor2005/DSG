// src/routes/users.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');
const errorHandler = require('../middleware/errorHandler');
const {
  updateProfileSchema,
  searchUserSchema,
  notificationPreferencesSchema,
  deactivateAccountSchema,
  paginationSchema
} = require('../validation/schemas');
const Joi = require('joi');

// Parameter validation schemas
const userIdParamSchema = Joi.object({
  userId: Joi.string().uuid().required()
});

// Public routes (optional authentication)

/**
 * @route   GET /api/users/search
 * @desc    Search users
 * @access  Public/Private (optional auth for better results)
 */
router.get('/search',
  authMiddleware.optionalAuth,
  validationMiddleware.validateQuery(searchUserSchema),
  errorHandler.asyncHandler(UserController.searchUsers)
);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user profile by ID
 * @access  Public/Private (optional auth for privacy control)
 */
router.get('/:userId',
  authMiddleware.optionalAuth,
  validationMiddleware.validateParams(userIdParamSchema),
  errorHandler.asyncHandler(UserController.getUserById)
);

// Protected routes (authentication required)

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile',
  authMiddleware.authenticate,
  validationMiddleware.sanitizeInput,
  validationMiddleware.validateBody(updateProfileSchema),
  errorHandler.asyncHandler(UserController.updateProfile)
);

/**
 * @route   PUT /api/users/notifications
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/notifications',
  authMiddleware.authenticate,
  validationMiddleware.sanitizeInput,
  validationMiddleware.validateBody(notificationPreferencesSchema),
  errorHandler.asyncHandler(UserController.updateNotificationPreferences)
);

/**
 * @route   POST /api/users/deactivate
 * @desc    Deactivate user account
 * @access  Private
 */
router.post('/deactivate',
  authMiddleware.authenticate,
  validationMiddleware.sanitizeInput,
  validationMiddleware.validateBody(deactivateAccountSchema),
  errorHandler.asyncHandler(UserController.deactivateAccount)
);

/**
 * @route   GET /api/users/:userId/stats
 * @desc    Get user statistics
 * @access  Public/Private (optional auth)
 */
router.get('/:userId/stats',
  authMiddleware.optionalAuth,
  validationMiddleware.validateParams(userIdParamSchema),
  errorHandler.asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const UserRepository = require('../models/User');
    
    try {
      const stats = await UserRepository.getUserStats(userId);
      
      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      throw error;
    }
  })
);

module.exports = router;
