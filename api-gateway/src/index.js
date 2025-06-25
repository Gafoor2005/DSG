const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const redis = require('redis');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Redis client for caching and session management
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().catch(console.error);

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
      console.error('User service error:', err.message);
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
      console.error('Content service error:', err.message);
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
      console.error('Notification service error:', err.message);
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
      console.error('Chat service error:', err.message);
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
      console.error('Analytics service error:', err.message);
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
    console.error('🚨 Auth service error:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      syscall: err.syscall,
      originalUrl: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });
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
    console.log(`🔄 [${new Date().toISOString()}] Proxying auth request: ${req.method} ${req.originalUrl} → ${proxyReq.path}`);
    
    // Set longer timeout on the proxy request
    proxyReq.setTimeout(60000, () => {
      console.error('🚨 Proxy request timeout after 60 seconds');
      proxyReq.destroy();
    });
    
    // Log request info (no body since we're not parsing it)
    console.log(`📤 Request headers:`, req.headers);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ [${new Date().toISOString()}] Auth response received: ${proxyRes.statusCode} for ${req.originalUrl}`);
    console.log(`📥 Response headers:`, proxyRes.headers);
    
    // Log response body for debugging (only for small responses)
    let body = '';
    proxyRes.on('data', (chunk) => {
      body += chunk;
    });
    proxyRes.on('end', () => {
      if (body.length < 1000) { // Only log small responses
        try {
          const parsedBody = JSON.parse(body);
          console.log(`📥 Response body:`, { ...parsedBody, data: parsedBody.data ? '...' : undefined });
        } catch (e) {
          console.log(`📥 Response body (raw):`, body.substring(0, 200));
        }
      }
    });
  },
  onProxyReqError: (err, req, res) => {
    console.error('🚨 Proxy request error:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Failed to reach authentication service' });
    }
  },
  onProxyResError: (err, req, res) => {
    console.error('🚨 Proxy response error:', err.message);
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
    console.error('User service error:', err.message);
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
    console.error('Social service error:', err.message);
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
    console.error('Chat WebSocket error:', err.message);
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
  console.error('Gateway error:', err);
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
  console.log('SIGTERM received, shutting down gracefully');
  await redisClient.quit();
  process.exit(0);
});

const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`🔗 Service endpoints:`);
  console.log(`   Auth: /api/auth`);
  console.log(`   Users: /api/users`);
  console.log(`   Content: /api/content`);
  console.log(`   Notifications: /api/notifications`);
  console.log(`   Chat: /api/chat`);
  console.log(`   Analytics: /api/analytics`);
});

// Set server timeout to prevent request abortion
server.timeout = 120000; // 2 minutes timeout
server.keepAliveTimeout = 65000; // Keep-alive timeout
server.headersTimeout = 66000; // Headers timeout

module.exports = app;