const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: {
      values: ['admin', 'customer'],
      message: 'Sender must be either admin or customer'
    },
    required: [true, 'Message sender is required']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    minlength: [1, 'Message content cannot be empty'],
    maxlength: [2000, 'Message content cannot exceed 2000 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isQuote: {
    type: Boolean,
    default: false
  },
  quoteAmount: {
    type: Number,
    min: [0, 'Quote amount cannot be negative'],
    validate: {
      validator: function(value) {
        return !this.isQuote || (value != null && value > 0);
      },
      message: 'Quote amount is required when message is a quote'
    }
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const conversationSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
    unique: true
  },
  messages: {
    type: [messageSchema],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'],
    trim: true,
    lowercase: true
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
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

// Update timestamps when messages are added
conversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.messages && this.messages.length > 0) {
    this.lastMessageAt = this.messages[this.messages.length - 1].timestamp;
  }
  next();
});

// Update the updatedAt field before updating
conversationSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// Virtual for unread message count by admin
conversationSchema.virtual('unreadByAdmin').get(function() {
  if (!this.messages || this.messages.length === 0) return 0;
  return this.messages.filter(msg => msg.sender === 'customer' && !msg.isRead).length;
});

// Virtual for unread message count by customer
conversationSchema.virtual('unreadByCustomer').get(function() {
  if (!this.messages || this.messages.length === 0) return 0;
  return this.messages.filter(msg => msg.sender === 'admin' && !msg.isRead).length;
});

// Virtual for last message
conversationSchema.virtual('lastMessage').get(function() {
  if (!this.messages || this.messages.length === 0) return null;
  return this.messages[this.messages.length - 1];
});

// Virtual for message count
conversationSchema.virtual('messageCount').get(function() {
  return this.messages ? this.messages.length : 0;
});

// Method to add a message
conversationSchema.methods.addMessage = function(sender, content, isQuote = false, quoteAmount = null) {
  const message = {
    sender,
    content,
    isQuote,
    quoteAmount: isQuote ? quoteAmount : null,
    timestamp: new Date()
  };
  
  this.messages.push(message);
  this.lastMessageAt = message.timestamp;
  this.updatedAt = new Date();
  
  return message;
};

// Method to mark messages as read
conversationSchema.methods.markMessagesAsRead = function(sender) {
  const otherSender = sender === 'admin' ? 'customer' : 'admin';
  this.messages.forEach(msg => {
    if (msg.sender === otherSender) {
      msg.isRead = true;
    }
  });
  this.updatedAt = new Date();
};

// Ensure virtual fields are serialized
conversationSchema.set('toJSON', { virtuals: true });
conversationSchema.set('toObject', { virtuals: true });

// Indexes for faster queries
conversationSchema.index({ customerEmail: 1 });
conversationSchema.index({ isActive: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ createdAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;