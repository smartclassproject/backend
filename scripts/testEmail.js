require('dotenv').config();
const emailService = require('../utils/emailService');

async function testEmailService() {
  console.log('Testing email service...');
  
  try {
    // Test connection
    console.log('Testing email connection...');
    const connectionOk = await emailService.testConnection();
    
    if (!connectionOk) {
      console.error('❌ Email service connection failed');
      console.log('Please check your email configuration in .env file:');
      console.log('- EMAIL_HOST');
      console.log('- EMAIL_PORT');
      console.log('- EMAIL_USER');
      console.log('- EMAIL_PASS');
      return;
    }
    
    console.log('✅ Email service connection successful');
    
    // Test sending a password setup email
    console.log('\nTesting password setup email...');
    const testToken = 'sfki veuf qyxa cmrp';
    const testEmail = process.env.TEST_EMAIL || 'eumuhoza83@gmail.com';
    
    // Test with school information
    const testSchool = {
      name: 'Springfield High School',
      location: 'Springfield, IL'
    };
    
    await emailService.sendPasswordSetupEmail(
      testEmail,
      testToken,
      'Emuhoza',
      'school_admin',
      testSchool
    );
    
    console.log('✅ Password setup email sent successfully');
    
    // Test sending a password reset email
    console.log('\nTesting password reset email...');
    await emailService.sendPasswordResetEmail(
      testEmail,
      testToken,
      'John'
    );
    
    console.log('✅ Password reset email sent successfully');
    
    console.log('\n🎉 All email tests passed!');
    console.log('\nNote: Check your email inbox (and spam folder) to verify the emails were received.');
    console.log('\nTo test the complete flow:');
    console.log('1. Use the token from the email to call POST /api/auth/setup-password');
    console.log('2. You should receive a JWT token and user data in response');
    console.log('3. Use that JWT token for authenticated requests');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check your .env file has correct email settings');
    console.log('2. For Gmail, make sure you have 2FA enabled and are using an App Password');
    console.log('3. Check if your email provider allows SMTP access');
    console.log('4. Verify the email credentials are correct');
  }
}

// Run the test
testEmailService(); 