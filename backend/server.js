const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });


const db = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const profileRoutes = require('./routes/profileRoutes');
const roomRoutes = require('./routes/roomRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads/receipts');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Global Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Receipts Directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/rooms', roomRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    const dbConnected = db.getDbStatus();
    res.json({
        status: 'ok',
        database: dbConnected ? 'connected' : 'disconnected',
        message: 'Smart Expense Tracker REST API v3 with Roommates Module is running'
    });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Process safety handlers to prevent process crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Smart Expense Server] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[Smart Expense Server] Uncaught Exception:', err.message || err);
});

// Start server after DB initialization promise settles
db.initPromise.then(() => {
    app.listen(PORT, () => {
        console.log(`[Smart Expense Server] Running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('[Smart Expense Server] Database init failed, starting server in fallback mode:', err.message);
    app.listen(PORT, () => {
        console.log(`[Smart Expense Server] Running on http://localhost:${PORT}`);
    });
});

