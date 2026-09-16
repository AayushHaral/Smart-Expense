const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. Authentication token is missing.'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded; // { id, email, full_name }
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired authentication token.'
        });
    }
};

module.exports = { authenticateToken };
