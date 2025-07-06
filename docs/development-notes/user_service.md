# user service

I'll help you build this social platform step by step! Let's start with the User Service with authentication, breaking it down into manageable pieces.

## Step 1: User Service - Project Structure & Dependencies

First, let's set up the basic structure for the User Service:

```json
{
  "name": "user-service",
  "version": "1.0.0",
  "description": "User management microservice for social platform",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix"
  },
  "dependencies": {
    "express": "^4.18.2",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3",
    "joi": "^17.9.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.8.1",
    "redis": "^4.6.7",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.1",
    "supertest": "^6.3.3",
    "eslint": "^8.45.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Step 2: Environment Configuration

Let's create the environment configuration file:

```python
# Server Configuration
NODE_ENV=development
PORT=3001
SERVICE_NAME=user-service

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=users_db
DB_USER=postgres
DB_PASSWORD=password
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_CACHE_TTL=3600

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Password Configuration
BCRYPT_ROUNDS=12
PASSWORD_MIN_LENGTH=8

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/user-service.log

# Email Configuration (for future use)
EMAIL_FROM=noreply@yourapp.com
EMAIL_SERVICE_URL=http://notification-service:3003

# Security
CORS_ORIGIN=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

## Step 3: Database Schema & Connection

Now let's create the database connection and user schema:

