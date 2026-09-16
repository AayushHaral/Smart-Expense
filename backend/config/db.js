const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
};

let pool;

async function migrateColumns(connection, dbName) {
    // Helper to safely add column if not exists
    const addColumnIfNotExists = async (table, column, definition) => {
        const [rows] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
        `, [dbName, table, column]);

        if (rows.length === 0) {
            await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
            console.log(`[MySQL Migration] Added column '${column}' to table '${table}'.`);
        }
    };

    try {
        await addColumnIfNotExists('transactions', 'subcategory', 'VARCHAR(100) DEFAULT NULL');
        await addColumnIfNotExists('transactions', 'receipt_url', 'VARCHAR(500) DEFAULT NULL');
        await addColumnIfNotExists('transactions', 'is_recurring', 'BOOLEAN DEFAULT FALSE');
        await addColumnIfNotExists('transactions', 'recurring_frequency', "VARCHAR(50) DEFAULT NULL");
        await addColumnIfNotExists('transactions', 'parent_transaction_id', 'INT DEFAULT NULL');

        await addColumnIfNotExists('budgets', 'period', "ENUM('monthly', 'weekly') DEFAULT 'monthly'");
    } catch (err) {
        console.error('[MySQL Migration] Column migration notice:', err.message);
    }
}

async function initializeDatabase() {
    try {
        // Step 1: Connect to MySQL server without database specified
        const connection = await mysql.createConnection(dbConfig);
        const dbName = process.env.DB_NAME || 'smart_expense_tracker';

        // Step 2: Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        await connection.end();

        // Step 3: Create connection pool with database selected
        pool = mysql.createPool({
            ...dbConfig,
            database: dbName,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Step 4: Run schema script to ensure tables exist
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            await pool.query(schemaSql);
        }

        // Step 5: Run column migrations for existing databases
        await migrateColumns(pool, dbName);

        console.log(`[MySQL Database] Connected successfully to '${dbName}'. Schema & columns verified.`);
    } catch (error) {
        console.error('[MySQL Database] Initialization error:', error.message);
        process.exit(1);
    }
}

// Initialize on module require / import
const initPromise = initializeDatabase();

module.exports = {
    getPool: () => pool,
    query: async (sql, params) => {
        await initPromise;
        const [results] = await pool.execute(sql, params);
        return results;
    },
    initPromise
};
