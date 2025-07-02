const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const promClient = require('prom-client');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Prometheus metrics setup
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// Custom metrics
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service']
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['service']
});

const proxyErrors = new promClient.Counter({
  name: 'proxy_errors_total',
  help: 'Total number of proxy errors',
  labelNames: ['target_service', 'error_type']
});

// Redis client for caching and session management
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().catch((error) => {
  logger.error('Redis connection failed', { error: error.message, stack: error.stack });
});

// Apply request logging middleware
app.use(logger.requestLogger);

// Middleware
app.use(helmet());
app.use(cors());

// Apply JSON parsing only to non-proxy routes
app.use((req, res, next) => {
  // Skip JSON parsing for proxy routes to avoid body parsing conflicts
  if (req.path.startsWith('/api/auth') || 
      req.path.startsWith('/api/users') ||
      req.path.startsWith('/api/content') ||
      req.path.startsWith('/api/notifications') ||
      req.path.startsWith('/api/chat') ||
      req.path.startsWith('/api/analytics')) {
    return next();
  }
  // Apply JSON parsing for non-proxy routes
  express.json()(req, res, next);
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Track active connections
  activeConnections.inc({ service: 'api-gateway' });
  
  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';
    
    // Record metrics
    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode,
      service: 'api-gateway'
    });
    
    httpRequestDuration.observe({
      method: req.method,
      route: route,
      status_code: res.statusCode,
      service: 'api-gateway'
    }, duration);
    
    // Decrease active connections
    activeConnections.dec({ service: 'api-gateway' });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Check if token is blacklisted in Redis
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      redis: redisClient.isReady ? 'connected' : 'disconnected'
    }
  });
});

// Service proxy configurations
const services = {  user: {
    target: process.env.USER_SERVICE_URL || 'http://user-service:3000',
    changeOrigin: true,
    pathRewrite: {
      '^/api/users': '/api'
    },
    onError: (err, req, res) => {
      logger.error('User service proxy error', { 
        error: err.message, 
        code: err.code,
        method: req.method,
        url: req.url 
      });
      proxyErrors.inc({ target_service: 'user-service', error_type: err.code || 'unknown' });
      res.status(503).json({ error: 'User service unavailable' });
    }
  },
  content: {
    target: process.env.CONTENT_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: {
      '^/api/content': ''
    },
    onError: (err, req, res) => {
      logger.error('Content service proxy error', { 
        error: err.message, 
        code: err.code,
        method: req.method,
        url: req.url 
      });
      res.status(503).json({ error: 'Content service unavailable' });
    }
  },
  notifications: {
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: {
      '^/api/notifications': ''
    },
    onError: (err, req, res) => {
      logger.error('Notification service proxy error', { 
        error: err.message, 
        code: err.code,
        method: req.method,
        url: req.url 
      });
      res.status(503).json({ error: 'Notification service unavailable' });
    }
  },
  chat: {
    target: process.env.CHAT_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true,
    pathRewrite: {
      '^/api/chat': ''
    },
    onError: (err, req, res) => {
      logger.error('Chat service proxy error', { 
        error: err.message, 
        code: err.code,
        method: req.method,
        url: req.url 
      });
      res.status(503).json({ error: 'Chat service unavailable' });
    }
  },
  analytics: {
    target: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
    pathRewrite: {
      '^/api/analytics': ''
    },
    onError: (err, req, res) => {
      logger.error('Analytics service proxy error', { 
        error: err.message, 
        code: err.code,
        method: req.method,
        url: req.url 
      });
      res.status(503).json({ error: 'Analytics service unavailable' });
    }
  }
};

