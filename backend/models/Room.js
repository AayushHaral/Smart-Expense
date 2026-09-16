const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    invite_code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

roomSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

roomSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toHexString();
        delete ret.__v;
        return ret;
    }
});

roomSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Room', roomSchema);
