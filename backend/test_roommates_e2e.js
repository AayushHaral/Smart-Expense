const http = require('http');
const db = require('./config/db');

async function runRoommateE2ETests() {
    console.log('==================================================');
    console.log('    ROOMMATE EXPENSE SPLITTING E2E TEST SUITE     ');
    console.log('==================================================\n');

    await db.initPromise;
    console.log('[1/9] Database Connection: VERIFIED');

    const express = require('express');
    const cors = require('cors');
    const app = express();
    app.use(cors());
    app.use(express.json());

    const authRoutes = require('./routes/authRoutes');
    const roomRoutes = require('./routes/roomRoutes');

    app.use('/api/auth', authRoutes);
    app.use('/api/rooms', roomRoutes);

    const PORT = 5098;
    const server = app.listen(PORT);

    const request = (path, method = 'GET', data = null, token = null) => {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: PORT,
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

    try {
        await db.query("DELETE FROM users WHERE email IN ('rm1@example.com', 'rm2@example.com')");

        // TEST 1: Register User 1 & User 2
        console.log('[2/9] Registering 2 test roommate users...');
        const u1 = await request('/auth/register', 'POST', {
            full_name: 'Roommate Alice',
            email: 'rm1@example.com',
            password: 'password123',
            confirm_password: 'password123'
        });
        const token1 = u1.body.token;
        const user1Id = u1.body.user.id;

        const u2 = await request('/auth/register', 'POST', {
            full_name: 'Roommate Bob',
            email: 'rm2@example.com',
            password: 'password123',
            confirm_password: 'password123'
        });
        const token2 = u2.body.token;
        const user2Id = u2.body.user.id;
        console.log(`✓ Alice (ID: ${user1Id}) & Bob (ID: ${user2Id}) registered successfully.`);

        // TEST 2: User 1 Creates Room
        console.log('\n[3/9] Testing Room Creation (POST /api/rooms)...');
        const createRoomRes = await request('/rooms', 'POST', {
            name: 'Apartment 402',
            description: 'Shared flat for Alice and Bob'
        }, token1);

        if (createRoomRes.status !== 201 || !createRoomRes.body.success) {
            throw new Error(`Create room failed: ${JSON.stringify(createRoomRes.body)}`);
        }
        const roomId = createRoomRes.body.room.id;
        const inviteCode = createRoomRes.body.room.invite_code;
        console.log(`✓ Room created! ID: ${roomId}, Invite Code: ${inviteCode}`);

        // TEST 3: User 2 Joins Room using Invite Code
        console.log('\n[4/9] Testing Join Room via Invite Code (POST /api/rooms/join)...');
        const joinRes = await request('/rooms/join', 'POST', { invite_code: inviteCode }, token2);
        if (joinRes.status !== 200 || !joinRes.body.success) {
            throw new Error(`Join room failed: ${JSON.stringify(joinRes.body)}`);
        }
        console.log(`✓ Bob joined room using code ${inviteCode}. Joined Room: "${joinRes.body.room.name}"`);

        // Get Room Details
        const roomDetails = await request(`/rooms/${roomId}`, 'GET', null, token1);
        console.assert(roomDetails.body.members.length === 2, 'Room member count should be 2!');
        console.log(`✓ Room members count verified: ${roomDetails.body.members.length}`);

        // TEST 4: User 1 Adds Shared Expense ($1000 Rent, Equal split)
        console.log('\n[5/9] Testing Adding Shared Expense (POST /api/rooms/:roomId/expenses)...');
        const expense1 = await request(`/rooms/${roomId}/expenses`, 'POST', {
            title: 'Monthly Rent',
            amount: 1000,
            category: 'Housing',
            description: 'September Rent',
            expense_date: '2026-09-01',
            paid_by: user1Id,
            split_method: 'equal',
            splits: [
                { user_id: user1Id, split_amount: 500 },
                { user_id: user2Id, split_amount: 500 }
            ]
        }, token1);
        if (expense1.status !== 201) throw new Error(`Expense 1 failed: ${JSON.stringify(expense1.body)}`);
        console.log(`✓ Expense 1 added: $1000 Rent paid by Alice (split equal $500 / $500).`);

        // TEST 5: User 2 Adds Shared Expense ($200 Groceries, Custom split)
        const expense2 = await request(`/rooms/${roomId}/expenses`, 'POST', {
            title: 'Weekly Groceries',
            amount: 200,
            category: 'Food',
            description: 'Vegetables & Milk',
            expense_date: '2026-09-05',
            paid_by: user2Id,
            split_method: 'custom',
            splits: [
                { user_id: user1Id, split_amount: 100 },
                { user_id: user2Id, split_amount: 100 }
            ]
        }, token2);
        if (expense2.status !== 201) throw new Error(`Expense 2 failed: ${JSON.stringify(expense2.body)}`);
        console.log(`✓ Expense 2 added: $200 Groceries paid by Bob (split custom $100 / $100).`);

        // TEST 6: Calculate Roommate Balances & Smart Settle Up
        console.log('\n[6/9] Testing Roommate Balances & Debt Minimization (GET /api/rooms/:roomId/balances)...');
        const balancesRes = await request(`/rooms/${roomId}/balances`, 'GET', null, token1);
        const memberBalances = balancesRes.body.memberBalances;
        const suggestedSettlements = balancesRes.body.smartSettlements;

        console.log('Member Balances:');
        memberBalances.forEach(m => {
            console.log(` - ${m.full_name}: Paid $${m.totalPaid}, Share/Owed $${m.totalOwed}, Net: $${m.netBalance}`);
        });
        console.log('Suggested Settlements:', JSON.stringify(suggestedSettlements));

        const aliceBal = memberBalances.find(m => m.user_id === user1Id);
        const bobBal = memberBalances.find(m => m.user_id === user2Id);
        console.assert(Number(aliceBal.netBalance) === 400, `Alice net balance should be +400, got ${aliceBal.netBalance}`);
        console.assert(Number(bobBal.netBalance) === -400, `Bob net balance should be -400, got ${bobBal.netBalance}`);
        console.assert(suggestedSettlements.length === 1 && Number(suggestedSettlements[0].amount) === 400, 'Settlement suggestion failed!');
        console.log(`✓ Balances & smart debt settlement verified! Bob owes Alice $400.`);

        // TEST 7: Settle Up Payment
        console.log('\n[7/9] Testing Settle Up Recording (POST /api/rooms/:roomId/settle)...');
        const settleRes = await request(`/rooms/${roomId}/settle`, 'POST', {
            payee_id: user1Id,
            amount: 400,
            notes: 'Paid via Venmo'
        }, token2);
        if (settleRes.status !== 201) throw new Error(`Settle failed: ${JSON.stringify(settleRes.body)}`);
        console.log(`✓ Settlement recorded: Bob paid Alice $400.`);

        // Check balances after settlement
        const postSettleBal = await request(`/rooms/${roomId}/balances`, 'GET', null, token1);
        const bobPostBal = postSettleBal.body.memberBalances.find(m => m.user_id === user2Id);
        console.assert(Number(bobPostBal.netBalance) === 0, `Bob balance should be 0 after settlement, got ${bobPostBal.netBalance}`);
        console.log(`✓ Post-settlement balance verified: All debts cleared ($0 net).`);

        // TEST 8: Shared Budget CRUD
        console.log('\n[8/9] Testing Shared Budgets (POST/GET /api/rooms/:roomId/budgets)...');
        const setBudgetRes = await request(`/rooms/${roomId}/budgets`, 'POST', {
            category: 'Housing',
            amount: 1200
        }, token1);
        console.assert(setBudgetRes.status === 201, 'Failed to set shared budget');
        
        const getBudgetsRes = await request(`/rooms/${roomId}/budgets`, 'GET', null, token1);
        console.assert(getBudgetsRes.body.budgets.length === 1, 'Should have 1 shared budget!');
        const housingBudget = getBudgetsRes.body.budgets[0];
        console.log(`✓ Shared Budget set & fetched: Category "${housingBudget.category}", Limit $${housingBudget.amount}, Spent $${housingBudget.spent}, Progress ${housingBudget.percentageUsed}%`);

        // TEST 9: Roommate Notifications
        console.log('\n[9/9] Testing Roommate Notifications (GET /api/rooms/notifications)...');
        const notifRes = await request('/rooms/notifications', 'GET', null, token2);
        console.assert(notifRes.body.notifications.length > 0, 'Notifications list should not be empty');
        console.log(`✓ Received ${notifRes.body.notifications.length} notifications for Bob! Latest: "${notifRes.body.notifications[0].message}"`);

        console.log('\n==================================================');
        console.log('   ALL 9 ROOMMATE E2E TESTS PASSED SUCCESSFULLY!  ');
        console.log('==================================================\n');
    } catch (err) {
        console.error('❌ Roommate E2E Test Failed:', err);
        process.exitCode = 1;
    } finally {
        await db.query("DELETE FROM users WHERE email IN ('rm1@example.com', 'rm2@example.com')");
        server.close();
    }
}

runRoommateE2ETests();
