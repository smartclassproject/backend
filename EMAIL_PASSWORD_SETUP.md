# Email-Based Password Setup System

This document explains how to set up and use the new email-based password system for SmartClass.

## Overview

Instead of creating passwords directly during user creation, the system now sends secure email links that redirect users to the frontend for password setup. This approach is more secure and user-friendly.

## Features

- **Secure Token Generation**: Uses cryptographically secure random tokens
- **Email Notifications**: Beautiful HTML emails with setup/reset links
- **Token Expiration**: Configurable expiration times (default: 1 hour)
- **Password Reset**: Users can request password resets via email
- **Security**: Tokens are single-use and automatically expire

## Environment Configuration

Add these variables to your `.env` file:

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=YourApp <noreply@yourdomain.com>

# Password Reset Configuration
PASSWORD_RESET_EXPIRES_IN=1h
FRONTEND_PASSWORD_SETUP_URL=http://localhost:5173/setup-password

# Optional: Test email for testing
TEST_EMAIL=test@example.com
```

### Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Use the generated password as `EMAIL_PASS`

### Other Email Providers

- **Outlook/Hotmail**: Use `smtp-mail.outlook.com` on port 587
- **Yahoo**: Use `smtp.mail.yahoo.com` on port 587
- **Custom SMTP**: Use your provider's SMTP settings

## API Endpoints

### Create Admin User
```http
POST /api/admins
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@school.com",
  "role": "school_admin",
  "schoolId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "phone": "+1234567890"
}
```

**Response**: Admin created + password setup email sent

### Resend Password Setup Email
```http
POST /api/admins/resend-password-setup
Content-Type: application/json

{
  "email": "john.doe@school.com"
}
```

**Response**: Password setup email resent successfully

### Create Password Manually (Super Admin Only)
```http
POST /api/admins/create-password-manually
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{
  "adminId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "password": "newpassword123"
}
```

**Response**: Password created successfully for admin user

### Setup Password
```http
POST /api/admins/setup-password
Content-Type: application/json

{
  "token": "abc123...",
  "password": "newpassword123"
}
```

**Response**: Password set successfully

### Request Password Reset
```http
POST /api/admins/forgot-password
Content-Type: application/json

{
  "email": "john.doe@school.com"
}
```

**Response**: Password reset email sent (if account exists)

## User Flow

### New User Creation
1. Admin creates user account (no password required)
2. System generates secure token
3. Email sent with setup link
4. User clicks link → redirected to frontend
5. User sets password → account activated

### Password Reset
1. User requests password reset
2. System generates secure token
3. Email sent with reset link
4. User clicks link → redirected to frontend
5. User sets new password → account updated

## Frontend Integration

The frontend should handle the `/setup-password` route with these query parameters:

- `token`: The password setup/reset token
- `reset`: Boolean indicating if this is a password reset (optional)

### Example Frontend Route
```javascript
// React Router example
<Route 
  path="/setup-password" 
  element={<PasswordSetup />} 
/>

// Component to extract token from URL
const PasswordSetup = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const isReset = searchParams.get('reset') === 'true';
  
  // Handle password setup/reset
};
```

## Testing

### Test Email Service
```bash
npm run test-email
```

This will:
1. Test email connection
2. Send test password setup email
3. Send test password reset email

### Test with Real Data
1. Create an admin user via API
2. Check email inbox for setup link
3. Use the token to set password
4. Verify login works

## Security Features

- **Token Expiration**: Tokens automatically expire after configured time
- **Single Use**: Tokens are marked as used after first use
- **Secure Generation**: Uses Node.js crypto module for random tokens
- **TTL Index**: MongoDB automatically cleans up expired tokens
- **No Password Exposure**: Passwords are never stored in plain text
- **Atomic Operations**: Admin user is only created after email is successfully sent
- **Automatic Cleanup**: Failed operations automatically clean up any created resources

## Database Schema

### PasswordToken Model
```javascript
{
  userId: ObjectId,        // Reference to user
  userModel: String,       // 'AdminUser', 'Teacher', 'Student'
  token: String,           // Secure random token
  type: String,            // 'setup' or 'reset'
  expiresAt: Date,         // Expiration timestamp
  used: Boolean,           // Whether token has been used
  createdAt: Date          // Creation timestamp
}
```

### AdminUser Model Updates
- `password` field is now optional
- `passwordSetup` field indicates if password is configured

## Troubleshooting

### Email Not Sending
1. Check email configuration in `.env`
2. Verify SMTP credentials
3. Check firewall/network settings
4. Test with `npm run test-email`

### Token Not Working
1. Check if token has expired
2. Verify token hasn't been used
3. Check database for token validity
4. Ensure frontend URL matches `FRONTEND_PASSWORD_SETUP_URL`

### User Can't Login
1. Verify password was set up
2. Check `passwordSetup` field in database
3. Ensure password meets minimum requirements
4. Check if account is active

## Migration from Old System

If you have existing users with passwords:

1. Set `passwordSetup: true` for existing users
2. Keep existing password hashes
3. New users will use email-based setup
4. Existing users can still use their passwords

## Security Improvements

### **Robust Admin Creation**
The system now creates admin users regardless of email delivery status, with fallback options:

- **Admin Creation**: Admin user is always created in database
- **Email Attempt**: System tries to send email but doesn't fail if it can't
- **Fallback Options**: Users can use resend endpoint or super admin can create password manually
- **No Data Loss**: Admin accounts are never lost due to email issues

### **Automatic Cleanup**
If any step fails during admin creation:

1. **Email Failure**: Admin user and token are preserved (can use fallback methods)
2. **Database Errors**: All created resources are cleaned up
3. **Network Issues**: System rolls back to clean state
4. **Logging**: All cleanup actions are logged for audit purposes

### **Error Handling**
- **Email Delivery Failures**: Admin creation continues, fallback options available
- **Database Rollbacks**: Automatic cleanup of partial operations
- **User Feedback**: Informative messages about next steps

### **Fallback Options When Email Fails**
1. **Resend Email**: Use `/api/admins/resend-password-setup` endpoint
2. **Manual Password Creation**: Super admin can create password via `/api/admins/create-password-manually`
3. **Token Still Valid**: Original setup token remains usable until expiration

## Best Practices

1. **Environment Variables**: Never commit email credentials to version control
2. **Email Templates**: Customize email content for your organization
3. **Token Expiration**: Set reasonable expiration times (1-24 hours)
4. **Rate Limiting**: Implement rate limiting for password reset requests
5. **Logging**: Monitor email sending success/failure rates
6. **Backup**: Ensure email service has fallback options

## Support

For issues or questions:
1. Check the logs for error messages
2. Verify environment configuration
3. Test email service with `npm run test-email`
4. Check database for token status
5. Review API documentation and examples 