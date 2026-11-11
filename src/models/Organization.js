const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    defaultLowStockThreshold: {
      type: Number,
      required: true,
      default: 5,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'defaultLowStockThreshold must be an integer',
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Organization', organizationSchema);