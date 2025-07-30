const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters long'],
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Category description cannot exceed 500 characters']
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
categorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update the updatedAt field before updating
categorySchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// Virtual for item count (will be populated when needed)
categorySchema.virtual('itemCount', {
  ref: 'Item',
  localField: '_id',
  foreignField: 'categoryId',
  count: true
});

// Ensure virtual fields are serialized
categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

// Index for faster queries
categorySchema.index({ createdAt: -1 });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;