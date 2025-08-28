# CORS Configuration

This document describes the Cross-Origin Resource Sharing (CORS) configuration for the Radyo Natin API.

## Overview

CORS is configured to allow only specific domains listed in the environment variables, providing enhanced security by preventing unauthorized cross-origin requests.

## Environment Configuration

### .env File
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173,http://127.0.0.1:3000
```

Add your allowed domains to the `ALLOWED_ORIGINS` environment variable, separated by commas.

### Common Frontend Ports
- `http://localhost:3000` - Create React App, Next.js
- `http://localhost:3001` - Alternative React port
- `http://localhost:5173` - Vite development server
- `http://127.0.0.1:3000` - Alternative localhost format

## CORS Settings

### Allowed Methods
- `GET` - Retrieve data
- `POST` - Create new resources
- `PUT` - Update entire resources
- `PATCH` - Partial updates
- `DELETE` - Remove resources
- `OPTIONS` - Preflight requests

### Allowed Headers
- `Origin` - Request origin
- `X-Requested-With` - XMLHttpRequest identifier
- `Content-Type` - Request content type
- `Accept` - Accepted response types
- `Authorization` - JWT tokens
- `X-API-Key` - API key authentication

### Exposed Headers
- `X-RateLimit-Limit` - Rate limit maximum
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset timestamp

### Other Settings
- **Credentials:** `true` - Allows cookies and authorization headers
- **Options Success Status:** `200` - For legacy browser support

## Development vs Production

### Development Mode
```javascript
// When NODE_ENV=development and no ALLOWED_ORIGINS set
// Allows all origins for easier development
```

### Production Mode
```javascript
// Only origins listed in ALLOWED_ORIGINS are allowed
// Strict CORS policy enforced
```

## Configuration Implementation

### Middleware Function
```javascript
const corsConfig = () => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
        : [];

    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return {
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, curl)
            if (!origin) return callback(null, true);
            
            // Development mode with no specific origins
            if (isDevelopment && allowedOrigins.length === 0) {
                return callback(null, true);
            }
            
            // Check if origin is allowed
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            
            // Reject origin
            const message = `CORS policy: Origin ${origin} is not allowed.`;
            return callback(new Error(message), false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'X-API-Key'
        ],
        exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
        optionsSuccessStatus: 200
    };
};
```

### Usage in Express
```javascript
const cors = require('cors');
const { corsConfig } = require('./middleware');

app.use(cors(corsConfig()));
```

## Frontend Implementation

### Fetch API
```javascript
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  credentials: 'include', // Important for CORS with credentials
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});
```

### Axios
```javascript
import axios from 'axios';

// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:3000';

// Make requests
const response = await axios.post('/api/auth/login', {
  email: 'user@example.com',
  password: 'password'
}, {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
```

### React with Hooks
```javascript
const apiCall = async () => {
  try {
    const response = await fetch('/api/users', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};
```

## Common CORS Errors

### "Access-Control-Allow-Origin" Error
```
Access to fetch at 'http://localhost:3000/api/users' from origin 'http://localhost:3001' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present.
```

**Solution:** Add your frontend domain to `ALLOWED_ORIGINS`

### "Preflight Request Failed"
```
Access to fetch at 'http://localhost:3000/api/users' from origin 'http://localhost:3001' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check.
```

**Solution:** Ensure OPTIONS method is allowed and proper headers are configured

### "Credentials Not Allowed"
```
Access to fetch at 'http://localhost:3000/api/auth/login' from origin 'http://localhost:3001' 
has been blocked by CORS policy: The value of the 'Access-Control-Allow-Credentials' header is '' 
which must be 'true' when the request's credentials mode is 'include'.
```

**Solution:** Ensure `credentials: true` is set in CORS config

## Testing CORS

### Using cURL
```bash
# Test preflight request
curl -X OPTIONS http://localhost:3000/api/users \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v

# Test actual request
curl -X GET http://localhost:3000/api/users \
  -H "Origin: http://localhost:3001" \
  -H "Authorization: Bearer your-token" \
  -v
```

### Browser Console Testing
```javascript
// Test CORS from browser console
fetch('http://localhost:3000/api/health', {
  method: 'GET',
  credentials: 'include'
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('CORS Error:', error));
```

## Production Configuration

### For Production Domains
```env
# Production .env
NODE_ENV=production
ALLOWED_ORIGINS=https://radyonatin.com,https://www.radyonatin.com,https://admin.radyonatin.com
```

### HTTPS Considerations
- Always use HTTPS in production
- Ensure all allowed origins use HTTPS
- Mixed content (HTTP/HTTPS) will be blocked by browsers

### CDN and Subdomains
```env
ALLOWED_ORIGINS=https://radyonatin.com,https://api.radyonatin.com,https://cdn.radyonatin.com
```

## Security Best Practices

1. **Specific Origins:** Never use `*` for `Access-Control-Allow-Origin` in production
2. **Environment Variables:** Keep allowed origins in environment variables
3. **Regular Review:** Regularly review and update allowed origins
4. **Minimal Headers:** Only expose necessary headers
5. **Credentials:** Only enable credentials when necessary
6. **HTTPS Only:** Use HTTPS in production
7. **Subdomain Policy:** Be explicit about subdomain access

## Troubleshooting

### Check Current CORS Settings
```javascript
// Add temporary logging to see current config
console.log('CORS Config:', corsConfig());
console.log('Allowed Origins:', process.env.ALLOWED_ORIGINS);
```

### Development Debugging
```javascript
// Temporarily log all CORS requests
app.use((req, res, next) => {
  console.log('Origin:', req.headers.origin);
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  next();
});
```

### Common Solutions
1. **Restart Server:** After changing environment variables
2. **Check .env:** Ensure no trailing spaces in ALLOWED_ORIGINS
3. **Browser Cache:** Clear browser cache or use incognito mode
4. **Port Numbers:** Ensure port numbers match exactly
5. **Protocol:** HTTP vs HTTPS must match

## Multiple Environment Setup

### Development
```env
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173
```

### Staging
```env
NODE_ENV=staging
ALLOWED_ORIGINS=https://staging.radyonatin.com,https://admin-staging.radyonatin.com
```

### Production
```env
NODE_ENV=production
ALLOWED_ORIGINS=https://radyonatin.com,https://www.radyonatin.com,https://admin.radyonatin.com
```
