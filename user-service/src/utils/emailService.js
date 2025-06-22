// src/utils/emailService.js
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initialize();
  }

  // Initialize email service (will be expanded when email service is needed)
  initialize() {
    try {
      // For now, we'll just log emails instead of sending them
      // In production, you would configure nodemailer here
      this.isConfigured = process.env.EMAIL_HOST && process.env.EMAIL_USER;
      
      if (this.isConfigured) {
        logger.info('Email service initialized');
      } else {
        logger.warn('Email service not configured - emails will be logged only');
      }
    } catch (error) {
      logger.errorWithContext(error, { operation: 'initialize_email_service' });
      this.isConfigured = false;
    }
  }

  // Send verification email
  async sendVerificationEmail(userEmail, username, verificationToken) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
      
      const emailData = {
        to: userEmail,
        subject: 'Verify Your Email Address',
        html: this.generateVerificationEmailHTML(username, verificationUrl),
        text: this.generateVerificationEmailText(username, verificationUrl)
      };

      if (this.isConfigured) {
        // TODO: Implement actual email sending with nodemailer
        logger.info('Email would be sent', { to: userEmail, subject: emailData.subject });
      } else {
        // Log email for development
        logger.info('📧 Verification Email (Development Mode)', {
          to: userEmail,
          subject: emailData.subject,
          verificationUrl,
          message: `Hi ${username}, please verify your email by visiting: ${verificationUrl}`
        });
      }

      return true;
    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'send_verification_email', 
        userEmail 
      });
      throw error;
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(userEmail, username, resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      const emailData = {
        to: userEmail,
        subject: 'Reset Your Password',
        html: this.generatePasswordResetEmailHTML(username, resetUrl),
        text: this.generatePasswordResetEmailText(username, resetUrl)
      };

      if (this.isConfigured) {
        // TODO: Implement actual email sending
        logger.info('Email would be sent', { to: userEmail, subject: emailData.subject });
      } else {
        // Log email for development
        logger.info('📧 Password Reset Email (Development Mode)', {
          to: userEmail,
          subject: emailData.subject,
          resetUrl,
          message: `Hi ${username}, reset your password by visiting: ${resetUrl}`
        });
      }

      return true;
    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'send_password_reset_email', 
        userEmail 
      });
      throw error;
    }
  }

  // Send welcome email
  async sendWelcomeEmail(userEmail, username) {
    try {
      const emailData = {
        to: userEmail,
        subject: 'Welcome to Our Platform!',
        html: this.generateWelcomeEmailHTML(username),
        text: this.generateWelcomeEmailText(username)
      };

      if (this.isConfigured) {
        // TODO: Implement actual email sending
        logger.info('Email would be sent', { to: userEmail, subject: emailData.subject });
      } else {
        // Log email for development
        logger.info('📧 Welcome Email (Development Mode)', {
          to: userEmail,
          subject: emailData.subject,
          message: `Welcome ${username}! Thanks for joining our platform.`
        });
      }

      return true;
    } catch (error) {
      logger.errorWithContext(error, { 
        operation: 'send_welcome_email', 
        userEmail 
      });
      throw error;
    }
  }

  // Generate verification email HTML
  generateVerificationEmailHTML(username, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            background-color: #007bff; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 4px; 
            display: inline-block; 
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Welcome ${username}!</h2>
          <p>Thank you for registering with our platform. To complete your registration, please verify your email address by clicking the button below:</p>
          
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
          
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          
          <p>This verification link will expire in 24 hours for security reasons.</p>
          
          <div class="footer">
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate verification email text
  generateVerificationEmailText(username, verificationUrl) {
    return `
      Welcome ${username}!
      
      Thank you for registering with our platform. To complete your registration, please verify your email address by visiting:
      
      ${verificationUrl}
      
      This verification link will expire in 24 hours for security reasons.
      
      If you didn't create an account with us, please ignore this email.
    `;
  }

  // Generate password reset email HTML
  generatePasswordResetEmailHTML(username, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            background-color: #dc3545; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 4px; 
            display: inline-block; 
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Password Reset Request</h2>
          <p>Hi ${username},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          
          <a href="${resetUrl}" class="button">Reset Password</a>
          
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          
          <p>This password reset link will expire in 1 hour for security reasons.</p>
          
          <div class="footer">
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate password reset email text
  generatePasswordResetEmailText(username, resetUrl) {
    return `
      Password Reset Request
      
      Hi ${username},
      
      We received a request to reset your password. Visit the following link to create a new password:
      
      ${resetUrl}
      
      This password reset link will expire in 1 hour for security reasons.
      
      If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
    `;
  }

  // Generate welcome email HTML
  generateWelcomeEmailHTML(username) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Welcome to Our Platform!</h2>
          </div>
          
          <p>Hi ${username},</p>
          <p>Welcome to our social platform! We're excited to have you as part of our community.</p>
          
          <p>Here are some things you can do to get started:</p>
          <ul>
            <li>Complete your profile information</li>
            <li>Upload a profile picture</li>
            <li>Start connecting with other users</li>
            <li>Explore the platform features</li>
          </ul>
          
          <p>If you have any questions or need help getting started, feel free to reach out to our support team.</p>
          
          <p>Welcome aboard!</p>
        </div>
      </body>
      </html>
    `;
  }

  // Generate welcome email text
  generateWelcomeEmailText(username) {
    return `
      Welcome to Our Platform!
      
      Hi ${username},
      
      Welcome to our social platform! We're excited to have you as part of our community.
      
      Here are some things you can do to get started:
      - Complete your profile information
      - Upload a profile picture
      - Start connecting with other users
      - Explore the platform features
      
      If you have any questions or need help getting started, feel free to reach out to our support team.
      
      Welcome aboard!
    `;
  }
}

module.exports = new EmailService();