```jsx
// src/database/connection.js
const { Pool } = require('pg');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        min: parseInt(process.env.DB_POOL_MIN) || 2,
        max: parseInt(process.env.DB_POOL_MAX) || 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      logger.info('✅ PostgreSQL connected successfully');

      // Create tables if they don't exist
      await this.createTables();
      
      return this.pool;
    } catch (error) {
      logger.error('❌ Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  async createTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        profile_picture VARCHAR(500),
        bio TEXT,
        date_of_birth DATE,
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Add constraints
        CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
        CONSTRAINT valid_username CHECK (username ~* '^[a-zA-Z0-9_]{3,50}$')
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;
    `;

    const createUserSessionsTable = `
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token VARCHAR(500) NOT NULL,
        device_info JSONB,
        ip_address INET,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Add index for cleanup queries
        INDEX idx_sessions_expires ON user_sessions(expires_at),
        INDEX idx_sessions_user_id ON user_sessions(user_id)
      );
    `;

    const createUserProfilesTable = `
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        phone VARCHAR(20),
        location VARCHAR(255),
        website VARCHAR(500),
        occupation VARCHAR(100),
        interests TEXT[],
        privacy_settings JSONB DEFAULT '{"profile_visibility": "public", "contact_info_visibility": "friends"}',
        notification_preferences JSONB DEFAULT '{"email_notifications": true, "push_notifications": true}',
        social_links JSONB DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createUserRelationshipsTable = `
      CREATE TABLE IF NOT EXISTS user_relationships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        relationship_type VARCHAR(20) DEFAULT 'follow' CHECK (relationship_type IN ('follow', 'friend', 'block')),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Prevent self-relationships and duplicates
        CONSTRAINT no_self_relationship CHECK (follower_id != following_id),
        CONSTRAINT unique_relationship UNIQUE (follower_id, following_id)
      );

      -- Indexes for relationship queries
      CREATE INDEX IF NOT EXISTS idx_relationships_follower ON user_relationships(follower_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_following ON user_relationships(following_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_type ON user_relationships(relationship_type);
    `;

    // Create trigger for updating updated_at timestamp
    const createUpdateTrigger = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Apply trigger to tables
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_profiles_updated_at ON user_profiles;
      CREATE TRIGGER update_profiles_updated_at 
        BEFORE UPDATE ON user_profiles 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_relationships_updated_at ON user_relationships;
      CREATE TRIGGER update_relationships_updated_at 
        BEFORE UPDATE ON user_relationships 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    try {
      await this.pool.query(createUsersTable);
      await this.pool.query(createUserSessionsTable);
      await this.pool.query(createUserProfilesTable);
      await this.pool.query(createUserRelationshipsTable);
      await this.pool.query(createUpdateTrigger);
      
      logger.info('✅ Database tables created successfully');
    } catch (error) {
      logger.error('❌ Failed to create database tables:', error);
      throw error;
    }
  }

  async query(text, params) {
    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        logger.warn(`Slow query detected (${duration}ms):`, text);
      }
      
      return result;
    } catch (error) {
      logger.error('Database query error:', error);
      throw error;
    }
  }

  async getClient() {
    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected');
    }
    return await this.pool.connect();
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      logger.info('📦 PostgreSQL connection closed');
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as healthy');
      return result.rows[0].healthy === 1;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;
```

## Step 4: Logger Utility

Let's create a logger utility for consistent logging across the service:

```jsx
// src/utils/logger.js
const winston = require('winston');
const path = require('path');

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
    })
  ],

  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat
    })
  ],

  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat
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
```

Great! I've created the foundation for your User Service. Here's what we've built so far:

## 📦 What We've Created:

1. **Package.json** - Dependencies for authentication, database, validation, and security
2. **Environment Configuration** - All necessary config variables for development and production
3. **Database Layer** - PostgreSQL connection with proper schema for users, sessions, profiles, and relationships
4. **Logger Utility** - Comprehensive logging system with request tracking, performance monitoring, and security event logging

## 🏗️ Key Features Implemented:

- **Database Schema**: Users, sessions, profiles, and relationships tables
- **Security**: Proper constraints, indexes, and data validation
- **Logging**: Request tracking, performance monitoring, auth events
- **Connection Pool**: Optimized database connections
- **Auto-timestamps**: Triggers for updating timestamps

## 📁 Directory Structure So Far:

```
user-service/
├── package.json
├── .env
├── src/
│   ├── database/
│   │   └── connection.js
│   └── utils/
│       └── logger.js
└── logs/ (auto-created)

```

## 🎯 Next Steps:

In the next part, I'll show you:

1. **User Model & Repository Pattern** - Clean data access layer
2. **Authentication Service** - JWT tokens, password hashing
3. **Validation Schemas** - Input validation with Joi
4. **User Controllers** - Registration, login, profile management

Would you like me to continue with the User Model and Repository pattern next? This will show you how to create clean, testable data access methods for user operations.

---

Perfect! Let's continue with the User Model and Repository pattern. This will create a clean data access layer.

## Step 5: User Model & Repository Pattern

```jsx
// src/models/User.js
const database = require('../database/connection');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class UserRepository {
  // Create a new user
  async create(userData) {
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, parseInt(process.env.BCRYPT_ROUNDS));
      
      // Insert user
      const userQuery = `
        INSERT INTO users (username, email, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, email, first_name, last_name, is_verified, is_active, created_at
      `;
      
      const userResult = await client.query(userQuery, [
        userData.username,
        userData.email,
        passwordHash,
        userData.firstName || null,
        userData.lastName || null
      ]);
      
      const user = userResult.rows[0];
      
      // Create user profile
      const profileQuery = `
        INSERT INTO user_profiles (user_id)
        VALUES ($1)
      `;
      
      await client.query(profileQuery, [user.id]);
      
      await client.query('COMMIT');
      
      logger.business('user_created', user.id, {
        username: user.username,
        email: user.email
      });
      
      return user;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.errorWithContext(error, { operation: 'create_user', userData });
      throw error;
    } finally {
      client.release();
    }
  }

  // Find user by ID
  async findById(userId) {
    try {
      const query = `
        SELECT 
          u.id, u.username, u.email, u.first_name, u.last_name,
          u.profile_picture, u.bio, u.date_of_birth, u.is_verified,
          u.is_active, u.last_login, u.created_at, u.updated_at,
          p.phone, p.location, p.website, p.occupation, p.interests,
          p.privacy_settings, p.notification_preferences, p.social_links
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        WHERE u.id = $1 AND u.is_active = true
      `;
      
      const result = await database.query(query, [userId]);
      return result.rows[0] || null;
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'find_user_by_id', userId });
      throw error;
    }
  }

  // Find user by email
  async findByEmail(email) {
    try {
      const query = `
        SELECT 
          u.id, u.username, u.email, u.password_hash, u.first_name, u.last_name,
          u.profile_picture, u.bio, u.is_verified, u.is_active, u.last_login,
          u.created_at, u.updated_at
        FROM users u
        WHERE LOWER(u.email) = LOWER($1) AND u.is_active = true
      `;
      
      const result = await database.query(query, [email]);
      return result.rows[0] || null;
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'find_user_by_email', email });
      throw error;
    }
  }

  // Find user by username
  async findByUsername(username) {
    try {
      const query = `
        SELECT 
          u.id, u.username, u.email, u.password_hash, u.first_name, u.last_name,
          u.profile_picture, u.bio, u.is_verified, u.is_active, u.last_login,
          u.created_at, u.updated_at
        FROM users u
        WHERE LOWER(u.username) = LOWER($1) AND u.is_active = true
      `;
      
      const result = await database.query(query, [username]);
      return result.rows[0] || null;
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'find_user_by_username', username });
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Update users table if basic info is provided
      if (updateData.firstName || updateData.lastName || updateData.bio || updateData.profilePicture) {
        const userUpdateQuery = `
          UPDATE users 
          SET 
            first_name = COALESCE($2, first_name),
            last_name = COALESCE($3, last_name),
            bio = COALESCE($4, bio),
            profile_picture = COALESCE($5, profile_picture)
          WHERE id = $1
        `;
        
        await client.query(userUpdateQuery, [
          userId,
          updateData.firstName,
          updateData.lastName,
          updateData.bio,
          updateData.profilePicture
        ]);
      }
      
      // Update user_profiles table
      const profileUpdateQuery = `
        UPDATE user_profiles 
        SET 
          phone = COALESCE($2, phone),
          location = COALESCE($3, location),
          website = COALESCE($4, website),
          occupation = COALESCE($5, occupation),
          interests = COALESCE($6, interests),
          privacy_settings = COALESCE($7, privacy_settings),
          notification_preferences = COALESCE($8, notification_preferences),
          social_links = COALESCE($9, social_links)
        WHERE user_id = $1
      `;
      
      await client.query(profileUpdateQuery, [
        userId,
        updateData.phone,
        updateData.location,
        updateData.website,
        updateData.occupation,
        updateData.interests,
        updateData.privacySettings,
        updateData.notificationPreferences,
        updateData.socialLinks
      ]);
      
      await client.query('COMMIT');
      
      logger.business('profile_updated', userId, { updateFields: Object.keys(updateData) });
      
      // Return updated user
      return await this.findById(userId);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.errorWithContext(error, { operation: 'update_profile', userId, updateData });
      throw error;
    } finally {
      client.release();
    }
  }

  // Update last login
  async updateLastLogin(userId) {
    try {
      const query = `
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      
      await database.query(query, [userId]);
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'update_last_login', userId });
      throw error;
    }
  }

  // Verify password
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.errorWithContext(error, { operation: 'verify_password' });
      throw error;
    }
  }

  // Change password
  async changePassword(userId, newPassword) {
    try {
      const passwordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS));
      
      const query = `
        UPDATE users 
        SET password_hash = $2 
        WHERE id = $1
      `;
      
      await database.query(query, [userId, passwordHash]);
      
      logger.business('password_changed', userId);
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'change_password', userId });
      throw error;
    }
  }

  // Search users
  async searchUsers(searchTerm, limit = 20, offset = 0) {
    try {
      const query = `
        SELECT 
          u.id, u.username, u.first_name, u.last_name,
          u.profile_picture, u.is_verified, u.created_at
        FROM users u
        WHERE 
          u.is_active = true AND
          (
            LOWER(u.username) LIKE LOWER($1) OR
            LOWER(u.first_name) LIKE LOWER($1) OR
            LOWER(u.last_name) LIKE LOWER($1) OR
            LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE LOWER($1)
          )
        ORDER BY 
          CASE 
            WHEN LOWER(u.username) = LOWER($2) THEN 1
            WHEN LOWER(u.username) LIKE LOWER($1) THEN 2
            ELSE 3
          END,
          u.created_at DESC
        LIMIT $3 OFFSET $4
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const result = await database.query(query, [searchPattern, searchTerm, limit, offset]);
      
      return result.rows;
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'search_users', searchTerm });
      throw error;
    }
  }

  // Get user statistics
  async getUserStats(userId) {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM user_relationships WHERE follower_id = $1 AND status = 'accepted') as following_count,
          (SELECT COUNT(*) FROM user_relationships WHERE following_id = $1 AND status = 'accepted') as followers_count,
          u.created_at as member_since
        FROM users u
        WHERE u.id = $1
      `;
      
      const result = await database.query(query, [userId]);
      return result.rows[0] || null;
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'get_user_stats', userId });
      throw error;
    }
  }

  // Check if username or email exists
  async checkExistence(username, email) {
    try {
      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE LOWER(username) = LOWER($1)) as username_exists,
          COUNT(*) FILTER (WHERE LOWER(email) = LOWER($2)) as email_exists
        FROM users 
        WHERE is_active = true
      `;
      
      const result = await database.query(query, [username, email]);
      const row = result.rows[0];
      
      return {
        usernameExists: parseInt(row.username_exists) > 0,
        emailExists: parseInt(row.email_exists) > 0
      };
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'check_existence', username, email });
      throw error;
    }
  }

  // Deactivate user (soft delete)
  async deactivateUser(userId) {
    try {
      const query = `
        UPDATE users 
        SET is_active = false 
        WHERE id = $1
      `;
      
      await database.query(query, [userId]);
      
      logger.business('user_deactivated', userId);
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'deactivate_user', userId });
      throw error;
    }
  }

  // Get users with pagination
  async getUsers(limit = 20, offset = 0, filters = {}) {
    try {
      let whereClause = 'WHERE u.is_active = true';
      const queryParams = [];
      let paramIndex = 1;
      
      // Add filters
      if (filters.verified !== undefined) {
        whereClause += ` AND u.is_verified = $${paramIndex}`;
        queryParams.push(filters.verified);
        paramIndex++;
      }
      
      if (filters.createdAfter) {
        whereClause += ` AND u.created_at >= $${paramIndex}`;
        queryParams.push(filters.createdAfter);
        paramIndex++;
      }
      
      const query = `
        SELECT 
          u.id, u.username, u.email, u.first_name, u.last_name,
          u.profile_picture, u.is_verified, u.created_at,
          COUNT(*) OVER() as total_count
        FROM users u
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      const result = await database.query(query, queryParams);
      
      return {
        users: result.rows,
        totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
      };
      
    } catch (error) {
      logger.errorWithContext(error, { operation: 'get_users', filters });
      throw error;
    }
  }
}

