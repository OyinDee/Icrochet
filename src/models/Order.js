const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item ID is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [100, 'Quantity cannot exceed 100']
  },
  selectedColor: {
    type: String,
    trim: true,
    maxlength: [50, 'Selected color name cannot exceed 50 characters']
  },
  unitPrice: {
    type: Number,
    min: [0, 'Unit price cannot be negative']
  },
  subtotal: {
    type: Number,
    min: [0, 'Subtotal cannot be negative']
  },
  customRequirements: {
    type: String,
    trim: true,
    maxlength: [1000, 'Custom requirements cannot exceed 1000 characters']
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    minlength: [2, 'Customer name must be at least 2 characters long'],
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'],
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please provide a valid email address'
    }
  },
  customerPhone: {
    type: String,
    trim: true,
    validate: {
      validator: function(phone) {
        return !phone || /^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Please provide a valid phone number'
    }
  },
  shippingAddress: {
    type: String,
    required: [true, 'Shipping address is required'],
    trim: true,
    minlength: [10, 'Shipping address must be at least 10 characters long'],
    maxlength: [500, 'Shipping address cannot exceed 500 characters']
  },
  items: {
    type: [orderItemSchema],
    required: [true, 'Order must contain at least one item'],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Order must contain at least one item'
    }
  },
  totalAmount: {
    type: Number,
    min: [0, 'Total amount cannot be negative']
  },
  estimatedAmount: {
    type: Number,
    min: [0, 'Estimated amount cannot be negative']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'quote_needed', 'quoted', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      message: 'Invalid order status'
    },
    default: 'pending'
  },
  hasCustomItems: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
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
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update the updatedAt field before updating
orderSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// Virtual for order total calculation
orderSchema.virtual('calculatedTotal').get(function() {
  if (!this.items || this.items.length === 0) return 0;
  return this.items.reduce((total, item) => total + (item.subtotal || 0), 0);
});

// Virtual for item count
orderSchema.virtual('itemCount').get(function() {
  if (!this.items || this.items.length === 0) return 0;
  return this.items.reduce((count, item) => count + item.quantity, 0);
});

// Virtual for status display
orderSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    pending: 'Pending',
    quote_needed: 'Quote Needed',
    quoted: 'Quoted',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };
  return statusMap[this.status] || this.status;
});

// Ensure virtual fields are serialized
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

// Indexes for faster queries
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ hasCustomItems: 1 });
orderSchema.index({ 'items.itemId': 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;