# 🔌 API Documentation

*This folder contains API specifications, endpoint documentation, and integration guides for all microservices in the DSG project.*

## 📋 Current Documentation

### Service APIs

| Service | Document | Implementation Status | Documentation Status |
|---------|----------|----------------------|---------------------|
| **User Service** | `user-endpoints.md` | ✅ Implemented | ✅ Documented |
| **Authentication** | `auth-endpoints.md` | ✅ Implemented | ✅ Documented |
| **Social Features** | `social-endpoints.md` | ✅ Implemented | ✅ Documented |
| **Content Service** | `content-endpoints.md` | ❌ Not Implemented | ✅ Planned Features Listed |
| **Chat Service** | `chat-endpoints.md` | ❌ Not Implemented | ✅ Planned Features Listed |
| **Notification Service** | `notification-endpoints.md` | ❌ Not Implemented | ✅ Planned Features Listed |

### OpenAPI Specification
- **Swagger Documentation**: `swagger.yaml` - Complete OpenAPI 3.0 specification for implemented endpoints

---

## 🎯 Implemented Endpoints

### Authentication API (`/api/auth`)
- ✅ **POST** `/register` - User registration
- ✅ **POST** `/login` - User login
- ✅ **POST** `/refresh` - Token refresh
- ✅ **POST** `/logout` - User logout
- ✅ **POST** `/forgot-password` - Password reset request
- ✅ **POST** `/reset-password` - Reset password with token
- ✅ **POST** `/verify-email` - Email verification
- ✅ **POST** `/change-password` - Change password
- ✅ **GET** `/sessions` - Get user sessions
- ✅ **DELETE** `/sessions` - Revoke all sessions
- ✅ **GET** `/me` - Get current user profile

### User Management API (`/api/users`)
- ✅ **GET** `/search` - Search users
- ✅ **GET** `/:userId` - Get user profile by ID
- ✅ **PUT** `/profile` - Update user profile
- ✅ **PUT** `/notifications` - Update notification preferences
- ✅ **POST** `/deactivate` - Deactivate account
- ✅ **GET** `/:userId/stats` - Get user statistics

### Social Features API (`/api/social`)
- ✅ **POST** `/follow` - Follow user
- ✅ **POST** `/unfollow` - Unfollow user
- ✅ **GET** `/:userId/followers` - Get user followers
- ✅ **GET** `/:userId/following` - Get user following
- ✅ **POST** `/block` - Block user
- ✅ **POST** `/unblock` - Unblock user
- ✅ **GET** `/blocked` - Get blocked users
- ✅ **POST** `/report` - Report user
- ✅ **GET** `/relationship/:userId` - Get relationship status

---

---

## 📚 Integration Guides

### API Documentation Format
- **OpenAPI 3.0 Specification** (`swagger.yaml`)
- **Endpoint documentation** with examples
- **Request/Response schemas**
- **Authentication requirements**
- **Error codes and messages**

### Testing Tools
- **Postman Collection**: `postman-collection.json` - Complete API testing collection
- **Swagger UI**: Available at `/api-docs` when services are running
- **Example Requests**: Included in each endpoint documentation

### Authentication Flow
1. **Register**: Create new user account with email verification
2. **Login**: Authenticate with email/username and password
3. **Token Usage**: Include Bearer token in Authorization header
4. **Token Refresh**: Use refresh token to get new access token
5. **Logout**: Invalidate current session

### Rate Limiting
- **Authentication**: 5-10 requests per 15 minutes
- **Search**: 100 requests per 15 minutes
- **Social Actions**: 20-50 requests per 15 minutes
- **Profile Updates**: 10 requests per 15 minutes

---

## � Quick Start

### 1. Import Postman Collection
```bash
# Import the postman-collection.json file into Postman
# Set environment variables: base_url, access_token, refresh_token, user_id
```

### 2. View Swagger Documentation
```bash
# Start the user service
cd user-service
npm start

# Visit: http://localhost:3000/api-docs
```

### 3. Test Authentication Flow
```bash
# 1. Register a new user
POST /api/auth/register

# 2. Login with credentials
POST /api/auth/login

# 3. Use token for authenticated requests
Authorization: Bearer <access_token>
```

---

## 📝 Documentation Standards

### Request/Response Format
All API responses follow this format:
```json
{
  "success": true|false,
  "message": "Human-readable message",
  "data": {
    // Response data
  },
  "errors": [
    // Validation errors (if any)
  ]
}
```

### Error Handling
- **400**: Validation errors
- **401**: Authentication required
- **403**: Access denied
- **404**: Resource not found
- **409**: Resource conflict
- **429**: Rate limit exceeded
- **500**: Server error

---

## 🛠️ Development Notes

### Adding New Endpoints
1. Update route files in service
2. Update corresponding documentation file
3. Add to `swagger.yaml` specification
4. Add to Postman collection
5. Update this README

### Documentation Maintenance
- Keep documentation in sync with implementation
- Use actual request/response examples
- Include validation rules and constraints
- Document rate limits and security requirements

---

**Last Updated**: July 14, 2025  
**Documentation Version**: 1.0.0
{
  "username": "string",
  "email": "string", 
  "password": "string"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "createdAt": "datetime"
}
```
```

## 🔄 Implementation Timeline

### Phase 1 (Weeks 1-2)
- [ ] User Service API documentation
- [ ] Authentication flow documentation
- [ ] Basic error handling guide

### Phase 2 (Weeks 3-4)
- [ ] Content Service API documentation
- [ ] File upload API documentation
- [ ] Service integration patterns

### Phase 3 (Weeks 5-6)
- [ ] Chat Service WebSocket API
- [ ] Notification Service API
- [ ] Real-time communication guide

### Phase 4 (Weeks 7+)
- [ ] Analytics Service API
- [ ] Search Service API
- [ ] Complete integration guide

## 📚 Tools & Standards

### Documentation Tools
- **Swagger UI** for interactive API docs
- **Postman Collections** for testing
- **OpenAPI Generator** for client SDKs
- **Markdown** for additional guides

### API Standards
- **RESTful conventions** for HTTP APIs
- **JSON** for request/response format
- **ISO 8601** for date/time format
- **UUID v4** for unique identifiers
- **Semantic versioning** for API versions

## 🎯 Quick Start *(When Available)*

1. **Browse APIs**: Use Swagger UI at `http://localhost:3000/api-docs`
2. **Test Endpoints**: Import Postman collection
3. **Integration**: Follow service-specific guides
4. **Authentication**: Set up JWT tokens

---

**Status**: Placeholder - Documentation will be created as services are implemented  
**Next Action**: Create User Service API docs (Week 1)  
**Owner**: Development Team  
**Last Updated**: July 6, 2025