module.exports = new UserRepository();
```

## Step 6: Authentication Service

Now let's create the authentication service that handles JWT tokens and authentication logic:

```jsx
// src/services/authService.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const database = require('../database/connection');
const logger = require('../utils/logger');
const UserRepository = require('../models/User');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  // Generate JWT access token
  generateAccessToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      isVerified: user.is_verified,
      type: 'access'
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'user-service',
      audience: 'social-platform'
    });
  }

  // Generate refresh token
  generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  // Verify JWT token
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'user-service',
        audience: 'social-platform'
      });
    } catch (error) {
      logger.security('invalid_token_verification', { error: error.message });
      throw new Error('Invalid or expired token');
    }
  }

  // Store refresh token in database
  async storeRefreshToken(userId, refreshToken, deviceInfo, ipAddress) {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const query = `
        INSERT INTO user_sessions (user_id, refresh_token, device_info, ip_address, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      const result = await database.query(query, [
        userId,
        refreshToken,
        deviceInfo,
        ipAddress,
        expiresAt
      ]);

      return result.rows[0].id;
    } catch (error) {
      logger.errorWithContext(error, { operation: 'store_refresh_token', userId });
      throw error;
    }
  }

  // Verify refresh token
  async verifyRefreshToken(refreshToken) {
    try {
      const query = `
        SELECT s.id, s.user_id, s.expires_at, u.username, u.email, u.is_active, u.is_verified
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.refresh_token = $1 AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = true
      `;

      const result = await database.query(query, [refreshToken]);
      
      if (result.rows.length === 0) {
        throw new Error('Invalid or expired refresh token');
      }

      // Update last used timestamp
      await database.query(
        'UPDATE user_sessions SET last_used = CURRENT_TIMESTAMP WHERE id = $1',
        [result.rows[0].id]
      );

      return result.rows[0];
    } catch (error) {
      logger.security('invalid_refresh_token', { error: error.message });
      throw error;
    }
  }

  // Revoke refresh token
  async revokeRefreshToken(refreshToken) {
    try {
      const query = `
        DELETE FROM user_sessions 
        WHERE refresh_token = $1
      `;

      await database.query(query, [refreshToken]);
      logger.authLogger('refresh_token_revoked', null, { refreshToken: refreshToken.substring(0, 10) + '...' });
    } catch (error) {
      logger.errorWithContext(error, { operation: 'revoke_refresh_token' });
      throw error;
    }
  }

  // Revoke all user sessions
  async revokeAllUserSessions(userId) {
    try {
      const query = `
        DELETE FROM user_sessions 
        WHERE user_id = $1
      `;

      const result = await database.query(query, [userId]);
      logger.authLogger('all_sessions_revoked', userId, { deletedSessions: result.rowCount });
    } catch (error) {
      logger.errorWithContext(error, { operation: 'revoke_all_sessions', userId });
      throw error;
    }
  }

  // Login user
  async login(identifier, password, deviceInfo, ipAddress) {
    try {
      // Find user by email or username
      let user = await UserRepository.findByEmail(identifier);
      if (!user) {
        user = await UserRepository.findByUsername(identifier);
      }

      if (!user) {
        logger.security('login_attempt_invalid_user', { identifier, ipAddress });
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await UserRepository.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        logger.security('login_attempt_invalid_password', { 
          userId: user.id, 
          identifier, 
          ipAddress 
        });
        throw new Error('Invalid credentials');
      }

      // Check if user is active
      if (!user.is_active) {
        logger.security('login_attempt_inactive_user', { userId: user.id, ipAddress });
        throw new Error('Account is deactivated');
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken();

      // Store refresh token
      await this.storeRefreshToken(user.id, refreshToken, deviceInfo, ipAddress);

      // Update last login
      await UserRepository.updateLastLogin(user.id);

      // Remove password hash from response
      delete user.password_hash;

      logger.authLogger('user_login_success', user.id, { 
        ipAddress, 
        deviceInfo: deviceInfo?.userAgent 
      });

      return {
        user,
        accessToken,
        refreshToken,
        expiresIn: this.jwtExpiresIn
      };
    } catch (error) {
      logger.errorWithContext(error, { operation: 'login', identifier });
      throw error;
    }
  }

  // Register user
  async register(userData, deviceInfo, ipAddress) {
    try {
      // Check if user already exists
      const existenceCheck = await UserRepository.checkExistence(userData.username, userData.email);
      
      if (existenceCheck.emailExists) {
        throw new Error('Email already registered');
      }
      
      if (existenceCheck.usernameExists) {
        throw new Error('Username already taken');
      }

      // Create user
      const user = await UserRepository.create(userData);

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken();

      // Store refresh token
      await this.storeRefreshToken(user.id, refreshToken, deviceInfo, ipAddress);

      logger.authLogger('user_registration_success', user.id, { 
        ipAddress, 
        deviceInfo: deviceInfo?.userAgent 
      });

      return {
        user,
        accessToken,
        refreshToken,
        expiresIn: this.jwtExpiresIn
      };
    } catch (error) {
      logger.errorWithContext(error, { operation: 'register', userData: { ...userData, password: '[REDACTED]' } });
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      const session = await this.verifyRefreshToken(refreshToken);
      
      const user = {
        id: session.user_id,
        username: session.username,
        email: session.email,
        is_verified: session.is_verified
      };

      const newAccessToken = this.generateAccessToken(user);

      logger.authLogger('token_refreshed', user.id);

      return {
        accessToken: newAccessToken,
        expiresIn: this.jwtExpiresIn
      };
    } catch (error) {
      logger.errorWithContext(error, { operation: 'refresh_token' });
      throw error;
    }
  }

  // Logout user
  async logout(refreshToken) {
    try {
      if (refreshToken) {
        await this.revokeRefreshToken(refreshToken);
      }
      
      logger.authLogger('user_logout');
    } catch (error) {
      logger.errorWithContext(error, { operation: 'logout' });
      throw error;
    }
  }

  // Get user sessions
  async getUserSessions(userId) {
    try {
      const query = `
        SELECT 
          id, device_info, ip_address, created_at, last_used, expires_at
        FROM user_sessions
        WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
        ORDER BY last_used DESC
      `;

      const result = await database.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.errorWithContext(error, { operation: 'get_user_sessions', userId });
      throw error;
    }
  }

  // Clean up expired sessions
  async cleanupExpiredSessions() {
    try {
      const query = `
        DELETE FROM user_sessions 
        WHERE expires_at < CURRENT_TIMESTAMP
      `;

      const result = await database.query(query);
      
      if (result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} expired sessions`);
      }
      
      return result.rowCount;
    } catch (error) {
      logger.errorWithContext(error, { operation: 'cleanup_expired_sessions' });
      throw error;
    }
  }

  // Validate token strength
  validateTokenStrength(token) {
    if (!token || token.length < 10) {
      return false;
    }
    
    // Check for basic complexity
    const hasNumbers = /\d/.test(token);
    const hasLetters = /[a-zA-Z]/.test(token);
    
    return hasNumbers && hasLetters;
  }

  // Get device info from request
  extractDeviceInfo(req) {
    return {
      userAgent: req.get('User-Agent') || 'Unknown',
      platform: req.get('Sec-CH-UA-Platform') || 'Unknown',
      mobile: req.get('Sec-CH-UA-Mobile') === '?1',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new AuthService();
```

## Step 7: Validation Schemas

Let's create input validation schemas using Joi to ensure data integrity:

```jsx
// src/validation/schemas.js
const Joi = require('joi');

// Custom validation rules
const customValidations = {
  // Strong password validation
  password: Joi.string()
    .min(parseInt(process.env.PASSWORD_MIN_LENGTH) || 8)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.min': 'Password must be at least {#limit} characters long',
      'string.max': 'Password cannot be longer than {#limit} characters'
    }),

  // Username validation
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .lowercase()
    .pattern(new RegExp('^[a-zA-Z0-9_]+$'))
    .messages({
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
      'string.min': 'Username must be at least {#limit} characters long',
      'string.max': 'Username cannot be longer than {#limit} characters'
    }),

  // Email validation
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu', 'gov', 'mil', 'int', 'co', 'io'] } })
    .max(255)
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email address cannot be longer than {#limit} characters'
    }),

  // Name validation
  name: Joi.string()
    .min(1)
    .max(100)
    .pattern(new RegExp('^[a-zA-Z\\s\\-\']+$'))
    .messages({
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
      'string.max': 'Name cannot be longer than {#limit} characters'
    }),

  // Phone validation
  phone: Joi.string()
    .pattern(new RegExp('^[+]?[1-9]?[0-9]{7,15}$'))
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),

  // URL validation
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(500)
    .messages({
      'string.uri': 'Please provide a valid URL',
      'string.max': 'URL cannot be longer than {#limit} characters'
    }),

  // Date validation (for date of birth)
  dateOfBirth: Joi.date()
    .max('now')
    .min('1900-01-01')
    .messages({
      'date.max': 'Date of birth cannot be in the future',
      'date.min': 'Please provide a valid date of birth'
    }),

  // Bio validation
  bio: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Bio cannot be longer than {#limit} characters'
    }),

  // Location validation
  location: Joi.string()
    .max(255)
    .allow('')
    .messages({
      'string.max': 'Location cannot be longer than {#limit} characters'
    }),

  // Occupation validation
  occupation: Joi.string()
    .max(100)
    .allow('')
    .messages({
      'string.max': 'Occupation cannot be longer than {#limit} characters'
    }),

  // Interests validation
  interests: Joi.array()
    .items(Joi.string().max(50))
    .max(20)
    .messages({
      'array.max': 'You can have a maximum of {#limit} interests',
      'string.max': 'Each interest cannot be longer than {#limit} characters'
    })
};

