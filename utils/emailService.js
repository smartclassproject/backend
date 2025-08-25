const nodemailer = require("nodemailer");

/**
 * Email service utility for sending emails
 */
class EmailService {
  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize or reinitialize the email transporter
   */
  initializeTransporter() {
    // Use the same configuration that works in testConnection
    const config = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: { rejectUnauthorized: false }
    };

    // Log configuration for debugging
    console.log('Email service configuration:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.auth.user,
      timeout: config.connectionTimeout
    });

    try {
      this.transporter = nodemailer.createTransport(config);
      console.log('✅ Email transporter initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error.message);
      throw error;
    }
  }

  /**
   * Send password setup email with retry logic
   * @param {string} to - Recipient email
   * @param {string} token - Password setup token
   * @param {string} firstName - User's first name
   * @param {string} role - User's role
   * @param {Object} school - School information (optional)
   * @returns {Promise} - Email send result
   */
  async sendPasswordSetupEmail(to, token, firstName, role, school = null) {
    // Check if email service is properly configured
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email service not properly configured. Please check EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.');
    }
    const setupUrl = `${process.env.FRONTEND_PASSWORD_SETUP_URL}?token=${token}`;
    
    // School information section
    const schoolInfo = school ? `
      <div style="background: #f0f8ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">🏫 School Assignment</h3>
        <p style="color: #555; margin: 0; font-weight: bold;">${school.name}</p>
        ${school.location ? `<p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">📍 ${school.location}</p>` : ''}
      </div>
    ` : '';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: to,
      subject: 'Welcome to SmartClass - Set Up Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">SmartClass</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome to SmartClass!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Hello ${firstName},
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Your account has been created successfully as a <strong>${role.replace('_', ' ')}</strong> in the SmartClass system.
            </p>
            
            ${schoolInfo}
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              To complete your account setup, please click the button below to set up your password:
            </p>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${setupUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        display: inline-block; 
                        font-weight: bold;">
                Set Up Password
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-bottom: 20px;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            
            <p style="color: #667eea; font-size: 14px; word-break: break-all;">
              ${setupUrl}
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This link will expire in ${process.env.PASSWORD_RESET_EXPIRES_IN || '1 hour'}.<br>
                If you didn't request this email, please ignore it.
              </p>
            </div>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center;">
            <p style="color: #999; margin: 0; font-size: 12px;">
              © 2024 SmartClass. All rights reserved.
            </p>
          </div>
        </div>
      `,
      text: `
        Welcome to SmartClass!
        
        Hello ${firstName},
        
        Your account has been created successfully as a ${role.replace('_', ' ')} in the SmartClass system.
        
        ${school ? `School Assignment: ${school.name}${school.location ? ` (${school.location})` : ''}` : ''}
        
        To complete your account setup, please visit the following link to set up your password:
        
        ${setupUrl}
        
        This link will expire in ${process.env.PASSWORD_RESET_EXPIRES_IN || '1 hour'}.
        
        If you didn't request this email, please ignore it.
        
        Best regards,
        The SmartClass Team
      `
    };

    return await this.sendEmailWithRetry(mailOptions, 'password setup');
  }

  /**
   * Send password reset email
   * @param {string} to - Recipient email
   * @param {string} token - Password reset token
   * @param {string} firstName - User's first name
   * @returns {Promise} - Email send result
   */
  async sendPasswordResetEmail(to, token, firstName) {
    // Check if email service is properly configured
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email service not properly configured. Please check EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.');
    }
    const resetUrl = `${process.env.FRONTEND_PASSWORD_SETUP_URL}?token=${token}&reset=true`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: to,
      subject: 'SmartClass - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">SmartClass</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Hello ${firstName},
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        display: inline-block; 
                        font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-bottom: 20px;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            
            <p style="color: #667eea; font-size: 14px; word-break: break-all;">
              ${resetUrl}
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This link will expire in ${process.env.PASSWORD_RESET_EXPIRES_IN || '1 hour'}.<br>
                If you didn't request this password reset, please ignore this email.
              </p>
            </div>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center;">
            <p style="color: #999; margin: 0; font-size: 12px;">
              © 2024 SmartClass. All rights reserved.
            </p>
          </div>
        </div>
      `,
      text: `
        Password Reset Request
        
        Hello ${firstName},
        
        We received a request to reset your password. Please visit the following link to create a new password:
        
        ${resetUrl}
        
        This link will expire in ${process.env.PASSWORD_RESET_EXPIRES_IN || '1 hour'}.
        
        If you didn't request this password reset, please ignore this email.
        
        Best regards,
        The SmartClass Team
      `
    };

    return await this.sendEmailWithRetry(mailOptions, 'password reset');
  }

  /**
   * Test email service connection with multiple configurations
   * @returns {Promise<boolean>} - Connection test result
   */
  async testConnection() {
    console.log('🧪 Testing email service connection...');
    
    // First try the current configuration
    try {
      if (this.transporter && typeof this.transporter.verify === 'function') {
        await this.transporter.verify();
        console.log('✅ Current email configuration works!');
        return true;
      }
    } catch (error) {
      console.log(`❌ Current configuration failed: ${error.message}`);
    }
    const configs = [
      // Config 1: Standard Gmail with TLS
      {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: { rejectUnauthorized: false }
      },
      // Config 2: Gmail with SSL
      {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: { rejectUnauthorized: false }
      },
      // Config 3: Gmail with different TLS settings
      {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: { 
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        }
      }
    ];

    for (let i = 0; i < configs.length; i++) {
      try {
        console.log(`Testing configuration ${i + 1}: ${configs[i].host}:${configs[i].port} (${configs[i].secure ? 'SSL' : 'TLS'})`);
        
        const testTransporter = nodemailer.createTransport(configs[i]);
        await testTransporter.verify();
        
        console.log(`✅ Configuration ${i + 1} works! Using this configuration.`);
        
        // Update the main transporter with the working config
        this.transporter = testTransporter;
        
        return true;
      } catch (error) {
        console.log(`❌ Configuration ${i + 1} failed: ${error.message}`);
        continue;
      }
    }
    
    console.error('❌ All email configurations failed');
    return false;
  }

  /**
   * Send email with retry logic and exponential backoff
   * @param {Object} mailOptions - Email options
   * @param {string} emailType - Type of email for logging
   * @returns {Promise} - Email send result
   */
  async sendEmailWithRetry(mailOptions, emailType) {
    const maxRetries = parseInt(process.env.EMAIL_MAX_RETRIES) || 3;
    const baseDelay = parseInt(process.env.EMAIL_RETRY_DELAY_MS) || 2000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📧 Attempt ${attempt}/${maxRetries} to send ${emailType} email to ${mailOptions.to}`);
        
        // Ensure transporter is properly initialized before each attempt
        if (!this.transporter || typeof this.transporter.sendMail !== 'function') {
          console.log('🔄 Reinitializing email transporter...');
          this.initializeTransporter();
        }
        
        const result = await this.transporter.sendMail(mailOptions);
        console.log(`✅ ${emailType} email sent successfully on attempt ${attempt}:`, result.messageId);
        return result;
        
      } catch (error) {
        console.error(`❌ Attempt ${attempt}/${maxRetries} failed for ${emailType} email:`, error.message);
        
        if (attempt === maxRetries) {
          console.error(`💥 All ${maxRetries} attempts failed for ${emailType} email`);
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry ${attempt + 1}...`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Try to refresh connection for next attempt, but don't fail if it doesn't work
        try {
          if (this.transporter && typeof this.transporter.verify === 'function') {
            await this.transporter.verify();
            console.log('🔄 Connection verified successfully');
          }
        } catch (verifyError) {
          console.log(`🔄 Connection verification failed, will retry anyway: ${verifyError.message}`);
          // Try to reinitialize the transporter if verification fails
          try {
            console.log('🔄 Attempting to reinitialize transporter...');
            this.initializeTransporter();
          } catch (reinitError) {
            console.log(`🔄 Transporter reinitialization failed: ${reinitError.message}`);
          }
        }
      }
    }
  }
}

module.exports = new EmailService(); 