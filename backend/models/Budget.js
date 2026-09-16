const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true
    },
    month: {
        type: String, // YYYY-MM
        required: true
    },
    period: {
        type: String,
        enum: ['monthly', 'weekly'],
        default: 'monthly'
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

budgetSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

budgetSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toHexString();
        delete ret.__v;
        return ret;
    }
});

budgetSchema.set('toObject', { virtuals: true });

budgetSchema.index({ user_id: 1, category: 1, month: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
