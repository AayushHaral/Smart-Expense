const bcrypt = require('bcryptjs');
const User = require('../models/User');

// GET /api/profile
exports.getProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('full_name email created_at updated_at');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        return res.json({
            success: true,
            data: user.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// PUT /api/profile
exports.updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { full_name, email } = req.body;

        if (!full_name || !email) {
            return res.status(400).json({ success: false, message: 'Full name and email are required.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }

        const cleanEmail = email.toLowerCase().trim();

        // Check duplicate email for other users
        const existingUser = await User.findOne({ email: cleanEmail, _id: { $ne: userId } });

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email address is already in use by another account.' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { full_name: full_name.trim(), email: cleanEmail },
            { new: true, runValidators: true }
        ).select('full_name email created_at updated_at');

        return res.json({
            success: true,
            message: 'Profile updated successfully.',
            data: updatedUser.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// PUT /api/profile/change-password
exports.changePassword = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password, confirm_new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
        }

        if (new_password.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
        }

        if (confirm_new_password && new_password !== confirm_new_password) {
            return res.status(400).json({ success: false, message: 'New passwords do not match.' });
        }

        // Verify current password
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(current_password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(new_password, salt);

        user.password_hash = newPasswordHash;
        await user.save();

        return res.json({
            success: true,
            message: 'Password changed successfully.'
        });
    } catch (error) {
        next(error);
    }
};
