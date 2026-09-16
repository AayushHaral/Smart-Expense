const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Helper to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, full_name: user.full_name },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
    try {
        const { full_name, email, password, confirm_password } = req.body;

        // Validation
        if (!full_name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
        }

        if (confirm_password && password !== confirm_password) {
            return res.status(400).json({ success: false, message: 'Passwords do not match.' });
        }

        // Check duplicate email
        const existingUsers = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert new user
        const result = await db.query(
            'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
            [full_name.trim(), email.toLowerCase().trim(), password_hash]
        );

        const newUser = {
            id: result.insertId,
            full_name: full_name.trim(),
            email: email.toLowerCase().trim()
        };

        const token = generateToken(newUser);

        return res.status(201).json({
            success: true,
            message: 'User registered successfully.',
            token,
            user: newUser
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password.' });
        }

        // Fetch user by email
        const users = await db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const user = users[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const userData = {
            id: user.id,
            full_name: user.full_name,
            email: user.email
        };

        const token = generateToken(userData);

        return res.json({
            success: true,
            message: 'Login successful.',
            token,
            user: userData
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
    try {
        const users = await db.query(
            'SELECT id, full_name, email, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        return res.json({
            success: true,
            user: users[0]
        });
    } catch (error) {
        next(error);
    }
};
