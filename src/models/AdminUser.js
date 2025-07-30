const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [50, 'Username cannot exceed 50 characters'],
    validate: {
      validator: function(username) {
        return /^[a-zA-Z0-9_]+$/.test(username);
      },
      message: 'Username can only contain letters, numbers, and underscores'
    }
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please provide a valid email address'
    }
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
adminUserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update the updatedAt field before updating
adminUserSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// Virtual for full name
adminUserSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || this.username;
});

// Method to hash password
adminUserSchema.methods.hashPassword = async function(password) {
  const saltRounds = 12;
  this.passwordHash = await bcrypt.hash(password, saltRounds);
};

// Method to verify password
adminUserSchema.methods.verifyPassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

// Method to update last login
adminUserSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

// Static method to find by username or email
adminUserSchema.statics.findByUsernameOrEmail = function(identifier) {
  return this.findOne({
    $or: [
      { username: identifier },
      { email: identifier.toLowerCase() }
    ],
    isActive: true
  });
};

// Static method to create admin user with hashed password
adminUserSchema.statics.createWithPassword = async function(userData, password) {
  const user = new this(userData);
  await user.hashPassword(password);
  return await user.save();
};

// Ensure virtual fields are serialized
adminUserSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.passwordHash; // Never include password hash in JSON output
    return ret;
  }
});
adminUserSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.passwordHash; // Never include password hash in object output
    return ret;
  }
});

// Indexes for faster queries
adminUserSchema.index({ isActive: 1 });
adminUserSchema.index({ createdAt: -1 });

const AdminUser = mongoose.model('AdminUser', adminUserSchema);

module.exports = AdminUser;