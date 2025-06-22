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