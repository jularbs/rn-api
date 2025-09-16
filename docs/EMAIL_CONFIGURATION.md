# Email Configuration Environment Variables

To use the nodemailer utility, you need to set up the following environment variables in your `.env` file:

## Required Environment Variables

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email Settings
SMTP_FROM=noreply@yourapp.com
```

## Environment Variable Details

### SMTP_HOST
- **Description**: The SMTP server hostname
- **Examples**: 
  - Gmail: `smtp.gmail.com`
  - Outlook: `smtp-mail.outlook.com`
  - Yahoo: `smtp.mail.yahoo.com`
  - Custom SMTP: `mail.yourcompany.com`

### SMTP_PORT
- **Description**: The SMTP server port
- **Common values**:
  - `587` - STARTTLS (recommended)
  - `465` - SSL/TLS
  - `25` - Non-encrypted (not recommended)

### SMTP_SECURE
- **Description**: Whether to use SSL/TLS encryption
- **Values**: `true` or `false`
- **Note**: Set to `false` for port 587 (STARTTLS), `true` for port 465 (SSL)

### SMTP_USER
- **Description**: Your email address for authentication
- **Example**: `your-email@gmail.com`

### SMTP_PASS
- **Description**: Your email password or app-specific password
- **Important**: For Gmail, use an App Password, not your regular password
- **How to generate Gmail App Password**:
  1. Enable 2-Factor Authentication
  2. Go to Google Account settings
  3. Navigate to Security > 2-Step Verification > App passwords
  4. Generate a new app password for "Mail"

### SMTP_FROM (Optional)
- **Description**: Default sender email address
- **Example**: `noreply@yourapp.com`
- **Note**: Falls back to SMTP_USER if not provided

## Gmail Configuration Example

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=noreply@yourapp.com
```

## Outlook/Hotmail Configuration Example

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=noreply@yourapp.com
```

## Yahoo Configuration Example

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourapp.com
```

## Custom SMTP Server Example

```env
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourcompany.com
SMTP_PASS=your-password
SMTP_FROM=noreply@yourcompany.com
```

## Security Notes

1. **Never commit your `.env` file to version control**
2. **Use app-specific passwords for Gmail, Yahoo, etc.**
3. **Consider using environment-specific configurations for development, staging, and production**
4. **Regularly rotate your email passwords**
5. **Use strong, unique passwords for your email accounts**

## Testing the Configuration

You can test your email configuration by calling the `verifyEmailConnection()` function:

```typescript
import { verifyEmailConnection } from './src/utils/nodemailer';

// Test email configuration
verifyEmailConnection()
  .then(isConnected => {
    if (isConnected) {
      console.log('✅ Email configuration is working');
    } else {
      console.log('❌ Email configuration failed');
    }
  })
  .catch(error => {
    console.error('Email configuration error:', error);
  });
```

## Common Issues

### Gmail "Less secure app access"
- Gmail no longer supports "less secure apps"
- You must use 2-Factor Authentication and App Passwords

### Port 25 Blocked
- Many hosting providers block port 25
- Use port 587 (STARTTLS) or 465 (SSL) instead

### Authentication Failed
- Double-check your credentials
- Ensure you're using the correct server settings
- For Gmail/Yahoo, use app-specific passwords

### Connection Timeout
- Check if your hosting provider blocks SMTP ports
- Try different ports (587, 465)
- Verify firewall settings
