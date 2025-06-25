-- PostgreSQL Database Initialization Script
-- Run this script to set up the database manually if needed

-- Create database (run this outside of the database)
-- CREATE DATABASE social_platform_users;

-- Connect to the database and run the following:

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
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

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(500) NOT NULL,
  device_info JSONB,
  ip_address INET,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON user_sessions(refresh_token);

-- Create user_profiles table
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

-- Create user_relationships table
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

-- Create indexes for relationships
CREATE INDEX IF NOT EXISTS idx_relationships_follower ON user_relationships(follower_id);
CREATE INDEX IF NOT EXISTS idx_relationships_following ON user_relationships(following_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON user_relationships(relationship_type);

-- Create user_tokens table for email verification and password reset
CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  token_type VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_user_token_type UNIQUE (user_id, token_type)
);

-- Create indexes for tokens
CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON user_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokens_expires ON user_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_tokens_type ON user_tokens(token_type);

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
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

-- Insert sample data (optional - for development)
-- Uncomment the following lines if you want sample data
-- but never use this, may cause errors ( e.g. password dosent satisfy the constraints )

/*
-- Sample users (passwords are 'password123' hashed with bcrypt)
INSERT INTO users (username, email, password_hash, first_name, last_name, is_verified) VALUES
('john_doe', 'john@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Doe', true),
('jane_smith', 'jane@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane', 'Smith', true),
('bob_wilson', 'bob@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Bob', 'Wilson', false);

-- Create profiles for sample users
INSERT INTO user_profiles (user_id) 
SELECT id FROM users WHERE username IN ('john_doe', 'jane_smith', 'bob_wilson');

-- Sample relationships
INSERT INTO user_relationships (follower_id, following_id, relationship_type, status)
SELECT 
  u1.id as follower_id,
  u2.id as following_id,
  'follow' as relationship_type,
  'accepted' as status
FROM users u1, users u2 
WHERE u1.username = 'john_doe' AND u2.username = 'jane_smith';
*/

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'Database schema created successfully!';
  RAISE NOTICE 'Tables created: users, user_sessions, user_profiles, user_relationships, user_tokens';
  RAISE NOTICE 'Indexes and triggers have been set up.';
  RAISE NOTICE 'The application can now connect to this database.';
END $$;
