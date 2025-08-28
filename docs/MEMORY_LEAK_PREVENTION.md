# EventEmitter Memory Leak Prevention

This document explains the MaxListenersExceededWarning and how it's prevented in the Radyo Natin API.

## Problem

The `MaxListenersExceededWarning` occurs when too many event listeners are added to the same EventEmitter instance, typically due to:

1. Multiple database connections
2. Repeated server restarts during development
3. Not properly cleaning up event listeners
4. Multiple process signal handlers

## Warning Message
```
MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 
11 exit listeners added to [Bus]. MaxListeners is 10. 
Use emitter.setMaxListeners() to increase limit
```

## Solutions Implemented

### 1. Set Maximum Listeners Limit
```javascript
// In index.js
process.setMaxListeners(15);
```

### 2. Prevent Duplicate Database Connections
```javascript
// In config/database.js
let isConnected = false;
let hasEventListeners = false;

const connectDB = async () => {
    // Avoid multiple connections
    if (isConnected) {
        console.log('📦 Using existing MongoDB connection');
        return;
    }
    
    // Set up event listeners only once
    if (!hasEventListeners) {
        // ... event listener setup
        hasEventListeners = true;
    }
};
```

### 3. Graceful Shutdown Handling
```javascript
// Check if listeners already exist before adding
if (!process.listenerCount('SIGTERM')) {
    process.on('SIGTERM', gracefulShutdown);
}
if (!process.listenerCount('SIGINT')) {
    process.on('SIGINT', gracefulShutdown);
}
```

### 4. Nodemon Configuration
```json
{
  "delay": "1000",
  "signal": "SIGTERM",
  "verbose": false
}
```

## Development Monitoring

### Check Current Listeners
```javascript
// In development mode
console.log(`📊 Current process listeners - SIGINT: ${process.listenerCount('SIGINT')}, SIGTERM: ${process.listenerCount('SIGTERM')}`);
```

### Debug Event Listeners
```javascript
// To see all listeners on process
console.log('All SIGINT listeners:', process.listeners('SIGINT').length);
console.log('All SIGTERM listeners:', process.listeners('SIGTERM').length);
```

## Best Practices

### 1. Single Database Connection
- Use singleton pattern for database connections
- Check connection state before creating new connections
- Reuse existing connections

### 2. Event Listener Management
- Always check if listeners exist before adding
- Use `process.listenerCount()` to check existing listeners
- Clean up listeners when not needed

### 3. Graceful Shutdown
- Handle both SIGINT and SIGTERM signals
- Close database connections properly
- Close HTTP server gracefully

### 4. Development Tools
- Use nodemon with proper configuration
- Set appropriate delays for file watching
- Use proper signal handling

## Scripts for Development

### Clean Development Start
```bash
npm run dev:clean
```

### Debug Mode
```bash
npm run debug
```

### Production Start
```bash
npm start
```

## Monitoring in Production

### PM2 Configuration
```json
{
  "apps": [{
    "name": "radyo-natin-api",
    "script": "index.js",
    "instances": "max",
    "exec_mode": "cluster",
    "kill_timeout": 5000,
    "wait_ready": true,
    "listen_timeout": 3000
  }]
}
```

### Health Check Monitoring
```javascript
// Monitor process health
const healthCheck = () => {
    const listenerCounts = {
        SIGINT: process.listenerCount('SIGINT'),
        SIGTERM: process.listenerCount('SIGTERM'),
        exit: process.listenerCount('exit')
    };
    
    // Log if counts exceed thresholds
    Object.entries(listenerCounts).forEach(([event, count]) => {
        if (count > 5) {
            console.warn(`⚠️ High listener count for ${event}: ${count}`);
        }
    });
};
```

## Common Causes and Solutions

### Multiple nodemon Restarts
**Problem:** Nodemon creates new listeners on each restart
**Solution:** Use proper nodemon configuration with delays and signal handling

### Database Connection Issues
**Problem:** Multiple connection attempts create multiple listeners
**Solution:** Implement connection state management

### Third-party Libraries
**Problem:** Some libraries add their own process listeners
**Solution:** Review library documentation and implement proper cleanup

### Testing Environment
**Problem:** Tests may create multiple server instances
**Solution:** Proper test setup and teardown

## Debugging Commands

### Check Listener Counts
```javascript
console.log('Process listener counts:');
console.log('SIGINT:', process.listenerCount('SIGINT'));
console.log('SIGTERM:', process.listenerCount('SIGTERM'));
console.log('exit:', process.listenerCount('exit'));
console.log('uncaughtException:', process.listenerCount('uncaughtException'));
```

### Remove All Listeners (Development Only)
```javascript
// WARNING: Only use in development for debugging
process.removeAllListeners('SIGINT');
process.removeAllListeners('SIGTERM');
```

### List All Event Names
```javascript
console.log('All process event names:', process.eventNames());
```

## Prevention Checklist

- [ ] Set appropriate `maxListeners` limit
- [ ] Check for existing listeners before adding new ones
- [ ] Implement proper database connection management
- [ ] Use graceful shutdown handlers
- [ ] Configure nodemon properly for development
- [ ] Monitor listener counts in production
- [ ] Clean up event listeners in tests
- [ ] Review third-party library event handling

## When to Increase MaxListeners

Increase the limit when:
- You have legitimate need for many listeners
- You're using multiple third-party libraries that add listeners
- You have complex event handling requirements

**Current Setting:** `process.setMaxListeners(15)`

This allows for:
- 2-3 database connection listeners
- 2-3 graceful shutdown handlers
- 5-8 application-specific listeners
- Buffer for third-party library listeners

## Monitoring and Alerts

### Production Monitoring
```javascript
// Set up monitoring alerts
setInterval(() => {
    const totalListeners = process.eventNames()
        .reduce((total, event) => total + process.listenerCount(event), 0);
    
    if (totalListeners > 20) {
        console.error(`🚨 High event listener count: ${totalListeners}`);
        // Send alert to monitoring service
    }
}, 60000); // Check every minute
```

This comprehensive approach ensures that the EventEmitter memory leak warning is prevented while maintaining proper application functionality.
