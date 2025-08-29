# JWT Authentication System

This document describes the JWT (JSON Web Token) authentication system implemented in the Radyo Natin API.

## Overview

The API uses JWT tokens for stateless authentication with the following features:

- User registration and login
- Token-based authentication
- Role-based authorization (user, admin, moderator)
- Refresh token mechanism
- Password management
- Profile management
- Rate limiting for auth endpoints

## Authentication Flow

### 1. User Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "user"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "emailVerified": false,
      "createdAt": "2025-08-27T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

### 2. User Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "lastLogin": "2025-08-27T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

### 3. Using Protected Endpoints

Include the JWT token in the Authorization header:

```http
GET /api/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Environment Variables

Add these to your `.env` file:

```env
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

## Authentication Endpoints

### Register User

- **POST** `/api/auth/register`
- **Rate Limited:** 3 registrations per hour
- **Body:** `firstName`, `lastName`, `email`, `password`, `phone` (optional), `role` (optional)

### Login User

- **POST** `/api/auth/login`
- **Rate Limited:** 5 attempts per 15 minutes
- **Body:** `email`, `password`

### Refresh Token

- **POST** `/api/auth/refresh`
- **Body:** `refreshToken`

### Get Current User

- **GET** `/api/auth/me`
- **Auth Required:** Yes

### Update Profile

- **PUT** `/api/auth/me`
- **Auth Required:** Yes
- **Body:** Any user fields except sensitive ones

### Change Password

- **PATCH** `/api/auth/change-password`
- **Auth Required:** Yes
- **Body:** `currentPassword`, `newPassword`

### Logout

- **POST** `/api/auth/logout`
- **Auth Required:** Yes

### Verify Token

- **GET** `/api/auth/verify-token`
- **Auth Required:** Yes

## Middleware Functions

### `authenticate`

Verifies JWT token and adds user to request object.

```javascript
const { authenticate } = require("./middleware/auth");

router.get("/protected", authenticate, (req, res) => {
  // req.user contains the authenticated user
  res.json({ user: req.user });
});
```

### `authorize(...roles)`

Checks if authenticated user has required role.

```javascript
const { authenticate, authorize } = require("./middleware/auth");

// Only admins can access
router.get("/admin-only", authenticate, authorize("admin"), handler);

// Admins or moderators can access
router.get(
  "/staff-only",
  authenticate,
  authorize("admin", "moderator"),
  handler
);
```

```javascript
const { authenticate } = require("./middleware/auth");

// User can access their own profile or admin can access any
router.get("/users/:id", authenticate, authorize("admin", "owner"), handler);
```

### `optionalAuth`

Authenticates user if token is provided, but doesn't require it.

```javascript
const { optionalAuth } = require("./middleware/auth");

router.get("/public-with-user-context", optionalAuth, (req, res) => {
  // req.user will be null if not authenticated
  if (req.user) {
    // User is authenticated
  }
});
```

## User Roles

### user (default)

- Can access their own profile
- Can update their own information
- Can change their own password

### moderator

- All user permissions
- Can moderate content (future feature)

### admin

- All permissions
- Can manage all users
- Can access user statistics
- Can soft delete/restore users
- Can permanently delete users

## Rate Limiting

Authentication endpoints have enhanced rate limiting:

- **Registration:** 3 attempts per hour
- **Login:** 5 attempts per 15 minutes
- **General:** 100 requests per 15 minutes

## Token Management

### Access Tokens

- **Expiry:** 7 days (configurable)
- **Contains:** User ID
- **Used for:** API authentication

### Refresh Tokens

- **Expiry:** 30 days (configurable)
- **Contains:** User ID + type flag
- **Used for:** Getting new access tokens

### Token Refresh Flow

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "new_access_token",
    "refreshToken": "new_refresh_token",
    "expiresIn": "7d"
  }
}
```

## Error Responses

### Authentication Errors

```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### Authorization Errors

```json
{
  "success": false,
  "message": "Access denied. Required role: admin"
}
```

### Token Expiry

```json
{
  "success": false,
  "message": "Token has expired."
}
```

### Invalid Token

```json
{
  "success": false,
  "message": "Invalid token."
}
```

## Security Features

### Password Hashing

- Uses bcryptjs with salt rounds of 12
- Passwords never stored in plain text
- Passwords excluded from queries by default

### Rate Limiting

- Prevents brute force attacks
- Configurable limits per endpoint
- Returns 429 status with retry information

### Token Security

- Stateless JWT tokens
- Configurable expiration
- Refresh token rotation
- Secret key from environment variables

### Account Security

- Inactive accounts blocked
- Soft deleted accounts blocked
- Last login tracking
- Email verification tracking

## Client-Side Implementation

### Storing Tokens

```javascript
// Store tokens after login
localStorage.setItem("accessToken", data.token);
localStorage.setItem("refreshToken", data.refreshToken);
```

### Making Authenticated Requests

```javascript
const token = localStorage.getItem("accessToken");

fetch("/api/users", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});
```

### Handling Token Expiry

```javascript
// Intercept 401 responses and refresh token
if (response.status === 401) {
  const refreshToken = localStorage.getItem("refreshToken");

  const refreshResponse = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (refreshResponse.ok) {
    const data = await refreshResponse.json();
    localStorage.setItem("accessToken", data.data.token);
    localStorage.setItem("refreshToken", data.data.refreshToken);

    // Retry original request
  } else {
    // Redirect to login
  }
}
```

### Logout

```javascript
// Remove tokens and call logout endpoint
localStorage.removeItem("accessToken");
localStorage.removeItem("refreshToken");

fetch("/api/auth/logout", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

## Testing Authentication

### Testing with cURL

#### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### Access Protected Endpoint

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Best Practices

1. **Secure JWT Secret:** Use a strong, random secret key
2. **Environment Variables:** Never commit secrets to version control
3. **Token Expiry:** Use reasonable expiration times
4. **HTTPS Only:** Always use HTTPS in production
5. **Client Storage:** Use secure storage for tokens
6. **Logout Handling:** Clear tokens on logout
7. **Error Handling:** Don't expose sensitive information in errors
8. **Rate Limiting:** Implement appropriate rate limits
9. **Account Management:** Handle inactive/deleted accounts
10. **Token Rotation:** Implement refresh token rotation for enhanced security

## Migration from Existing Users

If you have existing users without authentication, they can:

1. Use the registration endpoint to create an account
2. Admin can create accounts via `/api/users` endpoint
3. Password reset functionality can be added for existing users

## Troubleshooting

### Common Issues

1. **"Invalid token"** - Check token format and secret key
2. **"Token expired"** - Use refresh token to get new access token
3. **"Access denied"** - Check user role and permissions
4. **Rate limit exceeded** - Wait for rate limit window to reset
5. **User not found** - Check if user is active and not deleted
