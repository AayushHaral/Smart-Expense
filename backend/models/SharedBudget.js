const mongoose = require('mongoose');

const sharedBudgetSchema = new mongoose.Schema({
    room_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
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
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

sharedBudgetSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

sharedBudgetSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toHexString();
        delete ret.__v;
        return ret;
    }
});

sharedBudgetSchema.set('toObject', { virtuals: true });

sharedBudgetSchema.index({ room_id: 1, category: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('SharedBudget', sharedBudgetSchema);
