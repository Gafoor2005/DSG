# 👥 Social Features API Documentation

## Overview
The Social Features API handles user relationships including following, blocking, and social interactions.

**Base URL**: `http://localhost:3000/api/social`

---

## 📋 Table of Contents
- [Follow Management](#follow-management)
- [User Relationships](#user-relationships)
- [Blocking System](#blocking-system)
- [User Reporting](#user-reporting)
- [Relationship Status](#relationship-status)

---

## 🔒 Authentication Required
> **Note**: All social endpoints require authentication:  
> `Authorization: Bearer <access_token>`

---

## 👥 Follow Management

### Follow User
Follow another user.

**Endpoint**: `POST /api/social/follow`  
**Access**: Private  
**Rate Limit**: 50 follows per 15 minutes

#### Request Body
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Example Request
```bash
curl -X POST http://localhost:3000/api/social/follow \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "User followed successfully",
  "data": {
    "relationship": {
      "id": "rel-123",
      "followerId": "current-user-id",
      "followingId": "550e8400-e29b-41d4-a716-446655440000",
      "relationshipType": "following",
      "createdAt": "2025-07-14T11:30:00.000Z"
    },
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "alice_dev",
      "firstName": "Alice",
      "lastName": "Developer",
      "profilePicture": "https://example.com/alice.jpg",
      "isVerified": false
    }
  }
}
```

---

### Unfollow User
Unfollow a user.

**Endpoint**: `POST /api/social/unfollow`  
**Access**: Private

#### Request Body
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "User unfollowed successfully",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "unfollowedAt": "2025-07-14T11:35:00.000Z"
  }
}
```

---

## 📋 User Relationships

### Get User Followers
Get list of users following a specific user.

**Endpoint**: `GET /api/social/:userId/followers`  
**Access**: Private

#### Path Parameters
- `userId` (string): UUID of the user

#### Query Parameters
```
limit=number      // Results per page (default: 20, max: 100)
offset=number     // Pagination offset (default: 0)
```

#### Example Request
```bash
curl -X GET "http://localhost:3000/api/social/550e8400-e29b-41d4-a716-446655440000/followers?limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "followers": [
      {
        "id": "follower-user-id",
        "username": "bob_smith",
        "firstName": "Bob",
        "lastName": "Smith",
        "profilePicture": "https://example.com/bob.jpg",
        "isVerified": true,
        "followedAt": "2025-07-10T14:20:00.000Z",
        "isFollowingBack": false
      }
    ],
    "pagination": {
      "total": 1250,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### Get User Following
Get list of users that a specific user is following.

**Endpoint**: `GET /api/social/:userId/following`  
**Access**: Private

#### Path Parameters
- `userId` (string): UUID of the user

#### Query Parameters
```
limit=number      // Results per page (default: 20, max: 100)
offset=number     // Pagination offset (default: 0)
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "following": [
      {
        "id": "following-user-id",
        "username": "charlie_brown",
        "firstName": "Charlie",
        "lastName": "Brown",
        "profilePicture": "https://example.com/charlie.jpg",
        "isVerified": false,
        "followedAt": "2025-07-12T09:15:00.000Z",
        "isFollowingBack": true
      }
    ],
    "pagination": {
      "total": 380,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

## 🚫 Blocking System

### Block User
Block another user.

**Endpoint**: `POST /api/social/block`  
**Access**: Private  
**Rate Limit**: 20 blocks per 15 minutes

#### Request Body
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "harassment"
}
```

#### Example Request
```bash
curl -X POST http://localhost:3000/api/social/block \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "spam"
  }'
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "User blocked successfully",
  "data": {
    "relationship": {
      "id": "rel-456",
      "blockerId": "current-user-id",
      "blockedId": "550e8400-e29b-41d4-a716-446655440000",
      "relationshipType": "blocked",
      "reason": "spam",
      "createdAt": "2025-07-14T11:40:00.000Z"
    }
  }
}
```

---

### Unblock User
Unblock a previously blocked user.

**Endpoint**: `POST /api/social/unblock`  
**Access**: Private

#### Request Body
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "User unblocked successfully",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "unblockedAt": "2025-07-14T11:45:00.000Z"
  }
}
```

---

### Get Blocked Users
Get list of users that the current user has blocked.

**Endpoint**: `GET /api/social/blocked`  
**Access**: Private

#### Query Parameters
```
limit=number      // Results per page (default: 20, max: 100)
offset=number     // Pagination offset (default: 0)
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "blockedUsers": [
      {
        "id": "blocked-user-id",
        "username": "spam_user",
        "firstName": "Spam",
        "lastName": "User",
        "profilePicture": "https://example.com/spam.jpg",
        "reason": "spam",
        "blockedAt": "2025-07-14T11:40:00.000Z"
      }
    ],
    "pagination": {
      "total": 5,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

---

## 🚨 User Reporting

### Report User
Report a user for inappropriate behavior.

**Endpoint**: `POST /api/social/report`  
**Access**: Private (requires verified account)  
**Rate Limit**: 10 reports per hour

#### Request Body
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "harassment",
  "description": "User is sending inappropriate messages",
  "evidence": "Screenshot or additional context"
}
```

#### Validation Rules
- **userId**: Valid UUID
- **reason**: One of: "spam", "harassment", "inappropriate_content", "impersonation", "other"
- **description**: 10-500 characters
- **evidence**: Optional, max 1000 characters

#### Example Request
```bash
curl -X POST http://localhost:3000/api/social/report \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "spam",
    "description": "User is repeatedly sending promotional content"
  }'
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "User reported successfully. Our team will review this report.",
  "data": {
    "report": {
      "id": "report-789",
      "reporterId": "current-user-id",
      "reportedUserId": "550e8400-e29b-41d4-a716-446655440000",
      "reason": "spam",
      "status": "pending",
      "createdAt": "2025-07-14T11:50:00.000Z"
    }
  }
}
```

---

## 🔗 Relationship Status

### Get Relationship Status
Get relationship status between current user and another user.

**Endpoint**: `GET /api/social/relationship/:userId`  
**Access**: Private

#### Path Parameters
- `userId` (string): UUID of the user to check relationship with

#### Example Request
```bash
curl -X GET http://localhost:3000/api/social/relationship/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "relationship": {
      "isFollowing": true,
      "isFollowedBy": false,
      "isBlocked": false,
      "isBlockedBy": false,
      "canInteract": true
    }
  }
}
```

#### Relationship Status Fields
- **isFollowing**: Current user follows the target user
- **isFollowedBy**: Target user follows the current user
- **isBlocked**: Current user has blocked the target user
- **isBlockedBy**: Target user has blocked the current user
- **canInteract**: Whether users can interact (not blocked either way)

---

## 🔴 Common Error Responses

### User Not Found (404)
```json
{
  "success": false,
  "message": "User not found"
}
```

### Cannot Follow Self (400)
```json
{
  "success": false,
  "message": "You cannot follow yourself"
}
```

### Already Following (409)
```json
{
  "success": false,
  "message": "You are already following this user"
}
```

### User Blocked (403)
```json
{
  "success": false,
  "message": "Cannot perform this action. User relationship blocked."
}
```

### Rate Limit Exceeded (429)
```json
{
  "success": false,
  "message": "Too many follow requests. Please try again later."
}
```

### Verification Required (403)
```json
{
  "success": false,
  "message": "Email verification required to report users"
}
```

---

## 📊 Rate Limits

| Endpoint | Limit | Window | Notes |
|----------|-------|---------|-------|
| Follow User | 50 requests | 15 minutes | Prevents spam following |
| Block User | 20 requests | 15 minutes | Prevents abuse |
| Report User | 10 requests | 1 hour | Requires verification |
| Get Followers/Following | 100 requests | 15 minutes | Read operations |
| Get Relationship | 200 requests | 15 minutes | Lightweight check |

---

## 🛡️ Security Features

1. **Mutual Blocking**: When user A blocks user B, B cannot see A's content
2. **Unfollow on Block**: Blocking automatically unfollows both directions
3. **Report Privacy**: Reported users are not notified of reports
4. **Rate Limiting**: Prevents spam following/blocking
5. **Verification Required**: Reporting requires verified email
6. **Audit Logging**: All social actions are logged for moderation

---

## 🔧 Business Logic

### Follow Behavior
- Following a private account sends a follow request (future feature)
- Following removes any previous block relationship
- Users cannot follow themselves

### Block Behavior
- Blocking automatically unfollows both directions
- Blocked users cannot see blocker's content
- Blocked users cannot interact with blocker
- Blocking is unidirectional (A blocks B ≠ B blocks A)

### Report Behavior
- Multiple reports for same user are aggregated
- Reports are reviewed by moderation team
- False reporting may result in account penalties
