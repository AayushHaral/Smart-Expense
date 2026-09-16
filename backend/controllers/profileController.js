const bcrypt = require('bcryptjs');
const db = require('../config/db');

// GET /api/profile
exports.getProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const users = await db.query(
            'SELECT id, full_name, email, created_at, updated_at FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        return res.json({
            success: true,
            data: users[0]
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

        // Check duplicate email for other users
        const existingUsers = await db.query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email.toLowerCase().trim(), userId]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ success: false, message: 'Email address is already in use by another account.' });
        }

        await db.query(
            'UPDATE users SET full_name = ?, email = ? WHERE id = ?',
            [full_name.trim(), email.toLowerCase().trim(), userId]
        );

        const updatedUser = await db.query(
            'SELECT id, full_name, email, created_at, updated_at FROM users WHERE id = ?',
            [userId]
        );

        return res.json({
            success: true,
            message: 'Profile updated successfully.',
            data: updatedUser[0]
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
        const users = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(current_password, users[0].password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(new_password, salt);

        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId]);

        return res.json({
            success: true,
            message: 'Password changed successfully.'
        });
    } catch (error) {
        next(error);
    }
};
