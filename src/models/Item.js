const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    minlength: [2, 'Item name must be at least 2 characters long'],
    maxlength: [200, 'Item name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Item description cannot exceed 2000 characters']
  },
  pricingType: {
    type: String,
    enum: {
      values: ['fixed', 'range', 'custom'],
      message: 'Pricing type must be either fixed, range, or custom'
    },
    required: [true, 'Pricing type is required']
  },
  price: {
    fixed: {
      type: Number,
      min: [0, 'Fixed price cannot be negative'],
      validate: {
        validator: function(value) {
          return this.pricingType !== 'fixed' || (value != null && value > 0);
        },
        message: 'Fixed price is required when pricing type is fixed'
      }
    },
    min: {
      type: Number,
      min: [0, 'Minimum price cannot be negative'],
      validate: {
        validator: function(value) {
          return this.pricingType !== 'range' || (value != null && value >= 0);
        },
        message: 'Minimum price is required when pricing type is range'
      }
    },
    max: {
      type: Number,
      min: [0, 'Maximum price cannot be negative'],
      validate: {
        validator: function(value) {
          return this.pricingType !== 'range' || (value != null && value > 0 && value >= this.price.min);
        },
        message: 'Maximum price must be greater than minimum price when pricing type is range'
      }
    }
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  imageUrls: [{
    type: String,
    validate: {
      validator: function(url) {
        // Basic URL validation
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Invalid image URL format'
    }
  }],
  availableColors: [{
    type: String,
    trim: true,
    minlength: [2, 'Color name must be at least 2 characters long'],
    maxlength: [50, 'Color name cannot exceed 50 characters']
  }],
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
itemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update the updatedAt field before updating
itemSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// Virtual for formatted price display
itemSchema.virtual('priceDisplay').get(function() {
  switch (this.pricingType) {
    case 'fixed':
      return `$${this.price.fixed?.toFixed(2) || '0.00'}`;
    case 'range':
      return `$${this.price.min?.toFixed(2) || '0.00'} - $${this.price.max?.toFixed(2) || '0.00'}`;
    case 'custom':
      return 'Custom pricing - contact for quote';
    default:
      return 'Price not set';
  }
});

// Ensure virtual fields are serialized
itemSchema.set('toJSON', { virtuals: true });
itemSchema.set('toObject', { virtuals: true });

// Indexes for faster queries
itemSchema.index({ name: 1 });
itemSchema.index({ categoryId: 1 });
itemSchema.index({ isAvailable: 1 });
itemSchema.index({ pricingType: 1 });
itemSchema.index({ createdAt: -1 });
itemSchema.index({ name: 'text', description: 'text' }); // Text search index

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;