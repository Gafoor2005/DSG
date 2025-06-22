# User Service - Social Platform

A robust, production-ready user management microservice built with Node.js, Express, PostgreSQL, and designed for microservices architecture.

## 🚀 Features

### Core Authentication & User Management
- **User Registration & Authentication**: JWT-based auth with refresh tokens
- **Email Verification**: Secure email verification system with tokens
- **Password Management**: Password reset, change password with security checks
- **Session Management**: Multiple device sessions with refresh token rotation
- **Profile Management**: Complete user profile with privacy settings

### Social Features
- **Follow/Unfollow System**: Follow other users and manage connections
- **Friend Requests**: Send, accept, reject friend requests
- **Block Users**: Block and unblock users for safety
- **Social Statistics**: Followers, following, mutual connections count
- **User Search**: Search users with relevance ranking

### Security & Validation
- **Input Validation**: Comprehensive Joi validation schemas
- **Rate Limiting**: API rate limiting to prevent abuse
- **Security Headers**: Helmet.js for security headers
- **Error Handling**: Centralized error handling with proper logging
- **CORS Protection**: Configurable CORS settings

### Monitoring & Logging
- **Structured Logging**: Winston-based logging with different levels
- **Performance Monitoring**: Query performance tracking
- **Health Checks**: System health monitoring endpoints
- **Business Analytics**: User action tracking and analytics

## 📋 Prerequisites

- **Node.js**: Version 18+ required
- **PostgreSQL**: Version 12+ recommended
- **Redis**: Optional, for enhanced rate limiting and caching
- **Git**: For version control

## 🛠️ Quick Start

### 1. Installation

#### Using the Setup Script (Recommended)

**Windows:**
```bash
setup.bat
```

**Linux/macOS:**
```bash
chmod +x setup.sh
./setup.sh
```

#### Manual Installation

```bash
# Clone the repository
git clone <repository-url>
cd user-service

# Install dependencies
npm install

# Copy environment file
cp .env.development .env

# Update the .env file with your configuration
# Edit .env with your database credentials and other settings
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb social_platform_users

# The service will automatically create tables on first run
# Or you can run the database setup manually (see Database Schema section)
```

### 3. Environment Configuration

Update the `.env` file with your configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=social_platform_users
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Other configurations...
```

### 4. Run the Service

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Run tests
npm test
```

The service will be available at `http://localhost:3001`

## 📡 API Endpoints

### Authentication Endpoints
```
POST   /api/auth/register     - Register new user
POST   /api/auth/login        - User login
POST   /api/auth/refresh      - Refresh access token
POST   /api/auth/logout       - User logout
POST   /api/auth/verify-email - Verify email address
```

### User Management
```
GET    /api/users/me          - Get current user profile
PUT    /api/users/me          - Update user profile
DELETE /api/users/me          - Deactivate user account
GET    /api/users/search      - Search users
GET    /api/users/:id         - Get user by ID
POST   /api/users/change-password     - Change password
POST   /api/users/forgot-password     - Request password reset
POST   /api/users/reset-password      - Reset password with token
```

### Social Features
```
POST   /api/social/follow/:id         - Follow user
DELETE /api/social/follow/:id         - Unfollow user
POST   /api/social/friend-request/:id - Send friend request
PUT    /api/social/friend-request/:id - Accept/reject friend request
POST   /api/social/block/:id          - Block user
DELETE /api/social/block/:id          - Unblock user
GET    /api/social/followers          - Get followers list
GET    /api/social/following          - Get following list
GET    /api/social/pending-requests   - Get pending friend requests
GET    /api/social/blocked            - Get blocked users
GET    /api/social/mutual/:id         - Get mutual connections
GET    /api/social/stats              - Get social statistics
```

### System Endpoints
```
GET    /api/health            - Health check
GET    /api/health/detailed   - Detailed health status
```

## 🗄️ Database Schema

### Core Tables

#### users
- Basic user information and authentication data
- Email verification status and activity flags
- Timestamps for creation and last login

#### user_profiles
- Extended profile information (phone, location, etc.)
- Privacy and notification preferences
- Social links and interests

