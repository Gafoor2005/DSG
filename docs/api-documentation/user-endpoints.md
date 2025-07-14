# 👤 User Management API Documentation

## Overview
The User Management API handles user profiles, account settings, and user search functionality.

**Base URL**: `http://localhost:3000/api/users`

---

## 📋 Table of Contents
- [Search Users](#search-users)
- [Get User Profile](#get-user-profile)
- [Update Profile](#update-profile)
- [Notification Preferences](#notification-preferences)
- [Account Management](#account-management)
- [User Statistics](#user-statistics)

---

## 🔓 Public Endpoints

### Search Users
Search for users by username, name, or email.

**Endpoint**: `GET /api/users/search`  
**Access**: Public (optional authentication for better results)

#### Query Parameters
```
q=string          // Search query (required)
limit=number      // Results per page (default: 20, max: 100)
offset=number     // Pagination offset (default: 0)
verified=boolean  // Filter verified users only
```

#### Example Request
```bash
curl -X GET "http://localhost:3000/api/users/search?q=alice&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "alice_dev",
        "firstName": "Alice",
        "lastName": "Developer",
        "bio": "Full-stack developer passionate about creating amazing UX.",
        "profilePicture": "https://example.com/alice.jpg",
        "isVerified": false,
        "isPrivate": false,
        "followerCount": 1250,
        "followingCount": 380
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 10,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

---

### Get User Profile
Get user profile by user ID.

**Endpoint**: `GET /api/users/:userId`  
**Access**: Public (optional authentication for privacy control)

#### Path Parameters
- `userId` (string): UUID of the user

#### Example Request
```bash
curl -X GET http://localhost:3000/api/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "alice_dev",
      "firstName": "Alice",
      "lastName": "Developer",
      "bio": "Full-stack developer passionate about creating amazing user experiences.",
      "location": "San Francisco, CA",
      "website": "https://alice-dev.com",
      "profilePicture": "https://example.com/alice.jpg",
      "coverPhoto": "https://example.com/alice-cover.jpg",
      "isVerified": false,
      "isPrivate": false,
      "createdAt": "2025-07-14T10:30:00.000Z",
      "stats": {
        "followerCount": 1250,
        "followingCount": 380,
        "postCount": 45
      }
    }
  }
}
```

---

## 🔒 Protected Endpoints
> **Note**: All protected endpoints require authentication:  
> `Authorization: Bearer <access_token>`

### Update Profile
Update current user's profile information.

**Endpoint**: `PUT /api/users/profile`  
**Access**: Private

#### Request Body
```json
{
  "firstName": "Alice",
  "lastName": "Developer",
  "bio": "Updated bio here",
  "location": "New York, NY",
  "website": "https://alice-dev.com",
  "dateOfBirth": "1995-03-20",
  "phone": "+1234567890",
  "occupation": "Software Engineer",
  "interests": ["coding", "design", "photography"],
  "isPrivate": false,
  "language": "en",
  "timezone": "America/New_York"
}
```

#### Validation Rules
- **firstName/lastName**: 1-100 chars, letters/spaces/hyphens only
- **bio**: Max 500 chars
- **location**: Max 255 chars
- **website**: Valid URL format
- **phone**: Valid phone number format
- **occupation**: Max 100 chars
- **interests**: Array of strings, max 20 items
- **language**: ISO language code
- **timezone**: Valid timezone name

#### Example Request
```bash
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Senior full-stack developer with 8 years of experience",
    "location": "Seattle, WA",
    "occupation": "Senior Software Engineer"
  }'
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "alice_dev",
      "firstName": "Alice",
      "lastName": "Developer",
      "bio": "Senior full-stack developer with 8 years of experience",
      "location": "Seattle, WA",
      "occupation": "Senior Software Engineer",
      "updatedAt": "2025-07-14T11:30:00.000Z"
    }
  }
}
```

---

## 🔔 Notification Preferences

### Update Notification Preferences
Update user's notification preferences.

**Endpoint**: `PUT /api/users/notifications`  
**Access**: Private

#### Request Body
```json
{
  "emailNotifications": {
    "marketing": false,
    "social": true,
    "security": true,
    "digest": true,
    "frequency": "weekly"
  },
  "pushNotifications": {
    "likes": true,
    "comments": true,
    "follows": true,
    "messages": true
  },
  "inAppNotifications": {
    "sound": true,
    "desktop": true
  }
}
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "Notification preferences updated successfully",
  "data": {
    "preferences": {
      "emailNotifications": {
        "marketing": false,
        "social": true,
        "security": true,
        "digest": true,
        "frequency": "weekly"
      },
      "pushNotifications": {
        "likes": true,
        "comments": true,
        "follows": true,
        "messages": true
      },
      "inAppNotifications": {
        "sound": true,
        "desktop": true
      }
    }
  }
}
```

---

## ⚙️ Account Management

### Deactivate Account
Deactivate user account (soft delete).

**Endpoint**: `POST /api/users/deactivate`  
**Access**: Private

#### Request Body
```json
{
  "reason": "Taking a break",
  "feedback": "Great platform, just need some time off",
  "password": "MySecure123!"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "Account deactivated successfully",
  "data": {
    "deactivatedAt": "2025-07-14T11:45:00.000Z",
    "reactivationToken": "reactivation-token-here"
  }
}
```

---

## 📊 User Statistics

### Get User Statistics
Get user's statistics (followers, following, posts, etc.).

**Endpoint**: `GET /api/users/:userId/stats`  
**Access**: Public (optional authentication)

#### Path Parameters
- `userId` (string): UUID of the user

#### Example Request
```bash
curl -X GET http://localhost:3000/api/users/550e8400-e29b-41d4-a716-446655440000/stats \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "stats": {
      "followerCount": 1250,
      "followingCount": 380,
      "postCount": 45,
      "likesReceived": 2340,
      "commentsReceived": 567,
      "joinedAt": "2025-07-14T10:30:00.000Z",
      "lastActiveAt": "2025-07-14T11:00:00.000Z",
      "accountAge": {
        "days": 0,
        "months": 0,
        "years": 0
      }
    }
  }
}
```

---

## 🔴 Common Error Responses

### User Not Found (404)
```json
{
  "success": false,
  "message": "User not found"
}
```

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "bio",
      "message": "Bio cannot be longer than 500 characters"
    }
  ]
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### Forbidden (403)
```json
{
  "success": false,
  "message": "Access denied. User profile is private."
}
```

---

## 📱 Profile Privacy

### Privacy Levels
- **Public**: Profile visible to everyone
- **Private**: Profile visible only to approved followers

### Private Profile Response (Non-follower)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "alice_dev",
      "firstName": "Alice",
      "lastName": "Developer",
      "profilePicture": "https://example.com/alice.jpg",
      "isPrivate": true,
      "isFollowing": false,
      "hasRequestedFollow": false
    }
  }
}
```

---

## 🔧 Search Filters

### Available Search Filters
- **Verified Users**: `verified=true`
- **Location**: Geographic proximity (if location enabled)
- **Mutual Connections**: Users with mutual followers (authenticated users)

### Search Results Ranking
1. **Exact username matches**
2. **Name matches**
3. **Verified users**
4. **Mutual connections**
5. **Activity level**
6. **Account age**

---

## 📊 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|---------|
| Search Users | 100 requests | 15 minutes |
| Get User Profile | 200 requests | 15 minutes |
| Update Profile | 10 requests | 15 minutes |
| Update Notifications | 10 requests | 15 minutes |
| Deactivate Account | 3 requests | 24 hours |

---

## 🛡️ Security Features

1. **Input Sanitization**: All user inputs are sanitized
2. **Rate Limiting**: Prevents abuse of search and profile endpoints
3. **Privacy Controls**: Profile visibility settings
4. **Data Validation**: Strict validation of all user data
5. **Audit Logging**: All profile changes are logged
