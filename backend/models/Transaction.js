const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    /**
     * amount convention:
     *   positive (+) = money in  (income / credit)
     *   negative (-) = money out (expense / debit)
     */
    amount: {
      type: Number,
      required: true,
    },
    balance: {
      type: Number,
      default: null,
    },
    category: {
      type: String,
      default: 'Other',
      enum: [
        'Groceries',
        'Eating Out',
        'Transport',
        'Entertainment',
        'Shopping',
        'Education',
        'Bills & Utilities',
        'Healthcare',
        'Personal Care',
        'Other',
      ],
    },
    merchant: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for fast per-user sorted queries
transactionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
