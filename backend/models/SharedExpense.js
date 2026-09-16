const mongoose = require('mongoose');

const sharedExpenseSchema = new mongoose.Schema({
    room_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true,
        default: 'Other'
    },
    description: {
        type: String,
        default: ''
    },
    expense_date: {
        type: String, // YYYY-MM-DD
        required: true,
        index: true
    },
    paid_by_user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    split_method: {
        type: String,
        enum: ['equal', 'custom', 'percentage', 'shares'],
        default: 'equal'
    },
    receipt_url: {
        type: String,
        default: null
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

sharedExpenseSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

sharedExpenseSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toHexString();
        delete ret.__v;
        return ret;
    }
});

sharedExpenseSchema.set('toObject', { virtuals: true });

sharedExpenseSchema.index({ room_id: 1, expense_date: -1 });

module.exports = mongoose.model('SharedExpense', sharedExpenseSchema);
