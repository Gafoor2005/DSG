// src/utils/metrics.js
const promClient = require('prom-client');

// Enable default metrics collection
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// Custom metrics for user service
const httpRequestsTotal = new promClient.Counter({
  name: 'user_service_http_requests_total',
  help: 'Total number of HTTP requests to user service',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new promClient.Histogram({
  name: 'user_service_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const authAttempts = new promClient.Counter({
  name: 'user_service_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['type', 'result'] // type: login/register, result: success/failure
});

const databaseQueries = new promClient.Counter({
  name: 'user_service_database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table']
});

const databaseQueryDuration = new promClient.Histogram({
  name: 'user_service_database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

const activeUsers = new promClient.Gauge({
  name: 'user_service_active_users',
  help: 'Number of currently active users'
});

const registeredUsers = new promClient.Gauge({
  name: 'user_service_registered_users_total',
  help: 'Total number of registered users'
});

const activeSessions = new promClient.Gauge({
  name: 'user_service_active_sessions',
  help: 'Number of active user sessions'
});

// Middleware to track HTTP requests
const httpMetricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';
    
    // Record metrics
    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode
    });
    
    httpRequestDuration.observe({
      method: req.method,
      route: route,
      status_code: res.statusCode
    }, duration);
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Function to track authentication attempts
const trackAuthAttempt = (type, result) => {
  authAttempts.inc({ type, result });
};

// Function to track database queries
const trackDatabaseQuery = (operation, table, duration) => {
  databaseQueries.inc({ operation, table });
  if (duration !== undefined) {
    databaseQueryDuration.observe({ operation, table }, duration / 1000);
  }
};

// Function to update user counts
const updateUserCounts = (activeCount, totalCount, sessionCount) => {
  if (activeCount !== undefined) activeUsers.set(activeCount);
  if (totalCount !== undefined) registeredUsers.set(totalCount);
  if (sessionCount !== undefined) activeSessions.set(sessionCount);
};

module.exports = {
  register: promClient.register,
  httpMetricsMiddleware,
  trackAuthAttempt,
  trackDatabaseQuery,
  updateUserCounts,
  metrics: {
    httpRequestsTotal,
    httpRequestDuration,
    authAttempts,
    databaseQueries,
    databaseQueryDuration,
    activeUsers,
    registeredUsers,
    activeSessions
  }
};
