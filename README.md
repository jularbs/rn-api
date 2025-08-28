# Express API

A RESTful API server for managing radio stations built with Express.js.

## Features

- 🚀 RESTful API endpoints
- � JWT authentication and authorization
- 👥 User management with soft delete
- �🛡️ Request validation and error handling
- 📝 Request logging middleware
- ⚡ Rate limiting
- 🌐 Configurable CORS policy
- 🔒 Optional API key authentication
- 📊 Health check endpoint
- 📖 Built-in API documentation

## Getting Started

### Prerequisites

- Node.js (v22 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create your environment configuration:
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run dev
```

Or start the production server:
```bash
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Base URL
```
http://localhost:3000
```

### Health Check
- **GET** `/api/health` - Check API health status

### Stations
- **GET** `/api/stations` - Get all radio stations
- **GET** `/api/stations/:id` - Get a specific station by ID
- **POST** `/api/stations` - Create a new station
- **PUT** `/api/stations/:id` - Update an existing station
- **DELETE** `/api/stations/:id` - Delete a station

### Documentation
- **GET** `/api/docs` - Get API documentation

## Request/Response Examples

### Get All Stations
```bash
curl -X GET http://localhost:3000/api/stations
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Radyo Natin Nationwide",
      "frequency": "105.9 FM",
      "location": "Manila",
      "description": "Your nationwide radio station"
    }
  ],
  "count": 1
}
```

### Create a New Station
```bash
curl -X POST http://localhost:3000/api/stations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Radyo Natin Cebu",
    "frequency": "102.7 FM",
    "location": "Cebu",
    "description": "Cebu local radio station"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Station created successfully",
  "data": {
    "id": 2,
    "name": "Radyo Natin Cebu",
    "frequency": "102.7 FM",
    "location": "Cebu",
    "description": "Cebu local radio station",
    "createdAt": "2025-08-27T12:00:00.000Z"
  }
}
```

### Get Station by ID
```bash
curl -X GET http://localhost:3000/api/stations/1
```

### Update Station
```bash
curl -X PUT http://localhost:3000/api/stations/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Station Name",
    "description": "Updated description"
  }'
```

### Delete Station
```bash
curl -X DELETE http://localhost:3000/api/stations/1
```

## Project Structure

```
api/
├── index.js              # Main server file
├── package.json          # Dependencies and scripts
├── .env                  # Environment variables
├── .gitignore           # Git ignore rules
├── routes/              # API route handlers
│   └── stations.js      # Station-related routes
├── middleware/          # Custom middleware
│   └── index.js         # Middleware functions
└── README.md           # This file
```

## Environment Variables

Create a `.env` file with the following variables:

```env
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/radyo-natin

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173

# API Key (optional)
API_KEY=your_api_key_here
```

## CORS Configuration

The API uses a configurable CORS policy that only allows origins specified in the `ALLOWED_ORIGINS` environment variable. This provides enhanced security by preventing unauthorized cross-origin requests.

### Allowed Origins
- Add your frontend domains to `ALLOWED_ORIGINS`, separated by commas
- Common development ports are included by default
- In production, only specify your actual domains

### Example Frontend Origins
- `http://localhost:3000` - React, Next.js
- `http://localhost:5173` - Vite
- `https://yourdomain.com` - Production domain

For detailed CORS configuration, see [CORS Documentation](./docs/CORS_CONFIGURATION.md).

## Middleware

### Request Logger
Logs all incoming requests with timestamp, method, URL, and response time.

### Rate Limiter
Limits requests to 100 per 15-minute window per IP address by default.

### Validation
Validates required fields for station creation and updates.

### Authentication (Optional)
API key authentication can be enabled by setting `API_KEY` in environment variables.

## Development

### Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with auto-restart
- `npm test` - Run tests (to be implemented)

### Adding New Routes

1. Create a new route file in the `routes/` directory
2. Import and use it in `index.js`
3. Add appropriate middleware if needed

### Adding New Middleware

1. Add your middleware function to `middleware/index.js`
2. Export it and import in `index.js`
3. Use `app.use()` to apply it globally or to specific routes

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test your changes
5. Submit a pull request

## License

ISC License
