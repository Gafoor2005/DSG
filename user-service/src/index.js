// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import modules
const database = require('./database/connection');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { apiRoutes, healthRoutes } = require('./routes');

class UserService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.isShuttingDown = false;
  }

  async initialize() {
    try {
      // Connect to database first
      await this.connectDatabase();
      
      // Setup middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup error handling
      this.setupErrorHandling();
      
      // Start server
      await this.startServer();
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'service_initialization' });
      process.exit(1);
    }
  }

  async connectDatabase() {
    logger.info('🔌 Connecting to database...');
    await database.connect();
  }

  setupMiddleware() {
    logger.info('⚙️ Setting up middleware...');

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    const corsOptions = {
      origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
        
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
    };

    this.app.use(cors(corsOptions));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path.startsWith('/health');
      },
      handler: (req, res) => {
        logger.security('rate_limit_exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        res.status(429).json({
          success: false,
          message: 'Too many requests from this IP, please try again later.'
        });
      }
    });

    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        try {
          JSON.parse(buf);
        } catch (e) {
          res.status(400).json({
            success: false,
            message: 'Invalid JSON payload'
          });
          throw new Error('Invalid JSON');
        }
      }
    }));

    this.app.use(express.urlencoded({ 
      extended: true,
      limit: '10mb'
    }));

    // Trust proxy (for accurate IP addresses behind load balancers)
    this.app.set('trust proxy', 1);

    // Request logging
    this.app.use(logger.requestLogger);

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.requestId = require('crypto').randomUUID();
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });
  }

  setupRoutes() {
    logger.info('🛣️ Setting up routes...');

    // Health check routes (before API routes)
    this.app.use('/health', healthRoutes);

    // API routes
    this.app.use('/api', apiRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'User Service',
        status: 'running',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        endpoints: {
          api: '/api',
          health: '/health',
          docs: '/api' // API documentation endpoint
        }
      });
    });
  }

  setupErrorHandling() {
    logger.info('🛡️ Setting up error handling...');

    // 404 handler
    this.app.use(errorHandler.notFound);

    // Global error handler
    this.app.use(errorHandler.handleError);

    // Unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.errorWithContext(err, { type: 'unhandledRejection' });
    });

    // Uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.errorWithContext(err, { type: 'uncaughtException' });
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (err) => {
        if (err) {
          reject(err);
        } else {
          logger.info(`🚀 User Service running on port ${this.port}`);
          logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
          logger.info(`🔗 Health check: http://localhost:${this.port}/health`);
          logger.info(`📖 API documentation: http://localhost:${this.port}/api`);
          resolve();
        }
      });

      // Handle server errors
      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`❌ Port ${this.port} is already in use`);
        } else {
          logger.errorWithContext(error, { operation: 'server_error' });
        }
        reject(error);
      });
    });
  }

  async gracefulShutdown(signal) {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    logger.info(`📡 Received ${signal}. Starting graceful shutdown...`);

    // Set timeout for forced shutdown
    const forceShutdownTimeout = setTimeout(() => {
      logger.warn('⚠️ Forced shutdown due to timeout');
      process.exit(1);
    }, 30000); // 30 seconds

    try {
      // Stop accepting new connections
      this.server.close(async () => {
        logger.info('🔌 HTTP server closed');

        try {
          // Close database connections
          await database.disconnect();
          
          clearTimeout(forceShutdownTimeout);
          logger.info('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.errorWithContext(error, { operation: 'graceful_shutdown' });
          process.exit(1);
        }
      });

    } catch (error) {
      logger.errorWithContext(error, { operation: 'graceful_shutdown' });
      clearTimeout(forceShutdownTimeout);
      process.exit(1);
    }
  }

  // Method to get app instance (useful for testing)
  getApp() {
    return this.app;
  }
}

// Initialize and start the service
async function startService() {
  const userService = new UserService();
  await userService.initialize();
  return userService;
}

// Only start the service if this file is run directly
if (require.main === module) {
  startService().catch((error) => {
    logger.errorWithContext(error, { operation: 'service_startup' });
    process.exit(1);
  });
}

module.exports = { UserService, startService };
