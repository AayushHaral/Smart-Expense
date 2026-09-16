const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
    room_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true,
        index: true
    },
    payer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    payee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'pending'
    },
    notes: {
        type: String,
        default: ''
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    settled_at: {
        type: Date,
        default: null
    }
});

settlementSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

settlementSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toHexString();
        delete ret.__v;
        return ret;
    }
});

settlementSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Settlement', settlementSchema);
