// src/routes/auth.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');
const errorHandler = require('../middleware/errorHandler');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  changePasswordSchema
} = require('../validation/schemas');

// Public routes (no authentication required)

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register',
  validationMiddleware.sanitizeInput,
  validationMiddleware.validateBody(registerSchema),
  errorHandler.asyncHandler(UserController.register)
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
  validationMiddleware.sanitizeInput,
  validationMiddleware.validateBody(loginSchema),
  errorHandler.asyncHandler(UserController.login)
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh',
  validationMiddleware.sanitizeInput,
  errorHandler.asyncHandler(UserController.refreshToken)
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password',
  validationMiddleware.sanitizeInput,
  validationMiddleware.validateBody(forgotPasswordSchema),
  errorHandler.asyncHandler(UserController.forgotPassword)
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password',
  validationMiddleware.sanitizeInput,
  validationMiddleware.validateBody(resetPasswordSchema),
  errorHandler.asyncHandler(UserController.resetPassword)
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email',
  validationMiddleware.sanitizeInput,
  validationMiddleware.validateBody(verifyEmailSchema),
  errorHandler.asyncHandler(UserController.verifyEmail)
);

// Protected routes (authentication required)

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout',
  authMiddleware.authenticate,
  validationMiddleware.sanitizeInput,
  errorHandler.asyncHandler(UserController.logout)
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password',
  authMiddleware.authenticate,
  validationMiddleware.sanitizeInput,
  validationMiddleware.validateBody(changePasswordSchema),
  errorHandler.asyncHandler(UserController.changePassword)
);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get user sessions
 * @access  Private
 */
router.get('/sessions',
  authMiddleware.authenticate,
  errorHandler.asyncHandler(UserController.getUserSessions)
);

/**
 * @route   DELETE /api/auth/sessions
 * @desc    Revoke all user sessions
 * @access  Private
 */
router.delete('/sessions',
  authMiddleware.authenticate,
  errorHandler.asyncHandler(UserController.revokeAllSessions)
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me',
  authMiddleware.authenticate,
  errorHandler.asyncHandler(UserController.getProfile)
);

module.exports = router;
