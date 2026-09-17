const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_expense_tracker';


let isConnected = false;

async function connectDB() {
    if (!process.env.MONGODB_URI) {
        console.warn('[MongoDB Atlas] Warning: MONGODB_URI environment variable is not defined in .env');
    }

    try {
        mongoose.set('strictQuery', false);
        const conn = await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 15000,
            retryWrites: true,
            retryReads: true
        });

        isConnected = true;
        console.log(`[MongoDB Database] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
        return conn;
    } catch (error) {
        isConnected = false;
        if (error.message && (error.message.includes('SSL alert number 80') || error.message.includes('ReplicaSetNoPrimary'))) {
            console.error('[MongoDB Database] Connection Error: MongoDB Atlas rejected the IP address (SSL Alert 80).');
            console.error('-> Solution: In MongoDB Atlas -> Network Access, click "+ ADD IP ADDRESS" and select "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0).');
        } else {
            console.error('[MongoDB Database] Connection error:', error.message);
        }
        return null;
    }
}

const initPromise = connectDB();

module.exports = {
    connectDB,
    initPromise,
    getDbStatus: () => isConnected || mongoose.connection.readyState === 1
};
