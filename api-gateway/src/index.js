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
app.use(express.json());

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
const services = {
  user: {
    target: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: {
      '^/api/users': ''
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
app.use('/api/users/register', createProxyMiddleware(services.user));
app.use('/api/users/login', createProxyMiddleware(services.user));
app.use('/api/users/verify', createProxyMiddleware(services.user));

// Protected routes (authentication required)
app.use('/api/users', authenticateToken, createProxyMiddleware(services.user));
app.use('/api/content', authenticateToken, createProxyMiddleware(services.content));
app.use('/api/notifications', authenticateToken, createProxyMiddleware(services.notifications));
app.use('/api/chat', authenticateToken, createProxyMiddleware(services.chat));
app.use('/api/analytics', authenticateToken, createProxyMiddleware(services.analytics));

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

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`🔗 Service endpoints:`);
  console.log(`   Users: /api/users`);
  console.log(`   Content: /api/content`);
  console.log(`   Notifications: /api/notifications`);
  console.log(`   Chat: /api/chat`);
  console.log(`   Analytics: /api/analytics`);
});

module.exports = app;