// Registration schema
const registerSchema = Joi.object({
  username: customValidations.username.required(),
  email: customValidations.email.required(),
  password: customValidations.password.required(),
  firstName: customValidations.name.optional(),
  lastName: customValidations.name.optional(),
  agreeToTerms: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must agree to the terms and conditions'
  })
});

// Login schema
const loginSchema = Joi.object({
  identifier: Joi.string().required().messages({
    'any.required': 'Email or username is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  }),
  rememberMe: Joi.boolean().optional().default(false)
});

// Profile update schema
const updateProfileSchema = Joi.object({
  firstName: customValidations.name.optional(),
  lastName: customValidations.name.optional(),
  bio: customValidations.bio.optional(),
  dateOfBirth: customValidations.dateOfBirth.optional(),
  phone: customValidations.phone.optional(),
  location: customValidations.location.optional(),
  website: customValidations.url.optional(),
  occupation: customValidations.occupation.optional(),
  interests: customValidations.interests.optional(),
  privacySettings: Joi.object({
    profileVisibility: Joi.string().valid('public', 'friends', 'private').optional(),
    contactInfoVisibility: Joi.string().valid('public', 'friends', 'private').optional(),
    activityVisibility: Joi.string().valid('public',
```


Let me create the controllers that will handle all the user-related HTTP requests.

Created userController.js

Now let's create a Social Controller to handle user relationships (follow, block, report):

Created socialController.js

Perfect! Now I've created comprehensive controllers for your user service. Let me summarize what we've built and show you the complete structure:

## 🎯 User Service Controllers Complete!
1. **UserController.js** - Core user management
- ✅ User Registration with validation and duplicate checking
- ✅ User Login with JWT token generation
- ✅ Token Refresh for maintaining sessions
- ✅ User Logout with session cleanup
- ✅ Get Profile with privacy controls
- ✅ Update Profile with comprehensive validation
- ✅ Change Password with current password verification
- ✅ Search Users with filtering and pagination
- ✅ Get User by ID (public profiles)
- ✅ Update Notification Preferences
- ✅ Account Deactivation with password confirmation
- ✅ Session Management (view and revoke sessions)
2. **SocialController.js** - Social interactions
- ✅ Follow/Unfollow Users with relationship tracking
- ✅ Get Followers/Following lists with pagination
- ✅ Block/Unblock Users with reason tracking
- ✅ Report Users with moderation support
- ✅ Get Blocked Users list
- ✅ Relationship Management helper methods
## 🏗️ Key Features Implemented:
**Security & Validation**
- 🔒 Comprehensive input validation using Joi schemas
- 🔒 Password verification for sensitive operations
- 🔒 JWT token management with refresh tokens
- 🔒 Session tracking with device info and IP logging
- 🔒 Security event logging for auditing
**Business Logic**
- 📊 User statistics tracking (followers, following, posts)
- 📊 Privacy controls for profile visibility
- 📊 Relationship management (follow, block, report)
- 📊 Notification preferences management
- 📊 Account lifecycle (registration, deactivation)
**Error Handling & Logging**
- 📝 Structured error responses with field-level validation
- 📝 Comprehensive logging (business events, security events, errors)
- 📝 Performance monitoring with operation tracking
- 📝 Audit trails for user actions
## 📁 Current Project Structure:
```user-service/
├── src/
│   ├── controllers/
│   │   ├── userController.js      ✅ Complete
│   │   └── socialController.js    ✅ Complete
│   ├── validation/
│   │   └── schemas.js             ✅ Complete
│   ├── models/
│   │   └── User.js               (Referenced - needs implementation)
│   ├── services/
│   │   └── authService.js        (Referenced - needs implementation)
│   ├── database/
│   │   └── connection.js         (Referenced - needs implementation)
│   └── utils/
│       └── logger.js             (Referenced - needs implementation)
```

## 🎯 Next Steps:
Based on your `user_service.md` documentation, we should continue with:

1. **Routes & Middleware** - HTTP endpoints and authentication middleware
2. **Complete the Model Layer** - UserRepository implementation
3. **AuthService Implementation** - JWT and session management
4. **Database Connection** - PostgreSQL setup with proper schemas
5. **Main Application File** - Express server setup with all routes

Would you like me to continue with the Routes & Middleware next? This will wire up all your controllers to HTTP endpoints and add authentication protection to secured routes.

---
## 🎉 Routes & Middleware Complete!
I've successfully created a comprehensive routing and middleware system for your user service. Here's what we've built:
---
## 📁 Complete File Structure:
```
user-service/
├── src/
│   ├── controllers/
│   │   ├── userController.js      ✅ Complete
│   │   └── socialController.js    ✅ Complete
│   ├── middleware/
│   │   ├── auth.js               ✅ Authentication & authorization
│   │   ├── validation.js         ✅ Input validation & sanitization
│   │   └── errorHandler.js       ✅ Error handling
│   ├── routes/
│   │   ├── auth.js              ✅ Authentication routes
│   │   ├── users.js             ✅ User management routes
│   │   ├── social.js            ✅ Social interaction routes
│   │   ├── health.js            ✅ Health check routes
│   │   └── index.js             ✅ Route aggregator
│   ├── validation/
│   │   └── schemas.js           ✅ Complete
│   └── index.js                 ✅ Main application file
```
## 🛡️ Security & Middleware Features:
**Authentication Middleware**
- ✅ JWT Token Verification with proper error handling
- ✅ Optional Authentication for public endpoints
- ✅ User Ownership Checks for resource protection
- ✅ Email Verification Requirements for sensitive actions
- ✅ User-based Rate Limiting to prevent abuse
**Validation Middleware**
- ✅ Joi Schema Validation for body, query, and params
- ✅ Input Sanitization to prevent XSS attacks
- ✅ Type Conversion and data cleaning
**Error Handling**
- ✅ Global Error Handler with proper HTTP status codes
- ✅ Database Error Mapping (PostgreSQL specific)
- ✅ Async Error Wrapper for clean error handling
- ✅ 404 Handler for undefined routes
## 🛣️ API Endpoints:
**Authentication Routes (/api/auth)**
```
POST   /api/auth/register           - Register new user
POST   /api/auth/login              - Login user
POST   /api/auth/logout             - Logout user (Protected)
POST   /api/auth/refresh            - Refresh access token
POST   /api/auth/change-password    - Change password (Protected)
POST   /api/auth/forgot-password    - Request password reset
POST   /api/auth/reset-password     - Reset password with token
POST   /api/auth/verify-email       - Verify email address
GET    /api/auth/me                 - Get current user (Protected)
GET    /api/auth/sessions           - Get user sessions (Protected)
DELETE /api/auth/sessions           - Revoke all sessions (Protected)
```
**User Management Routes (/api/users)**
```
GET    /api/users/search            - Search users (Optional auth)
GET    /api/users/:userId           - Get user profile (Optional auth)
PUT    /api/users/profile           - Update profile (Protected)
PUT    /api/users/notifications     - Update notifications (Protected)
POST   /api/users/deactivate        - Deactivate account (Protected)
GET    /api/users/:userId/stats     - Get user statistics (Optional auth)
```
**Social Interaction Routes (/api/social)**
```
POST   /api/social/follow           - Follow user (Protected)
POST   /api/social/unfollow         - Unfollow user (Protected)
GET    /api/social/:userId/followers - Get followers (Protected)
GET    /api/social/:userId/following - Get following (Protected)
POST   /api/social/block            - Block user (Protected)
POST   /api/social/unblock          - Unblock user (Protected)
GET    /api/social/blocked          - Get blocked users (Protected)
POST   /api/social/report           - Report user (Protected, Verified)
GET    /api/social/relationship/:userId - Get relationship status (Protected)
```
**Health & Monitoring Routes (/health)**
```
GET    /health                      - Basic health check
GET    /health/detailed             - Detailed health metrics
```
## 🔧 Main Application Features:
**Express Server Setup**
- ✅ Security Headers with Helmet
- ✅ CORS Configuration with environment-based origins
- ✅ Rate Limiting with configurable limits
- ✅ Request Logging with performance tracking
- ✅ Body Parsing with size limits and JSON validation
**Production Ready Features**
- ✅ Graceful Shutdown handling for SIGTERM/SIGINT
- ✅ Health Checks with database connectivity testing
- ✅ Request ID Tracking for debugging
- ✅ Memory Usage Monitoring
- ✅ Database Connection Pooling
## 🎯 Next Steps:
Now that we have complete Routes & Middleware, the remaining pieces to implement are:

1. **Database Layer** - Complete the UserRepository and AuthService
2. **Logger Utility** - Implement the comprehensive logging system
3. **Database Connection** - Set up PostgreSQL with proper schemas
4. **Environment Configuration** - Fine-tune the .env settings

**Your user service now has:**
- ✅ Complete controller logic
- ✅ Comprehensive validation schemas
- ✅ Production-ready middleware
- ✅ RESTful API routes
- ✅ Security best practices
- ✅ Error handling
- ✅ Health monitoring

Would you like me to continue with the Database Layer and Models implementation next?