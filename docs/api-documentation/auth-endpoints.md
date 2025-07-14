# 🔐 Authentication API Documentation

## Overview
The Authentication API handles user registration, login, password management, and session management for the social platform.

**Base URL**: `http://localhost:3000/api/auth`

---

## 📋 Table of Contents
- [Register](#register)
- [Login](#login)
- [Refresh Token](#refresh-token)
- [Logout](#logout)
- [Password Management](#password-management)
- [Email Verification](#email-verification)
- [Session Management](#session-management)
- [Current User](#current-user)

---

## 🔓 Public Endpoints

### Register
Create a new user account.

**Endpoint**: `POST /api/auth/register`  
**Access**: Public

#### Request Body
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "phone": "+1234567890",
  "agreeToTerms": true
}
```

#### Validation Rules
- **email**: Valid email format, max 255 chars
- **username**: 3-30 chars, alphanumeric + underscore only
- **password**: Min 8 chars, must contain uppercase, lowercase, number, special char
- **firstName/lastName**: 1-100 chars, letters/spaces/hyphens only
- **dateOfBirth**: Valid date, not in future, after 1900
- **phone**: Valid phone number format
- **agreeToTerms**: Must be true

#### Example Request
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "username": "alice_dev",
    "password": "MySecure123!",
    "firstName": "Alice",
    "lastName": "Developer",
    "dateOfBirth": "1995-03-20",
    "agreeToTerms": true
  }'
```

#### Success Response (201)
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your email.",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "alice@example.com",
      "username": "alice_dev",
      "firstName": "Alice",
      "lastName": "Developer",
      "isEmailVerified": false,
      "createdAt": "2025-07-14T10:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

---

### Login
Authenticate user credentials.

**Endpoint**: `POST /api/auth/login`  
**Access**: Public

#### Request Body
```json
{
  "identifier": "alice@example.com",
  "password": "MySecure123!"
}
```

#### Validation Rules
- **identifier**: Email or username
- **password**: Required

#### Example Request
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "alice_dev",
    "password": "MySecure123!"
  }'
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "alice@example.com",
      "username": "alice_dev",
      "firstName": "Alice",
      "lastName": "Developer",
      "isEmailVerified": true,
      "profilePicture": "https://example.com/alice.jpg",
      "lastLoginAt": "2025-07-14T10:35:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

---

### Refresh Token
Get a new access token using refresh token.

**Endpoint**: `POST /api/auth/refresh`  
**Access**: Public

#### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

---

## 🔒 Password Management

### Forgot Password
Request a password reset email.

**Endpoint**: `POST /api/auth/forgot-password`  
**Access**: Public

#### Request Body
```json
{
  "email": "alice@example.com"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "Password reset email sent successfully"
}
```

---

### Reset Password
Reset password using reset token.

**Endpoint**: `POST /api/auth/reset-password`  
**Access**: Public

#### Request Body
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecure123!"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## ✉️ Email Verification

### Verify Email
Verify email address using verification token.

**Endpoint**: `POST /api/auth/verify-email`  
**Access**: Public

#### Request Body
```json
{
  "token": "verification-token-from-email"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "isEmailVerified": true
    }
  }
}
```

---

## 🔐 Protected Endpoints
> **Note**: All protected endpoints require authentication:  
> `Authorization: Bearer <access_token>`

### Logout
Logout current user session.

**Endpoint**: `POST /api/auth/logout`  
**Access**: Private

#### Example Request
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Change Password
Change user password (requires current password).

**Endpoint**: `POST /api/auth/change-password`  
**Access**: Private

#### Request Body
```json
{
  "currentPassword": "MySecure123!",
  "newPassword": "NewSecure456!"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 🖥️ Session Management

### Get User Sessions
Get all active sessions for the current user.

**Endpoint**: `GET /api/auth/sessions`  
**Access**: Private

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session-123",
        "deviceInfo": "Chrome on Windows",
        "ipAddress": "192.168.1.1",
        "location": "San Francisco, CA",
        "isCurrentSession": true,
        "createdAt": "2025-07-14T10:30:00.000Z",
        "lastActiveAt": "2025-07-14T11:00:00.000Z"
      }
    ]
  }
}
```

---

### Revoke All Sessions
Revoke all user sessions (except current).

**Endpoint**: `DELETE /api/auth/sessions`  
**Access**: Private

#### Success Response (200)
```json
{
  "success": true,
  "message": "All sessions revoked successfully",
  "data": {
    "revokedCount": 3
  }
}
```

---

## 👤 Current User

### Get Current User
Get current authenticated user profile.

**Endpoint**: `GET /api/auth/me`  
**Access**: Private

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "alice@example.com",
      "username": "alice_dev",
      "firstName": "Alice",
      "lastName": "Developer",
      "bio": "Full-stack developer passionate about creating amazing user experiences.",
      "location": "San Francisco, CA",
      "website": "https://alice-dev.com",
      "profilePicture": "https://example.com/alice.jpg",
      "isEmailVerified": true,
      "isPhoneVerified": false,
      "isVerified": false,
      "isPrivate": false,
      "createdAt": "2025-07-14T10:30:00.000Z",
      "lastLoginAt": "2025-07-14T11:00:00.000Z"
    }
  }
}
```

---

## 🔴 Common Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### User Already Exists (409)
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

### Rate Limit Exceeded (429)
```json
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

---

## 🔧 Authentication Headers

### Authorization Header
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiration
- **Access Token**: 1 hour (3600 seconds)
- **Refresh Token**: 30 days
- **Reset Token**: 1 hour
- **Verification Token**: 24 hours

---

## 📊 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|---------|
| Register | 5 requests | 15 minutes |
| Login | 10 requests | 15 minutes |
| Forgot Password | 3 requests | 15 minutes |
| Reset Password | 5 requests | 15 minutes |
| Change Password | 5 requests | 15 minutes |
