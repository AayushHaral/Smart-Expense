const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_expense_tracker';

let isConnected = false;

async function connectDB() {
    if (!process.env.MONGODB_URI) {
        console.warn('[MongoDB Atlas] Warning: MONGODB_URI environment variable is not defined.');
    }

    try {
        mongoose.set('strictQuery', false);
        const conn = await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 15000,
        });

        isConnected = true;
        console.log(`[MongoDB Database] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
        return conn;
    } catch (error) {
        isConnected = false;
        console.error('[MongoDB Database] Connection error:', error);
        // Do not rethrow or crash immediately to ensure server can start and attempt retry / report health
        return null;
    }
}

const initPromise = connectDB();

module.exports = {
    connectDB,
    initPromise,
    getDbStatus: () => isConnected || mongoose.connection.readyState === 1
};
