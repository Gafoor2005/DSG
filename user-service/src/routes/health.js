// src/routes/health.js
const express = require('express');
const router = express.Router();
const database = require('../database/connection');
const logger = require('../utils/logger');

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', async (req, res) => {
  const healthCheck = {
    service: 'user-service',
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      memory: 'ok'
    }
  };

  try {
    // Check database connection
    const dbHealthy = await database.healthCheck();
    healthCheck.checks.database = dbHealthy ? 'ok' : 'error';

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    healthCheck.memory = memUsageMB;

    // Overall status
    const allChecksOk = Object.values(healthCheck.checks).every(status => status === 'ok');
    healthCheck.status = allChecksOk ? 'ok' : 'degraded';

    const statusCode = allChecksOk ? 200 : 503;
    
    res.status(statusCode).json(healthCheck);

  } catch (error) {
    logger.errorWithContext(error, { operation: 'health_check' });
    
    healthCheck.status = 'error';
    healthCheck.checks.database = 'error';
    healthCheck.error = error.message;

    res.status(503).json(healthCheck);
  }
});

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check with more metrics
 * @access  Public
 */
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Database connection test
    const dbStart = Date.now();
    const dbHealthy = await database.healthCheck();
    const dbResponseTime = Date.now() - dbStart;

    // Memory and CPU info
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const detailedHealth = {
      service: 'user-service',
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: {
        seconds: process.uptime(),
        human: formatUptime(process.uptime())
      },
      database: {
        status: dbHealthy ? 'connected' : 'disconnected',
        responseTime: `${dbResponseTime}ms`
      },
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        heapUsagePercentage: `${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%`
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      responseTime: `${Date.now() - startTime}ms`
    };

    const statusCode = dbHealthy ? 200 : 503;
    res.status(statusCode).json(detailedHealth);

  } catch (error) {
    logger.errorWithContext(error, { operation: 'detailed_health_check' });
    
    res.status(503).json({
      service: 'user-service',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Helper function to format uptime
function formatUptime(uptimeSeconds) {
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join(' ') || '0s';
}

module.exports = router;