#### user_relationships
- Follow/friend/block relationships between users
- Status tracking (pending, accepted, rejected)
- Relationship type classification

#### user_sessions
- JWT refresh token storage
- Device and IP tracking
- Session expiration management

#### user_tokens
- Email verification and password reset tokens
- Token type classification and expiration
- Secure token management

## 🏗️ Architecture

### Project Structure
```
user-service/
├── src/
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Express middleware
│   ├── models/              # Database repositories
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic services
│   ├── utils/               # Utility functions
│   ├── validation/          # Input validation schemas
│   └── index.js             # Application entry point
├── tests/                   # Test files
├── logs/                    # Application logs
├── docs/                    # Documentation
└── package.json
```

### Design Patterns
- **Repository Pattern**: Database access abstraction
- **Service Layer**: Business logic separation
- **Middleware Pattern**: Request/response processing
- **Error Boundary**: Centralized error handling
- **Dependency Injection**: Loose coupling of components

## 🔒 Security Features

### Authentication & Authorization
- JWT tokens with configurable expiration
- Refresh token rotation for enhanced security
- Rate limiting on authentication endpoints
- Password strength validation

### Data Protection
- Password hashing with bcrypt
- SQL injection prevention with parameterized queries
- XSS protection with helmet.js
- Input sanitization and validation

### Privacy & Access Control
- User profile privacy settings
- Relationship-based access control
- Data anonymization options
- GDPR compliance considerations

## 🚀 Deployment

### Docker Deployment

```dockerfile
# The service includes a Dockerfile for containerization
docker build -t user-service .
docker run -p 3001:3001 --env-file .env user-service
```

### Environment-Specific Configuration

- **Development**: `.env.development`
- **Production**: `.env.production`
- **Testing**: Environment variables in test files

### Health Monitoring

The service provides health check endpoints for monitoring:

```bash
# Basic health check
curl http://localhost:3001/api/health

# Detailed health status
curl http://localhost:3001/api/health/detailed
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/setup.test.js
```

### Test Categories
- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing
- **Database Tests**: Repository and query testing
- **Security Tests**: Authentication and authorization

## 📊 Monitoring & Logging

### Logging Levels
- **Error**: Application errors and exceptions
- **Warn**: Warning conditions and security events
- **Info**: General application flow and business events
- **Debug**: Detailed debugging information

### Log Categories
- **Request Logging**: HTTP request/response tracking
- **Authentication Events**: Login, logout, token refresh
- **Business Events**: User actions and social interactions
- **Performance Metrics**: Query times and response durations
- **Security Events**: Failed auth attempts, suspicious activity

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | development | No |
| `PORT` | Server port | 3001 | No |
| `DB_HOST` | PostgreSQL host | localhost | Yes |
| `DB_PORT` | PostgreSQL port | 5432 | No |
| `DB_NAME` | Database name | - | Yes |
| `DB_USER` | Database user | - | Yes |
| `DB_PASSWORD` | Database password | - | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `JWT_EXPIRES_IN` | JWT expiration | 24h | No |
| `BCRYPT_ROUNDS` | Password hash rounds | 12 | No |

See `.env.template` for complete configuration options.

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/new-feature`
3. **Commit changes**: `git commit -am 'Add new feature'`
4. **Push to branch**: `git push origin feature/new-feature`
5. **Create Pull Request**

### Development Guidelines
- Follow the existing code style and patterns
- Write tests for new features
- Update documentation for API changes
- Use semantic commit messages

## 📝 API Documentation

### Request/Response Format

All API endpoints follow RESTful conventions:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { ... }
  }
}
```

### Authentication
Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Fails**
   - Check PostgreSQL is running
   - Verify connection credentials in `.env`
   - Ensure database exists

2. **JWT Token Issues**
   - Verify `JWT_SECRET` is set
   - Check token expiration settings
   - Ensure clock synchronization

3. **Port Already in Use**
   - Change `PORT` in `.env`
   - Kill existing processes on the port

### Debugging
- Enable debug logging: `LOG_LEVEL=debug`
- Check application logs in `/logs` directory
- Use health check endpoints for system status

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the documentation and troubleshooting guide
- Review the logs for error details

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for scalable social platforms**
