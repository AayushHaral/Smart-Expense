const mongoose = require('mongoose');

const expenseSplitSchema = new mongoose.Schema({
    shared_expense_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SharedExpense',
        required: true,
        index: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    amount_owed: {
        type: Number,
        required: true
    },
    percentage: {
        type: Number,
        default: null
    },
    shares: {
        type: Number,
        default: null
    }
});

expenseSplitSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

expenseSplitSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toHexString();
        delete ret.__v;
        return ret;
    }
});

expenseSplitSchema.set('toObject', { virtuals: true });

expenseSplitSchema.index({ shared_expense_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('ExpenseSplit', expenseSplitSchema);
