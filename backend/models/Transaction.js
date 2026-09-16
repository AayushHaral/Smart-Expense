const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['income', 'expense'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    subcategory: {
        type: String,
        default: null,
        trim: true
    },
    payment_method: {
        type: String,
        required: true,
        default: 'Other'
    },
    description: {
        type: String,
        default: ''
    },
    transaction_date: {
        type: String, // YYYY-MM-DD
        required: true,
        index: true
    },
    receipt_url: {
        type: String,
        default: null
    },
    is_recurring: {
        type: Boolean,
        default: false
    },
    recurring_frequency: {
        type: String,
        default: null
    },
    parent_transaction_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        default: null
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

transactionSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

transactionSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toHexString();
        delete ret.__v;
        return ret;
    }
});

transactionSchema.set('toObject', { virtuals: true });

transactionSchema.index({ user_id: 1, transaction_date: -1 });
transactionSchema.index({ user_id: 1, type: 1 });
transactionSchema.index({ user_id: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
