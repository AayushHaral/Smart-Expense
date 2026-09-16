const db = require('../config/db');

// Helper to generate unique 6-character invite code
const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars like I, O, 0, 1
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// Helper to send notification
const sendNotification = async (userId, roomId, type, message) => {
    try {
        await db.query(
            'INSERT INTO roommate_notifications (user_id, room_id, type, message) VALUES (?, ?, ?, ?)',
            [userId, roomId, type, message]
        );
    } catch (e) {
        console.error('Failed to send notification:', e.message);
    }
};

// Helper: Verify user membership in room
const verifyRoomMember = async (userId, roomId) => {
    const members = await db.query(
        'SELECT role FROM room_members WHERE room_id = ? AND user_id = ?',
        [roomId, userId]
    );
    return members.length > 0 ? members[0] : null;
};

// POST /api/rooms - Create Room
exports.createRoom = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Room name is required.' });
        }

        let inviteCode = generateInviteCode();
        // Ensure uniqueness
        let existing = await db.query('SELECT id FROM rooms WHERE invite_code = ?', [inviteCode]);
        while (existing.length > 0) {
            inviteCode = generateInviteCode();
            existing = await db.query('SELECT id FROM rooms WHERE invite_code = ?', [inviteCode]);
        }

        const roomResult = await db.query(
            'INSERT INTO rooms (name, invite_code, created_by) VALUES (?, ?, ?)',
            [name.trim(), inviteCode, userId]
        );

        const roomId = roomResult.insertId;

        // Add creator as Admin
        await db.query(
            'INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, ?)',
            [roomId, userId, 'admin']
        );

        return res.status(201).json({
            success: true,
            message: 'Room created successfully.',
            room: {
                id: roomId,
                name: name.trim(),
                invite_code: inviteCode,
                role: 'admin'
            }
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/rooms/join - Join Room using Invite Code
exports.joinRoom = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { invite_code } = req.body;

        if (!invite_code) {
            return res.status(400).json({ success: false, message: 'Invite code is required.' });
        }

        const cleanCode = invite_code.trim().toUpperCase();

        const rooms = await db.query('SELECT * FROM rooms WHERE invite_code = ?', [cleanCode]);
        if (rooms.length === 0) {
            return res.status(404).json({ success: false, message: 'Invalid invite code. No room found.' });
        }

        const room = rooms[0];

        // Check if already a member
        const existingMember = await db.query(
            'SELECT id FROM room_members WHERE room_id = ? AND user_id = ?',
            [room.id, userId]
        );

        if (existingMember.length > 0) {
            return res.status(400).json({ success: false, message: 'You are already a member of this room.' });
        }

        await db.query(
            'INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, ?)',
            [room.id, userId, 'member']
        );

        // Notify room members
        await sendNotification(room.created_by, room.id, 'member_joined', `${req.user.full_name} joined room '${room.name}'.`);

        return res.json({
            success: true,
            message: `Successfully joined '${room.name}'!`,
            room
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/rooms/my-rooms - Get User's Rooms
exports.getMyRooms = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const rooms = await db.query(
            `SELECT r.*, rm.role, rm.joined_at,
                    (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
             FROM rooms r
             JOIN room_members rm ON r.id = rm.room_id
             WHERE rm.user_id = ?
             ORDER BY rm.joined_at DESC`,
            [userId]
        );

        return res.json({
            success: true,
            rooms
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/rooms/:roomId - Get Room Details & Members
exports.getRoomDetails = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { roomId } = req.params;

        const membership = await verifyRoomMember(userId, roomId);
        if (!membership) {
            return res.status(403).json({ success: false, message: 'Access denied. You are not a member of this room.' });
        }

        const room = await db.query('SELECT * FROM rooms WHERE id = ?', [roomId]);
        const members = await db.query(
            `SELECT rm.id, rm.role, rm.joined_at, u.id as user_id, u.full_name, u.email
             FROM room_members rm
             JOIN users u ON rm.user_id = u.id
             WHERE rm.room_id = ?
             ORDER BY rm.joined_at ASC`,
            [roomId]
        );

        return res.json({
            success: true,
            room: room[0],
            role: membership.role,
            members
        });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/rooms/:roomId/members/:targetUserId - Remove Member
exports.removeMember = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { roomId, targetUserId } = req.params;

        const membership = await verifyRoomMember(userId, roomId);
        if (!membership || membership.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only room admins can remove members.' });
        }

        await db.query(
            'DELETE FROM room_members WHERE room_id = ? AND user_id = ?',
            [roomId, targetUserId]
        );

        return res.json({
            success: true,
            message: 'Member removed from room.'
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/rooms/:roomId/leave - Leave Room
exports.leaveRoom = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { roomId } = req.params;

        await db.query(
            'DELETE FROM room_members WHERE room_id = ? AND user_id = ?',
            [roomId, userId]
        );

        return res.json({
            success: true,
            message: 'You have left the room.'
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/rooms/:roomId/expenses - Create Shared Expense
exports.createSharedExpense = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { roomId } = req.params;

        const membership = await verifyRoomMember(userId, roomId);
        if (!membership) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const {
            title,
            amount,
            category,
            description,
            expense_date,
            paid_by_user_id,
            split_method = 'equal',
            splits // Array of { user_id, amount_owed, percentage, shares }
        } = req.body;

        if (!title || !amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Please provide valid expense title and amount.' });
        }

        const totalAmount = parseFloat(amount);
        const payerId = parseInt(paid_by_user_id || userId, 10);
        const dateStr = expense_date || new Date().toISOString().substring(0, 10);

        let receipt_url = null;
        if (req.file) {
            receipt_url = `/uploads/receipts/${req.file.filename}`;
        }

        // Insert shared expense
        const expResult = await db.query(
            `INSERT INTO shared_expenses 
             (room_id, title, amount, category, description, expense_date, paid_by_user_id, split_method, receipt_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [roomId, title.trim(), totalAmount, category || 'Other', description || '', dateStr, payerId, split_method, receipt_url]
        );

        const sharedExpenseId = expResult.insertId;

        // Parse splits
        let splitList = [];
        if (splits) {
            splitList = typeof splits === 'string' ? JSON.parse(splits) : splits;
        }

        // If no custom splits provided, default to equal split across all room members
        if (!splitList || splitList.length === 0) {
            const roomMembers = await db.query('SELECT user_id FROM room_members WHERE room_id = ?', [roomId]);
            const memberCount = roomMembers.length;
            const equalShare = totalAmount / memberCount;

            splitList = roomMembers.map(m => ({
                user_id: m.user_id,
                amount_owed: equalShare
            }));
        }

        // Calculate and validate splits
        let calculatedSplits = [];
        if (split_method === 'equal') {
            const share = totalAmount / splitList.length;
            calculatedSplits = splitList.map(s => ({
                user_id: parseInt(s.user_id, 10),
                amount_owed: share
            }));
        } else if (split_method === 'percentage') {
            calculatedSplits = splitList.map(s => {
                const pct = parseFloat(s.percentage || 0);
                return {
                    user_id: parseInt(s.user_id, 10),
                    percentage: pct,
                    amount_owed: (totalAmount * pct) / 100
                };
            });
        } else if (split_method === 'shares') {
            const totalShares = splitList.reduce((acc, curr) => acc + parseInt(curr.shares || 1, 10), 0);
            calculatedSplits = splitList.map(s => {
                const sh = parseInt(s.shares || 1, 10);
                return {
                    user_id: parseInt(s.user_id, 10),
                    shares: sh,
                    amount_owed: (totalAmount * sh) / totalShares
                };
            });
        } else {
            // custom amounts
            calculatedSplits = splitList.map(s => ({
                user_id: parseInt(s.user_id, 10),
                amount_owed: parseFloat(s.amount_owed !== undefined ? s.amount_owed : (s.split_amount || 0))
            }));
        }

        // Insert split rows
        for (const split of calculatedSplits) {
            await db.query(
                `INSERT INTO expense_splits (shared_expense_id, user_id, amount_owed, percentage, shares)
                 VALUES (?, ?, ?, ?, ?)`,
                [sharedExpenseId, split.user_id, split.amount_owed, split.percentage || null, split.shares || null]
            );

            // Send notification if user owes money
            if (split.user_id !== payerId && split.amount_owed > 0) {
                await sendNotification(
                    split.user_id,
                    roomId,
                    'expense_added',
                    `New expense '${title}' added by ${req.user.full_name}. You owe ₹${split.amount_owed.toFixed(2)}.`
                );
            }
        }

        return res.status(201).json({
            success: true,
            message: 'Shared expense created successfully.',
            expense: {
                id: sharedExpenseId,
                title,
                amount: totalAmount,
                paid_by_user_id: payerId,
                splits: calculatedSplits
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/rooms/:roomId/expenses - Get Shared Expenses
exports.getSharedExpenses = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { roomId } = req.params;

        const membership = await verifyRoomMember(userId, roomId);
        if (!membership) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const expenses = await db.query(
            `SELECT se.*, u.full_name as paid_by_name
             FROM shared_expenses se
             JOIN users u ON se.paid_by_user_id = u.id
             WHERE se.room_id = ?
             ORDER BY se.expense_date DESC, se.id DESC`,
            [roomId]
        );

        // Attach splits to each expense
        for (const exp of expenses) {
            const splits = await db.query(
                `SELECT es.*, u.full_name
                 FROM expense_splits es
                 JOIN users u ON es.user_id = u.id
                 WHERE es.shared_expense_id = ?`,
                [exp.id]
            );
            exp.splits = splits;
        }

        return res.json({
            success: true,
            expenses
        });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/rooms/:roomId/expenses/:expenseId
exports.deleteSharedExpense = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { roomId, expenseId } = req.params;

        const membership = await verifyRoomMember(userId, roomId);
        if (!membership) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        await db.query(
            'DELETE FROM shared_expenses WHERE id = ? AND room_id = ?',
            [expenseId, roomId]
        );

        return res.json({
            success: true,
            message: 'Shared expense deleted.'
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/rooms/:roomId/balances - Roommate Balances & Smart Settle Calculations
exports.getRoomBalances = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { roomId } = req.params;

        const membership = await verifyRoomMember(userId, roomId);
        if (!membership) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        // Fetch all members
        const members = await db.query(
            `SELECT u.id as user_id, u.full_name, u.email
             FROM room_members rm
             JOIN users u ON rm.user_id = u.id
             WHERE rm.room_id = ?`,
            [roomId]
        );

        // Paid totals per user
        const paidRows = await db.query(
            `SELECT paid_by_user_id, SUM(amount) as total_paid
             FROM shared_expenses
             WHERE room_id = ?
             GROUP BY paid_by_user_id`,
            [roomId]
        );
        const paidMap = {};
        paidRows.forEach(r => { paidMap[r.paid_by_user_id] = parseFloat(r.total_paid || 0); });

        // Owed totals per user
        const owedRows = await db.query(
            `SELECT es.user_id, SUM(es.amount_owed) as total_owed
             FROM expense_splits es
             JOIN shared_expenses se ON es.shared_expense_id = se.id
             WHERE se.room_id = ?
             GROUP BY es.user_id`,
            [roomId]
        );
        const owedMap = {};
        owedRows.forEach(r => { owedMap[r.user_id] = parseFloat(r.total_owed || 0); });

        // Completed Settlements Adjustments
        const completedSettlements = await db.query(
            `SELECT payer_id, payee_id, SUM(amount) as total_settled
             FROM settlements
             WHERE room_id = ? AND status = 'completed'
             GROUP BY payer_id, payee_id`,
            [roomId]
        );

        const settledPayerMap = {};
        const settledPayeeMap = {};
        completedSettlements.forEach(s => {
            const amt = parseFloat(s.total_settled || 0);
            settledPayerMap[s.payer_id] = (settledPayerMap[s.payer_id] || 0) + amt;
            settledPayeeMap[s.payee_id] = (settledPayeeMap[s.payee_id] || 0) + amt;
        });

        // Compute member balance objects
        const memberBalances = members.map(m => {
            const paid = paidMap[m.user_id] || 0;
            const owed = owedMap[m.user_id] || 0;
            const settledPaid = settledPayerMap[m.user_id] || 0;
            const settledReceived = settledPayeeMap[m.user_id] || 0;

            // Net balance: (Paid + SettledPaid) - (Owed + SettledReceived)
            const netBalance = (paid + settledPaid) - (owed + settledReceived);

            return {
                user_id: m.user_id,
                full_name: m.full_name,
                email: m.email,
                totalPaid: paid,
                totalOwed: owed,
                settledPaid,
                settledReceived,
                netBalance: Math.round(netBalance * 100) / 100
            };
        });

        // Smart Settlement Calculation (Minimizing payments)
        const debtors = [];
        const creditors = [];

        memberBalances.forEach(b => {
            if (b.netBalance < -0.01) {
                debtors.push({ user_id: b.user_id, full_name: b.full_name, amount: Math.abs(b.netBalance) });
            } else if (b.netBalance > 0.01) {
                creditors.push({ user_id: b.user_id, full_name: b.full_name, amount: b.netBalance });
            }
        });

        const smartSettlements = [];
        let dIdx = 0;
        let cIdx = 0;

        while (dIdx < debtors.length && cIdx < creditors.length) {
            const debtor = debtors[dIdx];
            const creditor = creditors[cIdx];
            const minAmt = Math.min(debtor.amount, creditor.amount);

            smartSettlements.push({
                from_user_id: debtor.user_id,
                from_name: debtor.full_name,
                to_user_id: creditor.user_id,
                to_name: creditor.full_name,
                amount: Math.round(minAmt * 100) / 100
            });

            debtor.amount -= minAmt;
            creditor.amount -= minAmt;

            if (debtor.amount < 0.01) dIdx++;
            if (creditor.amount < 0.01) cIdx++;
        }

        const currentUserBalance = memberBalances.find(b => b.user_id === userId) || { netBalance: 0 };

        return res.json({
            success: true,
            userNetBalance: currentUserBalance.netBalance,
            memberBalances,
            smartSettlements
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/rooms/:roomId/settle - Record Settlement
exports.recordSettlement = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { roomId } = req.params;
        const { payee_id, amount, notes } = req.body;

        const numericAmount = parseFloat(amount);
        if (!payee_id || isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid settlement details.' });
        }

        const result = await db.query(
            `INSERT INTO settlements (room_id, payer_id, payee_id, amount, status, notes)
             VALUES (?, ?, ?, ?, 'completed', ?)`,
            [roomId, userId, payee_id, numericAmount, notes || 'Settlement payment']
        );

        await sendNotification(
            payee_id,
            roomId,
            'settlement_completed',
            `${req.user.full_name} recorded a settlement payment of ₹${numericAmount.toFixed(2)} to you.`
        );

        return res.status(201).json({
            success: true,
            message: 'Settlement recorded successfully.',
            settlementId: result.insertId
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/rooms/:roomId/budgets - Shared Budgets
exports.getSharedBudgets = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { roomId } = req.params;
        const month = req.query.month || new Date().toISOString().substring(0, 7);

        const budgets = await db.query(
            'SELECT * FROM shared_budgets WHERE room_id = ? AND month = ? ORDER BY category ASC',
            [roomId, month]
        );

        const expenses = await db.query(
            `SELECT category, SUM(amount) as spent
             FROM shared_expenses
             WHERE room_id = ? AND DATE_FORMAT(expense_date, '%Y-%m') = ?
             GROUP BY category`,
            [roomId, month]
        );

        const spentMap = {};
        expenses.forEach(e => { spentMap[e.category] = parseFloat(e.spent || 0); });

        const budgetList = budgets.map(b => {
            const amount = parseFloat(b.amount);
            const spent = spentMap[b.category] || 0;
            const remaining = amount - spent;
            const percentageUsed = amount > 0 ? Math.min(100, Math.round((spent / amount) * 100)) : 0;

            return {
                id: b.id,
                category: b.category,
                amount,
                spent,
                remaining,
                percentageUsed,
                isWarning: percentageUsed >= 80 && percentageUsed < 100,
                isExceeded: percentageUsed >= 100
            };
        });

        return res.json({
            success: true,
            month,
            budgets: budgetList
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/rooms/:roomId/budgets - Create/Update Shared Budget
exports.createOrUpdateSharedBudget = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { roomId } = req.params;
        const { category, amount, month } = req.body;

        const numericAmount = parseFloat(amount);
        if (!category || isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid category or budget amount.' });
        }

        const targetMonth = month || new Date().toISOString().substring(0, 7);

        await db.query(
            `INSERT INTO shared_budgets (room_id, category, amount, month)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = CURRENT_TIMESTAMP`,
            [roomId, category, numericAmount, targetMonth]
        );

        return res.status(201).json({
            success: true,
            message: 'Shared budget saved.'
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/rooms/notifications - Get Notifications
exports.getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const notifications = await db.query(
            'SELECT * FROM roommate_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
            [userId]
        );

        return res.json({
            success: true,
            notifications
        });
    } catch (error) {
        next(error);
    }
};
