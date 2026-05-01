const nodemailer = require("nodemailer");
const fs = require('fs');
const path = require('path');
const BRAND_NAME = 'RiseMe';
const BRAND_LOGO_URL = process.env.BRAND_LOGO_URL || '';
const BRAND_LOGO_CID = 'riseme-brand-logo';
const BRAND_BLUE = '#1E73BE';
const BRAND_GREEN = '#4CAF50';
const BRAND_YELLOW = '#F4C430';
const BRAND_LOGO_PATH = process.env.BRAND_LOGO_PATH
  ? path.resolve(process.cwd(), process.env.BRAND_LOGO_PATH)
  : path.resolve(process.cwd(), 'assets/logo.png');

const hasLocalBrandLogo = () => {
  try {
    return fs.existsSync(BRAND_LOGO_PATH);
  } catch {
    return false;
  }
};

const getBrandLogoSrc = () => {
  if (hasLocalBrandLogo()) return `cid:${BRAND_LOGO_CID}`;
  if (BRAND_LOGO_URL) return BRAND_LOGO_URL;
  return '';
};

const getBrandLogoAttachment = () =>
  hasLocalBrandLogo()
    ? [{
        filename: path.basename(BRAND_LOGO_PATH),
        path: BRAND_LOGO_PATH,
        cid: BRAND_LOGO_CID
      }]
    : [];

const brandHeaderHtml = () => `
  <div style="background: #ffffff; padding: 24px 16px 18px; text-align: center; border-bottom: 1px solid #e5e7eb;">
    ${getBrandLogoSrc() ? `<img src="${getBrandLogoSrc()}" alt="${BRAND_NAME} logo" style="height: 55px; display: inline-block;" />` : `<h1 style="color: #111827; margin: 0; font-size: 28px; line-height: 1.2; font-weight: 700;">${BRAND_NAME}</h1>`}
  </div>
`;

const emailShellHtml = ({ title, intro, body, ctaLabel, ctaUrl, helpText, footerNote }) => `
  <div style="margin: 0; padding: 24px 12px; background: #f3f6fb; font-family: Arial, Helvetica, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;">
      ${brandHeaderHtml()}

      <div style="padding: 28px 24px;">
        <h2 style="margin: 0 0 12px 0; color: #111827; font-size: 24px; font-weight: 700;">${title}</h2>
        ${intro ? `<p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.65;">${intro}</p>` : ''}
        ${body}

        ${ctaUrl ? `
          <div style="margin: 26px 0 20px; text-align: center;">
            <a href="${ctaUrl}" style="display: inline-block; padding: 12px 24px; border-radius: 8px; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; background: ${BRAND_BLUE};">
              ${ctaLabel}
            </a>
          </div>
        ` : ''}

        ${ctaUrl ? `
          <div style="margin: 0 0 20px;">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">If the button does not work, copy this link:</p>
            <p style="margin: 0; color: ${BRAND_BLUE}; font-size: 12px; line-height: 1.55; word-break: break-all;">${ctaUrl}</p>
          </div>
        ` : ''}

        ${helpText ? `
          <div style="margin-top: 18px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.55;">${helpText}</p>
          </div>
        ` : ''}
      </div>

      <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 14px 20px; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">${footerNote || `© 2026 ${BRAND_NAME}. All rights reserved.`}</p>
      </div>
    </div>
  </div>
`;

const infoCardHtml = (content) => `
  <div style="background: #f8fbff; border: 1px solid #dbeafe; border-radius: 10px; padding: 14px 14px; margin: 16px 0;">
    ${content}
  </div>
`;

const warningCardHtml = (content) => `
  <div style="background: #fff8e8; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 14px; margin: 16px 0;">
    <p style="margin: 0; color: #6b4f00; font-size: 13px; line-height: 1.55;">${content}</p>
  </div>
