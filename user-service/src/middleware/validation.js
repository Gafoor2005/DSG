// src/middleware/validation.js
const logger = require('../utils/logger');

class ValidationMiddleware {
  // Generic validation middleware factory
  validate(schema, source = 'body') {
    return (req, res, next) => {
      const data = req[source];
      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        logger.business('validation_failed', req.user?.id || 'anonymous', {
          source,
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          })),
          ipAddress: req.ip
        });

        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }

      // Replace request data with validated and sanitized data
      req[source] = value;
      next();
    };
  }

  // Validate query parameters
  validateQuery(schema) {
    return this.validate(schema, 'query');
  }

  // Validate route parameters
  validateParams(schema) {
    return this.validate(schema, 'params');
  }

  // Validate request body
  validateBody(schema) {
    return this.validate(schema, 'body');
  }

  // Sanitize user input to prevent XSS
  sanitizeInput(req, res, next) {
    const sanitize = (obj) => {
      if (typeof obj === 'string') {
        return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                 .replace(/javascript:/gi, '')
                 .replace(/on\w+=/gi, '');
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      
      if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitize(value);
        }
        return sanitized;
      }
      
      return obj;
    };

    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);

    next();
  }
}

module.exports = new ValidationMiddleware();
