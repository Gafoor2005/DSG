// src/middleware/errorHandler.js
const logger = require('../utils/logger');

class ErrorHandler {
  // Global error handler
  handleError(err, req, res, next) {
    logger.errorWithContext(err, {
      url: req.url,
      method: req.method,
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Handle specific error types
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(err.errors).map(e => e.message)
      });
    }

    if (err.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({
        success: false,
        message: 'Resource already exists'
      });
    }

    if (err.code === '23503') { // PostgreSQL foreign key violation
      return res.status(400).json({
        success: false,
        message: 'Invalid reference'
      });
    }

    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }

    // Default error response
    const statusCode = err.statusCode || err.status || 500;
    const message = statusCode === 500 ? 'Internal server error' : err.message;

    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err
      })
    });
  }

  // Handle 404 - Not Found
  notFound(req, res, next) {
    const error = new Error(`Route ${req.originalUrl} not found`);
    error.statusCode = 404;
    next(error);
  }

  // Async error wrapper
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

module.exports = new ErrorHandler();
