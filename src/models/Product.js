const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 64,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'quantity must be an integer',
      },
    },
    costPrice: {
      type: Number,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      min: 0,
      validate: {
        validator: (value) => value == null || Number.isInteger(value),
        message: 'lowStockThreshold must be an integer',
      },
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ organizationId: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);