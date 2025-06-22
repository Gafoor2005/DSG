// src/controllers/userController.js
const UserRepository = require('../models/User');
const AuthService = require('../services/authService');
const logger = require('../utils/logger');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  searchUserSchema,
  followUserSchema,
  blockUserSchema,
  reportUserSchema,
  notificationPreferencesSchema,
  deactivateAccountSchema
} = require('../validation/schemas');

class UserController {
  // Register new user
  async register(req, res) {
    try {
      // Validate input
      const { error, value } = registerSchema.validate(req.body);
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

      // Check if user already exists
      const existingUser = await UserRepository.checkExistence(value.username, value.email);
      if (existingUser.usernameExists) {
        return res.status(409).json({
          success: false,
          message: 'Username already exists'
        });
      }
      if (existingUser.emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }

      // Extract device info
      const deviceInfo = AuthService.extractDeviceInfo(req);
      const ipAddress = req.ip;

      // Register user using AuthService
      const result = await AuthService.register(value, deviceInfo, ipAddress);

      logger.business('user_registered', result.user.id, {
        username: result.user.username,
        email: result.user.email,
        ipAddress
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: result.user.id,
            username: result.user.username,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            isVerified: result.user.isVerified,
            createdAt: result.user.createdAt          },
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
          }
        }
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'register_user',
        body: { ...req.body, password: '[REDACTED]' }
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      // Validate input
      const { error, value } = loginSchema.validate(req.body);
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

      // Extract device info
      const deviceInfo = AuthService.extractDeviceInfo(req);
      const ipAddress = req.ip;

      // Login user
      const result = await AuthService.login(
        value.identifier,
        value.password,
        deviceInfo,
        ipAddress
      );

      logger.authLogger('user_login', result.user.id, {
        identifier: value.identifier,
        ipAddress,
        rememberMe: value.rememberMe
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: result.user.id,
            username: result.user.username,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            profilePicture: result.user.profilePicture,
            lastLoginAt: result.user.lastLoginAt
          },
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
          }
        }
      });

    } catch (error) {
      logger.security('login_attempt_failed', {
        identifier: req.body.identifier,
        ipAddress: req.ip,
        error: error.message
      });

      // Return generic error message for security
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      const result = await AuthService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        }
      });

    } catch (error) {
      logger.security('refresh_token_failed', {
        error: error.message,
        ipAddress: req.ip
      });

      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.id;

      await AuthService.logout(refreshToken);

      logger.authLogger('user_logout', userId, {
        ipAddress: req.ip
      });

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      logger.errorWithContext(error, { operation: 'logout_user' });

      res.status(500).json({
        success: false,
        message: 'Error during logout'
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await UserRepository.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            bio: user.bio,
            profilePicture: user.profilePicture,
            coverPhoto: user.coverPhoto,
            dateOfBirth: user.dateOfBirth,
            phone: user.phone,
            location: user.location,
            website: user.website,
            occupation: user.occupation,
            interests: user.interests,
            socialLinks: user.socialLinks,
            privacySettings: user.privacySettings,
            notificationPreferences: user.notificationPreferences,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
          },
          stats: await UserRepository.getUserStats(userId)
        }
      });

    } catch (error) {
      logger.errorWithContext(error, { operation: 'get_user_profile', userId: req.user.id });

      res.status(500).json({
        success: false,
        message: 'Error retrieving profile'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;

      // Validate input
      const { error, value } = updateProfileSchema.validate(req.body);
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

      // Update profile
      const updatedUser = await UserRepository.updateProfile(userId, value);

      logger.business('profile_updated', userId, {
        updatedFields: Object.keys(value)
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser
        }
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'update_profile',
        userId: req.user.id,
        updateData: req.body
      });

      res.status(500).json({
        success: false,
        message: 'Error updating profile'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = req.user.id;

      // Validate input
      const { error, value } = changePasswordSchema.validate(req.body);
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

      // Get current user
      const user = await UserRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await UserRepository.verifyPassword(
        value.currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Change password
      await UserRepository.changePassword(userId, value.newPassword);

      // Revoke all existing sessions except current one
      await AuthService.revokeAllUserSessions(userId);

      logger.security('password_changed', {
        userId,
        ipAddress: req.ip
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'change_password',
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Error changing password'
      });
    }
  }

  // Search users
  async searchUsers(req, res) {
    try {
      // Validate input
      const { error, value } = searchUserSchema.validate(req.query);
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

      const users = await UserRepository.searchUsers(
        value.query,
        value.limit,
        value.offset
      );

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            limit: value.limit,
            offset: value.offset,
            total: users.length
          }
        }
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'search_users',
        query: req.query
      });

      res.status(500).json({
        success: false,
        message: 'Error searching users'
      });
    }
  }

  // Get user by ID (public profile)
  async getUserById(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;

      const user = await UserRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Apply privacy filters based on user's privacy settings
      const publicUser = {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        bio: user.bio,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      };

      // Add additional fields based on privacy settings and relationship
      if (user.privacySettings?.profileVisibility === 'public' || 
          user.id === currentUserId) {
        publicUser.location = user.location;
        publicUser.website = user.website;
        publicUser.occupation = user.occupation;
        publicUser.interests = user.interests;
      }

      const stats = await UserRepository.getUserStats(userId);

      res.json({
        success: true,
        data: {
          user: publicUser,
          stats
        }
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'get_user_by_id',
        userId: req.params.userId
      });

      res.status(500).json({
        success: false,
        message: 'Error retrieving user'
      });
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(req, res) {
    try {
      const userId = req.user.id;

      // Validate input
      const { error, value } = notificationPreferencesSchema.validate(req.body);
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

      const updatedUser = await UserRepository.updateProfile(userId, {
        notificationPreferences: value
      });

      logger.business('notification_preferences_updated', userId);

      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: {
          notificationPreferences: updatedUser.notificationPreferences
        }
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'update_notification_preferences',
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Error updating notification preferences'
      });
    }
  }

  // Deactivate account
  async deactivateAccount(req, res) {
    try {
      const userId = req.user.id;

      // Validate input
      const { error, value } = deactivateAccountSchema.validate(req.body);
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

      // Get current user
      const user = await UserRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify password
      const isPasswordValid = await UserRepository.verifyPassword(
        value.password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Password is incorrect'
        });
      }

      // Deactivate user
      await UserRepository.deactivateUser(userId);

      // Revoke all sessions
      await AuthService.revokeAllUserSessions(userId);

      logger.business('account_deactivated', userId, {
        reason: value.reason,
        feedback: value.feedback
      });

      res.json({
        success: true,
        message: 'Account deactivated successfully'
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'deactivate_account',
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Error deactivating account'
      });
    }
  }

  // Get user sessions
  async getUserSessions(req, res) {
    try {
      const userId = req.user.id;
      const sessions = await AuthService.getUserSessions(userId);

      res.json({
        success: true,
        data: {
          sessions: sessions.map(session => ({
            id: session.id,
            deviceInfo: session.deviceInfo,
            ipAddress: session.ipAddress,
            lastActiveAt: session.lastActiveAt,
            createdAt: session.createdAt,
            isCurrent: session.refreshToken === req.body.currentRefreshToken
          }))
        }
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'get_user_sessions',
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Error retrieving sessions'
      });
    }
  }

  // Revoke all sessions
  async revokeAllSessions(req, res) {
    try {
      const userId = req.user.id;
      const deletedCount = await AuthService.revokeAllUserSessions(userId);

      logger.security('all_sessions_revoked', {
        userId,
        deletedCount,
        ipAddress: req.ip
      });

      res.json({
        success: true,
        message: `${deletedCount} sessions revoked successfully`
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'revoke_all_sessions',
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Error revoking sessions'
      });
    }
  }

  // Forgot password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Find user by email
      const user = await UserRepository.findByEmail(email);
      if (!user) {
        // Return success even if user not found (security best practice)
        return res.json({
          success: true,
          message: 'If the email exists, a password reset link has been sent'
        });
      }

      // Generate reset token
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token in database (you'll need to add this to your User model)
      // await UserRepository.storePasswordResetToken(user.id, resetToken, resetTokenExpiry);

      // TODO: Send email with reset link
      // await EmailService.sendPasswordResetEmail(user.email, resetToken);

      logger.business('password_reset_requested', user.id, {
        email: user.email,
        ipAddress: req.ip
      });

      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'forgot_password',
        email: req.body.email
      });

      res.status(500).json({
        success: false,
        message: 'Error processing password reset request'
      });
    }
  }

  // Reset password
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      // TODO: Verify reset token and get user
      // const user = await UserRepository.findByPasswordResetToken(token);
      // if (!user || user.resetTokenExpiry < new Date()) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Invalid or expired reset token'
      //   });
      // }

      // For now, return placeholder response
      res.status(501).json({
        success: false,
        message: 'Password reset functionality not yet implemented'
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'reset_password'
      });

      res.status(500).json({
        success: false,
        message: 'Error resetting password'
      });
    }
  }

  // Verify email
  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      // TODO: Verify email token and update user
      // const user = await UserRepository.findByEmailVerificationToken(token);
      // if (!user) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Invalid verification token'
      //   });
      // }

      // await UserRepository.markEmailAsVerified(user.id);

      // For now, return placeholder response
      res.status(501).json({
        success: false,
        message: 'Email verification functionality not yet implemented'
      });

    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'verify_email'
      });

      res.status(500).json({
        success: false,
        message: 'Error verifying email'
      });
    }
  }
}

module.exports = new UserController();
