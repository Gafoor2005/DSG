// src/utils/logger.js
const winston = require('winston');
const path = require('path');
const { ElasticsearchTransport } = require('winston-elasticsearch');

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}] ${message} ${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Elasticsearch configuration
const esTransportOpts = {
  level: 'info',
  clientOpts: {
    node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
  },
  index: 'microservices-logs',
  indexTemplate: {
    name: 'microservices-logs',
    patterns: ['microservices-logs-*'],
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
    },
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        level: { type: 'keyword' },
        message: { type: 'text' },
        service: { type: 'keyword' },
        method: { type: 'keyword' },
        url: { type: 'keyword' },
        statusCode: { type: 'integer' },
        duration: { type: 'keyword' },
        userId: { type: 'keyword' },
        ip: { type: 'ip' },
        userAgent: { type: 'text' }
      }
    }
  }
};

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { 
    service: process.env.SERVICE_NAME || 'user-service',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      handleExceptions: true,
      handleRejections: true
    }),

    // File transport for error logs only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      handleExceptions: true,
      handleRejections: true
    }),

    // Elasticsearch transport (send logs to ELK stack)
    new ElasticsearchTransport(esTransportOpts)
  ],

  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat
    }),
    new ElasticsearchTransport({
      ...esTransportOpts,
      index: 'microservices-exceptions'
    })
  ],

  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat
    }),
    new ElasticsearchTransport({
      ...esTransportOpts,
      index: 'microservices-rejections'
    })
  ]
});

// Add request logging middleware
logger.requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id || 'anonymous'
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0,
      userId: req.user?.id || 'anonymous'
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Database query logger
logger.queryLogger = (query, params, duration) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Database query', {
      query: query.replace(/\s+/g, ' ').trim(),
      params,
      duration: `${duration}ms`
    });
  }
};

// Auth event logger
logger.authLogger = (event, userId, metadata = {}) => {
  logger.info('Auth event', {
    event,
    userId,
    timestamp: new Date().toISOString(),
    ...metadata
  });
};

// Error logger with context
logger.errorWithContext = (error, context = {}) => {
  logger.error('Application error', {
    message: error.message,
    stack: error.stack,
    ...context
  });
};

// Performance logger
logger.performance = (operation, duration, metadata = {}) => {
  const level = duration > 1000 ? 'warn' : 'info';
  logger.log(level, 'Performance metric', {
    operation,
    duration: `${duration}ms`,
    ...metadata
  });
};

// Security event logger
logger.security = (event, details = {}) => {
  logger.warn('Security event', {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Business logic logger
logger.business = (action, userId, details = {}) => {
  logger.info('Business action', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

module.exports = logger;