# Soft Delete Implementation for User Model

This document describes the soft delete functionality implemented in the User model and API routes.

## Overview

Soft delete allows you to "delete" users without permanently removing them from the database. This is useful for:
- Data integrity and audit trails
- Ability to restore accidentally deleted users
- Maintaining references in other collections
- Compliance with data retention policies

## Model Changes

### New Fields Added

```javascript
deletedAt: {
  type: Date,
  default: null
},
deletedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null
}
```

### Instance Methods

#### `softDelete(deletedBy)`
Marks a user as deleted without removing from database.
```javascript
const user = await User.findById(userId);
await user.softDelete(adminUserId);
```

#### `restore()`
Restores a soft deleted user.
```javascript
const user = await User.findWithDeleted().findOne({ _id: userId });
await user.restore();
```

### Static Methods

#### `findDeleted()`
Returns only soft deleted users.
```javascript
const deletedUsers = await User.findDeleted();
```

#### `findNotDeleted()`
Returns only non-deleted users.
```javascript
const activeUsers = await User.findNotDeleted();
```

#### `findWithDeleted()`
Returns all users including soft deleted ones.
```javascript
const allUsers = await User.findWithDeleted();
```

#### `restoreById(id)`
Restores a user by ID.
```javascript
const restoredUser = await User.restoreById(userId);
```

#### `forceDelete(id)`
Permanently deletes a user from database.
```javascript
await User.forceDelete(userId);
```

## API Endpoints

### Soft Delete a User
```http
DELETE /api/users/:id
Content-Type: application/json

{
  "deletedBy": "admin_user_id" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "id": "user_id",
    "deletedAt": "2025-08-27T12:00:00.000Z",
  }
}
```

### Restore a Soft Deleted User
```http
POST /api/users/:id/restore
```

**Response:**
```json
{
  "success": true,
  "message": "User restored successfully",
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "fullName": "John Doe",
    "isActive": true
  }
}
```

### Get Soft Deleted Users
```http
GET /api/users/deleted?page=1&limit=10&search=john
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_id",
      "fullName": "John Doe",
      "email": "john@example.com",
      "deletedAt": "2025-08-27T12:00:00.000Z",
      "deletedBy": {
        "fullName": "Admin User",
        "email": "admin@example.com"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "itemsPerPage": 10,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### Get All Users Including Deleted
```http
GET /api/users/with-deleted?page=1&limit=10&isDeleted=true
```

### Permanently Delete a User
```http
DELETE /api/users/:id/permanent
```

**Response:**
```json
{
  "success": true,
  "message": "User permanently deleted",
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "fullName": "John Doe"
  }
}
```

### Get User Statistics with Soft Delete Info
```http
GET /api/users/stats/overview
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 45,
      "deletedUsers": 5,
      "allUsers": 50,
      "activeUsers": 40,
      "adminUsers": 3,
      "verifiedUsers": 42
    },
    "recentUsers": [...],
    "recentlyDeleted": [
      {
        "fullName": "John Doe",
        "email": "john@example.com",
        "deletedAt": "2025-08-27T12:00:00.000Z",
        "deletedBy": {
          "fullName": "Admin User"
        }
      }
    ]
  }
}
```

## Query Behavior

### Default Queries
By default, all User queries exclude soft deleted users:
```javascript
// This will NOT return soft deleted users
const users = await User.find();
```

### Including Soft Deleted Users
To include soft deleted users, use the special static method:
```javascript
// This WILL return soft deleted users
const allUsers = await User.findWithDeleted();
```

### Query Middleware
The model includes query middleware that automatically excludes soft deleted users:
```javascript
userSchema.pre(/^find/, function() {
 this.where({ deletedAt: null });
});

userSchema.pre('countDocuments', function () {
    this.where({ deletedAt: null });
});

```

## Best Practices

1. **Always use soft delete for user data** - Use the `softDelete()` method instead of `findByIdAndDelete()`

2. **Track who deleted the user** - Pass the `deletedBy` parameter when soft deleting

3. **Regular cleanup** - Implement a scheduled job to permanently delete old soft deleted records

4. **Audit trails** - Keep track of deletion and restoration activities

5. **User permissions** - Ensure proper authorization for delete/restore operations

6. **Data consistency** - Update related collections when users are soft deleted

## Migration Notes

If you have existing users in your database, they will automatically have:
- `deletedAt: null`
- `deletedBy: null`

No migration script is needed as these fields have default values.

## Security Considerations

1. Only authorized users should be able to perform soft delete operations
2. Permanent deletion should be restricted to super admins
3. Consider implementing time-based permanent deletion policies
4. Log all delete and restore operations for audit purposes

## Testing

Test the soft delete functionality with these scenarios:

1. Soft delete a user and verify they don't appear in normal queries
2. Restore a soft deleted user and verify they appear in normal queries
3. Permanently delete a user and verify they're completely removed
4. Test pagination and search with soft deleted users
5. Verify statistics include correct counts for deleted users
