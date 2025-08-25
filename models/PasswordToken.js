const mongoose = require('mongoose');

const passwordTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userModel'
  },
  userModel: {
    type: String,
    required: true,
    enum: ['AdminUser', 'Teacher', 'Student']
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: ['setup', 'reset'],
    default: 'setup'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index to automatically delete expired tokens
  },
  used: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for efficient queries
passwordTokenSchema.index({ userId: 1, type: 1, used: 1 });

// Method to check if token is expired
passwordTokenSchema.methods.isExpired = function() {
  return Date.now() > this.expiresAt.getTime();
};

// Method to mark token as used
passwordTokenSchema.methods.markAsUsed = function() {
  this.used = true;
  return this.save();
};

// Static method to create a new token
passwordTokenSchema.statics.createToken = async function(userId, userModel, type = 'setup') {
  // Generate a secure random token
  const token = require('crypto').randomBytes(32).toString('hex');
  
  // Set expiration time (default 1 hour)
  const expiresIn = process.env.PASSWORD_RESET_EXPIRES_IN || '1h';
  const expiresAt = new Date();
  
  if (expiresIn.includes('h')) {
    expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));
  } else if (expiresIn.includes('m')) {
    expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(expiresIn));
  } else {
    expiresAt.setHours(expiresAt.getHours() + 1); // Default 1 hour
  }
  
  // Create the token document
  const passwordToken = new this({
    userId,
    userModel,
    token,
    type,
    expiresAt
  });
  
  return await passwordToken.save();
};

// Static method to find and validate a token
passwordTokenSchema.statics.findAndValidateToken = async function(token, type = 'setup') {
  const passwordToken = await this.findOne({ 
    token, 
    type, 
    used: false 
  }).populate('userId');
  
  if (!passwordToken) {
    return null;
  }
  
  if (passwordToken.isExpired()) {
    // Mark as used to prevent reuse
    await passwordToken.markAsUsed();
    return null;
  }
  
  return passwordToken;
};

module.exports = mongoose.model('PasswordToken', passwordTokenSchema); 