// Public routes (no authentication required)
app.use('/api/auth', createProxyMiddleware({
  target: process.env.USER_SERVICE_URL || 'http://user-service:3000',
  changeOrigin: true,
  timeout: 60000, // Increase to 60 seconds timeout
  proxyTimeout: 60000, // Increase to 60 seconds proxy timeout
  followRedirects: false, // Disable redirects to avoid confusion
  secure: false, // Disable SSL verification for development
  pathRewrite: {
    '^/api/auth': '/api/auth'
  },
  onError: (err, req, res) => {
    logger.error('Auth service proxy error', {
      error: err.message,
      code: err.code,
      errno: err.errno,
      syscall: err.syscall,
      url: req.originalUrl,
      method: req.method
    });
    proxyErrors.inc({ target_service: 'user-service', error_type: err.code || 'auth_error' });
    if (!res.headersSent) {
      res.status(503).json({ 
        success: false,
        error: 'Authentication service unavailable', 
        details: err.message,
        code: err.code
      });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info('Proxying auth request', {
      method: req.method,
      originalUrl: req.originalUrl,
      proxyPath: proxyReq.path,
      headers: req.headers
    });
    
    // Set longer timeout on the proxy request
    proxyReq.setTimeout(60000, () => {
      logger.error('Proxy request timeout after 60 seconds', {
        method: req.method,
        originalUrl: req.originalUrl
      });
      proxyReq.destroy();
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    logger.info('Auth response received', {
      statusCode: proxyRes.statusCode,
      originalUrl: req.originalUrl,
      method: req.method,
      headers: proxyRes.headers
    });
    
    // Log response body for debugging (only for small responses)
    let body = '';
    proxyRes.on('data', (chunk) => {
      body += chunk;
    });
    proxyRes.on('end', () => {
      if (body.length < 1000) { // Only log small responses
        try {
          const parsedBody = JSON.parse(body);
          logger.debug('Auth response body', { 
            responseBody: { ...parsedBody, data: parsedBody.data ? '...' : undefined },
            originalUrl: req.originalUrl
          });
        } catch (e) {
          logger.debug('Auth response body (raw)', { 
            responseBody: body.substring(0, 200),
            originalUrl: req.originalUrl
          });
        }
      }
    });
  },
  onProxyReqError: (err, req, res) => {
    logger.error('Proxy request error', { 
      error: err.message, 
      method: req.method, 
      originalUrl: req.originalUrl 
    });
    if (!res.headersSent) {
      res.status(503).json({ error: 'Failed to reach authentication service' });
    }
  },
  onProxyResError: (err, req, res) => {
    logger.error('Proxy response error', { 
      error: err.message, 
      method: req.method, 
      originalUrl: req.originalUrl 
    });
    if (!res.headersSent) {
      res.status(503).json({ error: 'Error receiving response from authentication service' });
    }
  }
}));

// Protected routes (authentication required)
app.use('/api/users', authenticateToken, createProxyMiddleware({
  target: process.env.USER_SERVICE_URL || 'http://user-service:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': '/api/users'
  },
  onError: (err, req, res) => {
    logger.error('User service proxy error', { 
      error: err.message, 
      method: req.method, 
      url: req.url 
    });
    res.status(503).json({ error: 'User service unavailable' });
  }
}));
app.use('/api/social', authenticateToken, createProxyMiddleware({
  target: process.env.USER_SERVICE_URL || 'http://user-service:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/social': '/api/social'
  },
  onError: (err, req, res) => {
    logger.error('Social service proxy error', { 
      error: err.message, 
      method: req.method, 
      url: req.url 
    });
    res.status(503).json({ error: 'Social service unavailable' });
  }
}));

// Comment out unimplemented services to avoid errors
// app.use('/api/content', authenticateToken, createProxyMiddleware(services.content));
// app.use('/api/notifications', authenticateToken, createProxyMiddleware(services.notifications));
// app.use('/api/chat', authenticateToken, createProxyMiddleware(services.chat));
// app.use('/api/analytics', authenticateToken, createProxyMiddleware(services.analytics));

// WebSocket proxy for real-time features
const { createProxyMiddleware: createWSProxy } = require('http-proxy-middleware');

// Chat WebSocket proxy
app.use('/ws/chat', createWSProxy({
  target: process.env.CHAT_SERVICE_URL || 'http://localhost:3004',
  ws: true,
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Chat WebSocket proxy error', { 
      error: err.message, 
      method: req.method, 
      url: req.url 
    });
  }
}));

// Logging middleware for analytics
app.use((req, res, next) => {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id || 'anonymous'
  };

  // Send to analytics service asynchronously
  if (process.env.NODE_ENV === 'production') {
    redisClient.lPush('api_logs', JSON.stringify(logData));
  }

  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Gateway error', { 
    error: err.message, 
    stack: err.stack,
    method: req.method,
    url: req.url,
    requestId: req.headers['x-request-id'] || 'unknown'
  });
  res.status(500).json({ 
    error: 'Internal server error',
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redisClient.quit();
  process.exit(0);
});

const server = app.listen(PORT, () => {
  logger.info('API Gateway started', { 
    port: PORT,
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      content: '/api/content',
      notifications: '/api/notifications',
      chat: '/api/chat',
      analytics: '/api/analytics'
    }
  });
});

// Set server timeout to prevent request abortion
server.timeout = 120000; // 2 minutes timeout
server.keepAliveTimeout = 65000; // Keep-alive timeout
server.headersTimeout = 66000; // Headers timeout

module.exports = app;