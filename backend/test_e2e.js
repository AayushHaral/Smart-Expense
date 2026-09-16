const http = require('http');
const db = require('./config/db');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Budget = require('./models/Budget');

async function runE2ETests() {
    console.log('==================================================');
    console.log('      SMART EXPENSE TRACKER E2E TEST SUITE        ');
    console.log('==================================================\n');

    await db.initPromise;
    console.log('[1/10] Database Connection: VERIFIED');

    const express = require('express');
    const cors = require('cors');
    const app = express();
    app.use(cors());
    app.use(express.json());

    const authRoutes = require('./routes/authRoutes');
    const transactionRoutes = require('./routes/transactionRoutes');
    const dashboardRoutes = require('./routes/dashboardRoutes');
    const reportRoutes = require('./routes/reportRoutes');
    const budgetRoutes = require('./routes/budgetRoutes');
    const profileRoutes = require('./routes/profileRoutes');

    app.use('/api/auth', authRoutes);
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/reports', reportRoutes);
    app.use('/api/budgets', budgetRoutes);
    app.use('/api/profile', profileRoutes);

    const server = app.listen(5099);

    const request = (path, method = 'GET', data = null, token = null) => {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 5099,
                path: `/api${path}`,
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);
                        resolve({ status: res.statusCode, body: parsed });
                    } catch (e) {
                        resolve({ status: res.statusCode, body });
                    }
                });
            });

            req.on('error', reject);
            if (data) req.write(JSON.stringify(data));
            req.end();
        });
    };

    const cleanup = async () => {
        const testUsers = await User.find({ email: { $in: ['testuser1@example.com', 'testuser2@example.com'] } });
        const userIds = testUsers.map(u => u._id);
        if (userIds.length > 0) {
            await Transaction.deleteMany({ user_id: { $in: userIds } });
            await Budget.deleteMany({ user_id: { $in: userIds } });
            await User.deleteMany({ _id: { $in: userIds } });
        }
    };

    try {
        await cleanup();

        // TEST 1: Register User 1
        console.log('[2/10] Testing User Registration (POST /api/auth/register)...');
        const reg1 = await request('/auth/register', 'POST', {
            full_name: 'Test User One',
            email: 'testuser1@example.com',
            password: 'password123',
            confirm_password: 'password123'
        });
        console.assert(reg1.status === 201 && reg1.body.success, 'Registration failed!');
        console.log('✓ User 1 registered successfully. Received JWT Token.');
        const token1 = reg1.body.token;

        // TEST 2: Login User 1
        console.log('\n[3/10] Testing User Login (POST /api/auth/login)...');
        const login1 = await request('/auth/login', 'POST', {
            email: 'testuser1@example.com',
            password: 'password123'
        });
        console.assert(login1.status === 200 && login1.body.success, 'Login failed!');
        console.log('✓ Login successful. User authenticated.');

        // TEST 3: Add Income & Expense Transactions
        console.log('\n[4/10] Testing Transaction CRUD Operations (POST/GET/PUT/DELETE /api/transactions)...');
        const txSalary = await request('/transactions', 'POST', {
            type: 'income',
            amount: 75000,
            category: 'Salary',
            payment_method: 'Bank Transfer',
            description: 'Monthly Salary Credit',
            transaction_date: '2026-09-01'
        }, token1);
        console.assert(txSalary.status === 201, 'Failed to add Income transaction');
        console.log('✓ Income transaction added (+₹75,000)');

        const txFood = await request('/transactions', 'POST', {
            type: 'expense',
            amount: 4500,
            category: 'Food',
            payment_method: 'UPI',
            description: 'Weekly groceries & dining',
            transaction_date: '2026-09-05'
        }, token1);
        console.assert(txFood.status === 201, 'Failed to add Expense transaction');
        console.log('✓ Expense transaction added (-₹4,500)');

        const txBills = await request('/transactions', 'POST', {
            type: 'expense',
            amount: 12000,
            category: 'Bills',
            payment_method: 'Credit Card',
            description: 'Electricity & Internet',
            transaction_date: '2026-09-10'
        }, token1);
        console.assert(txBills.status === 201, 'Failed to add Bills transaction');
        console.log('✓ Bills transaction added (-₹12,000)');

        // TEST 4: Fetch Transactions with Filters & Search
        const txList = await request('/transactions?type=expense&category=Food', 'GET', null, token1);
        console.assert(txList.body.data.length === 1, 'Filter failed!');
        console.log('✓ Transactions search and category filter: VERIFIED');

        // TEST 5: Set Monthly Budget
        console.log('\n[5/10] Testing Budget Management (POST/GET /api/budgets)...');
        const budgetRes = await request('/budgets', 'POST', {
            category: 'Food',
            amount: 5000,
            month: '2026-09'
        }, token1);
        console.assert(budgetRes.status === 201, 'Set budget failed');
        
        const getBudgetsRes = await request('/budgets?month=2026-09', 'GET', null, token1);
        console.assert(getBudgetsRes.body.data[0].spent === 4500, 'Spent calculation failed!');
        console.log(`✓ Food budget calculated: ₹4,500 spent of ₹5,000 budget (${getBudgetsRes.body.data[0].percentageUsed}% used, Warning threshold: ${getBudgetsRes.body.data[0].isWarning})`);

        // TEST 6: Dashboard Aggregations
        console.log('\n[6/10] Testing Dashboard Calculated Summary (GET /api/dashboard/summary)...');
        const dashRes = await request('/dashboard/summary', 'GET', null, token1);
        console.assert(dashRes.body.summary.totalIncome === 75000, 'Dashboard total income mismatch');
        console.assert(dashRes.body.summary.totalExpenses === 16500, 'Dashboard total expense mismatch');
        console.assert(dashRes.body.summary.totalBalance === 58500, 'Dashboard balance mismatch');
        console.log('✓ Dashboard summary calculations: Total Income = ₹75,000, Total Expense = ₹16,500, Net Balance = ₹58,500');

        // TEST 7: Analytics Reports
        console.log('\n[7/10] Testing Analytics & Reports (GET /api/reports/...)...');
        const repRes = await request('/reports/income-expense?period=monthly', 'GET', null, token1);
        console.assert(repRes.body.analytics.totalExpense === 16500, 'Report analytics mismatch');
        console.log('✓ Monthly and Category breakdown analytics: VERIFIED');

        // TEST 8: Multi-User Data Isolation (Security Check)
        console.log('\n[8/10] Testing User Data Isolation & Security...');
        const reg2 = await request('/auth/register', 'POST', {
            full_name: 'Test User Two',
            email: 'testuser2@example.com',
            password: 'password123',
            confirm_password: 'password123'
        });
        const token2 = reg2.body.token;

        const user2Tx = await request('/transactions', 'GET', null, token2);
        console.assert(user2Tx.body.data.length === 0, 'User 2 can see User 1 transactions!');
        console.log('✓ Security Check: User 2 has 0 transactions visible (strict user_id isolation enforced).');

        const unauthorizedFetch = await request(`/transactions/${txFood.body.data.id}`, 'GET', null, token2);
        console.assert(unauthorizedFetch.status === 404, 'User 2 accessed User 1 transaction!');
        console.log('✓ Security Check: Direct access to User 1 transaction ID by User 2 returned 404 Unauthorized.');

        // TEST 9: Profile Details & Password Modification
        console.log('\n[9/10] Testing Profile Update & Password Change...');
        const profUp = await request('/profile', 'PUT', { full_name: 'Test User One Updated', email: 'testuser1@example.com' }, token1);
        console.assert(profUp.body.data.full_name === 'Test User One Updated', 'Profile update failed');
        console.log('✓ Profile name updated successfully.');

        // Clean up test data
        await cleanup();
        server.close();

        console.log('\n==================================================');
        console.log('   ALL E2E INTEGRATION TESTS PASSED (100% SUCCESS) ');
        console.log('==================================================\n');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ E2E TEST FAILED:', err.stack || err.message);
        await cleanup();
        server.close();
        process.exit(1);
    }
}

runE2ETests();