`;

/**
 * Email service utility for sending emails
 */
class EmailService {
  constructor() {
    this.transportConfigs = this.buildTransportConfigs();
    this.transportConfigIndex = 0;
    this.initializeTransporter();
  }

  buildTransportConfigs() {
    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const envPort = Number(process.env.EMAIL_PORT || 587);
    const baseTimeout = Number(process.env.EMAIL_TIMEOUT_MS || 30000);

    const common = {
      host,
      auth: { user, pass },
      connectionTimeout: baseTimeout,
      greetingTimeout: Math.min(baseTimeout, 20000),
      socketTimeout: Math.max(baseTimeout, 30000),
      tls: { rejectUnauthorized: false },
    };

    // Try configured port first, then Gmail fallbacks (587/465) to recover from provider/network quirks.
    const orderedPorts = Array.from(new Set([envPort, 587, 465]));
    return orderedPorts.map((port) => ({
      ...common,
      port,
      secure: port === 465,
    }));
  }

  /**
   * Initialize or reinitialize the email transporter
   */
  initializeTransporter(config = null) {
    const selectedConfig = config || this.transportConfigs[this.transportConfigIndex] || this.buildTransportConfigs()[0];

    // Log configuration for debugging
    console.log('Email service configuration:', {
      host: selectedConfig.host,
      port: selectedConfig.port,
      secure: selectedConfig.secure,
      user: selectedConfig.auth.user,
      timeout: selectedConfig.connectionTimeout
    });

    try {
      this.transporter = nodemailer.createTransport(selectedConfig);
      console.log('✅ Email transporter initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error.message);
      throw error;
    }
  }

  rotateTransportConfig() {
    if (!this.transportConfigs.length) {
      this.transportConfigs = this.buildTransportConfigs();
    }
    this.transportConfigIndex = (this.transportConfigIndex + 1) % this.transportConfigs.length;
    this.initializeTransporter(this.transportConfigs[this.transportConfigIndex]);
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
    const schoolInfo = school ? infoCardHtml(`
      <p style="margin: 0 0 8px 0; color: #1f2937; font-weight: 700; font-size: 14px;">School Assignment</p>
      <p style="margin: 0; color: #374151; font-size: 14px;"><strong>${school.name}</strong></p>
      ${school.location ? `<p style="margin: 6px 0 0 0; color: #6b7280; font-size: 13px;">${school.location}</p>` : ''}
    `) : '';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: to,
      attachments: getBrandLogoAttachment(),
      subject: `Welcome to ${BRAND_NAME} - Set Up Your Password`,
      html: emailShellHtml({
        title: `Welcome to ${BRAND_NAME}!`,
        intro: `Hello ${firstName},`,
        body: `
          <p style="margin: 0 0 14px 0; color: #374151; font-size: 15px; line-height: 1.65;">
            Your account has been created successfully as a <strong>${role.replace('_', ' ')}</strong> in the ${BRAND_NAME} system.
          </p>
          ${schoolInfo}
          <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.65;">
            To complete your account setup, please set your password.
          </p>
        `,
        ctaLabel: 'Set Up Password',
        ctaUrl: setupUrl,
        helpText: `This link expires in ${process.env.PASSWORD_RESET_EXPIRES_IN || '1 hour'}. If you did not request this email, please ignore it.`,
      }),
      text: `
        Welcome to ${BRAND_NAME}!
        
        Hello ${firstName},
        
        Your account has been created successfully as a ${role.replace('_', ' ')} in the ${BRAND_NAME} system.
        
        ${school ? `School Assignment: ${school.name}${school.location ? ` (${school.location})` : ''}` : ''}
        
        To complete your account setup, please visit the following link to set up your password:
        
        ${setupUrl}
        
        This link will expire in ${process.env.PASSWORD_RESET_EXPIRES_IN || '1 hour'}.
        
        If you didn't request this email, please ignore it.
        
        Best regards,
        The ${BRAND_NAME} Team
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
      attachments: getBrandLogoAttachment(),
      subject: `${BRAND_NAME} - Password Reset Request`,
      html: emailShellHtml({
        title: 'Password Reset Request',
        intro: `Hello ${firstName},`,
        body: `
          <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.65;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>
        `,
        ctaLabel: 'Reset Password',
        ctaUrl: resetUrl,
        helpText: `This link expires in ${process.env.PASSWORD_RESET_EXPIRES_IN || '1 hour'}. If you did not request this password reset, please ignore this email.`,
      }),
      text: `
        Password Reset Request
        
        Hello ${firstName},
        
        We received a request to reset your password. Please visit the following link to create a new password:
        
        ${resetUrl}
        
        This link will expire in ${process.env.PASSWORD_RESET_EXPIRES_IN || '1 hour'}.
        
        If you didn't request this password reset, please ignore this email.
        
        Best regards,
        The ${BRAND_NAME} Team
      `
    };

    return await this.sendEmailWithRetry(mailOptions, 'password reset');
  }

  /**
   * Send teacher login credentials email
   * @param {string} to - Recipient email
   * @param {string} email - Login email
   * @param {string} defaultPassword - Default password for first login
   * @param {string} teacherName - Teacher's name
   * @param {Object} school - School information (optional)
   * @returns {Promise} - Email send result
   */
  async sendTeacherCredentialsEmail(to, email, defaultPassword, teacherName, school = null) {
    // Check if email service is properly configured
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email service not properly configured. Please check EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.');
    }

    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // School information section
    const schoolInfo = school ? infoCardHtml(`
      <p style="margin: 0 0 8px 0; color: #1f2937; font-weight: 700; font-size: 14px;">School Assignment</p>
      <p style="margin: 0; color: #374151; font-size: 14px;"><strong>${school.name}</strong></p>
      ${school.location ? `<p style="margin: 6px 0 0 0; color: #6b7280; font-size: 13px;">${school.location}</p>` : ''}
    `) : '';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: to,
      attachments: getBrandLogoAttachment(),
      subject: `Welcome to ${BRAND_NAME} - Your Login Credentials`,
      html: emailShellHtml({
        title: `Welcome to ${BRAND_NAME}!`,
        intro: `Hello ${teacherName},`,
        body: `
          <p style="margin: 0 0 14px 0; color: #374151; font-size: 15px; line-height: 1.65;">
            Your teacher account has been created successfully in the ${BRAND_NAME} system.
          </p>
          ${schoolInfo}
          ${infoCardHtml(`
            <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 700;">Your Login Credentials</p>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">Email</p>
            <p style="margin: 0 0 10px 0; color: #111827; font-size: 14px; font-family: monospace; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px;">${email}</p>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">Default Password</p>
            <p style="margin: 0; color: #111827; font-size: 14px; font-family: monospace; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px;">${defaultPassword}</p>
          `)}
          ${warningCardHtml(`<strong>Important:</strong> You will be required to change this password on your first login for security purposes.`)}
          <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.65;">
            Use the portal link below to sign in with these credentials.
          </p>
        `,
        ctaLabel: `Login to ${BRAND_NAME}`,
        ctaUrl: `${loginUrl}/login`,
        helpText: 'Please keep your login credentials secure and do not share them with anyone. If you need help, contact your school administrator.',
      }),
      text: `
        Welcome to ${BRAND_NAME}!
        
        Hello ${teacherName},
        
        Your teacher account has been created successfully in the ${BRAND_NAME} system.
        
        ${school ? `School Assignment: ${school.name}${school.location ? ` (${school.location})` : ''}` : ''}
        
        Your Login Credentials:
        Email: ${email}
        Default Password: ${defaultPassword}
        
        Important: You will be required to change this password on your first login for security purposes.
        
        To access your account, please visit: ${loginUrl}/login
        
        Please keep your login credentials secure and do not share them with anyone.
        If you have any questions, please contact your school administrator.
        
        Best regards,
        The ${BRAND_NAME} Team
      `
    };

    return await this.sendEmailWithRetry(mailOptions, 'teacher credentials');
  }

  /**
   * Send school staff login credentials email
   * @param {string} to - Recipient email
   * @param {string} email - Login email
   * @param {string} defaultPassword - Temporary password
   * @param {string} staffName - Staff name
   * @param {string} staffRole - Staff role label
   * @param {Object} school - School information (optional)
   * @returns {Promise} - Email send result
   */
  async sendStaffCredentialsEmail(to, email, defaultPassword, staffName, staffRole, school = null) {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email service not properly configured. Please check EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.');
    }

    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const schoolInfo = school ? infoCardHtml(`
      <p style="margin: 0 0 8px 0; color: #1f2937; font-weight: 700; font-size: 14px;">School Assignment</p>
      <p style="margin: 0; color: #374151; font-size: 14px;"><strong>${school.name}</strong></p>
      ${school.location ? `<p style="margin: 6px 0 0 0; color: #6b7280; font-size: 13px;">${school.location}</p>` : ''}
    `) : '';

    const roleLabel = String(staffRole || 'Staff').replaceAll('_', ' ');

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      attachments: getBrandLogoAttachment(),
      subject: `Welcome to ${BRAND_NAME} - Your Login Credentials`,
      html: emailShellHtml({
        title: `Welcome to ${BRAND_NAME}!`,
        intro: `Hello ${staffName},`,
        body: `
          <p style="margin: 0 0 14px 0; color: #374151; font-size: 15px; line-height: 1.65;">
            Your ${roleLabel.toLowerCase()} account has been created successfully in the ${BRAND_NAME} system.
          </p>
          ${schoolInfo}
          ${infoCardHtml(`
            <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 700;">Your Login Credentials</p>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">Email</p>
            <p style="margin: 0 0 10px 0; color: #111827; font-size: 14px; font-family: monospace; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px;">${email}</p>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">Temporary Password</p>
            <p style="margin: 0; color: #111827; font-size: 14px; font-family: monospace; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px;">${defaultPassword}</p>
          `)}
          ${warningCardHtml('<strong>Important:</strong> Please change this password after your first login for account security.')}
          <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.65;">
            Use the portal link below to sign in with these credentials.
          </p>
        `,
        ctaLabel: `Login to ${BRAND_NAME}`,
        ctaUrl: `${loginUrl}/login`,
        helpText: 'Please keep your login credentials secure and do not share them. Contact your school administrator for support.',
      }),
      text: `
        Welcome to ${BRAND_NAME}!

        Hello ${staffName},

        Your ${roleLabel.toLowerCase()} account has been created successfully in the ${BRAND_NAME} system.

        ${school ? `School Assignment: ${school.name}${school.location ? ` (${school.location})` : ''}` : ''}

        Your Login Credentials:
        Email: ${email}
        Temporary Password: ${defaultPassword}

        Important: Please change this password after your first login.

        To access your account, visit: ${loginUrl}/login

        Best regards,
        The ${BRAND_NAME} Team
      `
    };

    return await this.sendEmailWithRetry(mailOptions, 'staff credentials');
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
    const configs = this.transportConfigs.length ? this.transportConfigs : this.buildTransportConfigs();

    for (let i = 0; i < configs.length; i++) {
      try {
        console.log(`Testing configuration ${i + 1}: ${configs[i].host}:${configs[i].port} (${configs[i].secure ? 'SSL' : 'TLS'})`);
        
        const testTransporter = nodemailer.createTransport(configs[i]);
        await testTransporter.verify();
        
        console.log(`✅ Configuration ${i + 1} works! Using this configuration.`);
        
        // Update the main transporter with the working config
        this.transportConfigIndex = i;
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
            console.log('🔄 Attempting to rotate/reinitialize transporter...');
            this.rotateTransportConfig();
          } catch (reinitError) {
            console.log(`🔄 Transporter reinitialization failed: ${reinitError.message}`);
          }
        }
      }
    }
  }
}

module.exports = new EmailService(); 