const mongoose = require('mongoose');

const roomMemberSchema = new mongoose.Schema({
    room_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true,
        index: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['admin', 'member'],
        default: 'member'
    },
    joined_at: {
        type: Date,
        default: Date.now
    }
});

roomMemberSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

roomMemberSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toHexString();
        delete ret.__v;
        return ret;
    }
});

roomMemberSchema.set('toObject', { virtuals: true });

roomMemberSchema.index({ room_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('RoomMember', roomMemberSchema);
