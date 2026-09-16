const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT token
const generateToken = (user) => {
    const userId = user.id || (user._id ? user._id.toString() : user);
    return jwt.sign(
        { id: userId, email: user.email, full_name: user.full_name },
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

        const cleanEmail = email.toLowerCase().trim();

        // Check duplicate email
        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert new user
        const newUserDoc = await User.create({
            full_name: full_name.trim(),
            email: cleanEmail,
            password_hash
        });

        const newUser = {
            id: newUserDoc.id,
            full_name: newUserDoc.full_name,
            email: newUserDoc.email
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

        const cleanEmail = email.toLowerCase().trim();

        // Fetch user by email
        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const cleanPassword = password.trim();

        // Compare password
        const isMatch = await bcrypt.compare(cleanPassword, user.password_hash) || await bcrypt.compare(password, user.password_hash);
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
        const user = await User.findById(req.user.id).select('full_name email created_at');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        return res.json({
            success: true,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                created_at: user.created_at
            }
        });
    } catch (error) {
        next(error);
    }
};
