const Room = require('../models/Room');
const RoomMember = require('../models/RoomMember');
const SharedExpense = require('../models/SharedExpense');
const ExpenseSplit = require('../models/ExpenseSplit');
const Settlement = require('../models/Settlement');
const SharedBudget = require('../models/SharedBudget');
const Notification = require('../models/Notification');
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper to generate unique 6-character invite code
const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// Helper to send notification
const sendNotification = async (userId, roomId, type, message) => {
    try {
        await Notification.create({
            user_id: userId,
            room_id: roomId,
            type,
            message
        });
    } catch (e) {
        console.error('Failed to send notification:', e.message);
    }
};

// Helper: Verify user membership in room
const verifyRoomMember = async (userId, roomId) => {
    if (!mongoose.Types.ObjectId.isValid(roomId)) return null;
    const member = await RoomMember.findOne({ room_id: roomId, user_id: userId });
    return member;
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
        let existing = await Room.findOne({ invite_code: inviteCode });
        while (existing) {
            inviteCode = generateInviteCode();
            existing = await Room.findOne({ invite_code: inviteCode });
        }

        const newRoom = await Room.create({
            name: name.trim(),
            invite_code: inviteCode,
            created_by: userId
        });

        // Add creator as Admin
        await RoomMember.create({
            room_id: newRoom._id,
            user_id: userId,
            role: 'admin'
        });

        return res.status(201).json({
            success: true,
            message: 'Room created successfully.',
            room: {
                id: newRoom.id,
                name: newRoom.name,
                invite_code: newRoom.invite_code,
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

        const room = await Room.findOne({ invite_code: cleanCode });
        if (!room) {
            return res.status(404).json({ success: false, message: 'Invalid invite code. No room found.' });
        }

        // Check if already a member
        const existingMember = await RoomMember.findOne({ room_id: room._id, user_id: userId });
        if (existingMember) {
            return res.status(400).json({ success: false, message: 'You are already a member of this room.' });
        }

        await RoomMember.create({
            room_id: room._id,
            user_id: userId,
            role: 'member'
        });

        // Notify room creator/members
        await sendNotification(room.created_by, room._id, 'member_joined', `${req.user.full_name} joined room '${room.name}'.`);

        return res.json({
            success: true,
            message: `Successfully joined '${room.name}'!`,
            room: room.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/rooms/my-rooms - Get User's Rooms
exports.getMyRooms = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const memberships = await RoomMember.find({ user_id: userId }).sort({ joined_at: -1 });

        const roomsList = [];
        for (const m of memberships) {
            const room = await Room.findById(m.room_id);
            if (room) {
                const memberCount = await RoomMember.countDocuments({ room_id: room._id });
                roomsList.push({
                    ...room.toJSON(),
                    role: m.role,
                    joined_at: m.joined_at,
                    member_count: memberCount
                });
            }
        }

        return res.json({
            success: true,
            rooms: roomsList
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

        const room = await Room.findById(roomId);
        const membersDocs = await RoomMember.find({ room_id: roomId }).sort({ joined_at: 1 });

        const members = [];
        for (const m of membersDocs) {
            const u = await User.findById(m.user_id).select('full_name email');
            if (u) {
                members.push({
                    id: m.id,
                    role: m.role,
                    joined_at: m.joined_at,
                    user_id: u.id,
                    full_name: u.full_name,
                    email: u.email
                });
            }
        }

        return res.json({
            success: true,
            room: room ? room.toJSON() : null,
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

        await RoomMember.deleteOne({ room_id: roomId, user_id: targetUserId });

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

        await RoomMember.deleteOne({ room_id: roomId, user_id: userId });

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
            paid_by,
            paid_by_user_id,
            split_method = 'equal',
            splits
        } = req.body;

        if (!title || !amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Please provide valid expense title and amount.' });
        }

        const totalAmount = parseFloat(amount);
        const payerId = paid_by || paid_by_user_id || userId;
        const dateStr = expense_date || new Date().toISOString().substring(0, 10);

        let receipt_url = null;
        if (req.file) {
            receipt_url = `/uploads/receipts/${req.file.filename}`;
        }

        const sharedExp = await SharedExpense.create({
            room_id: roomId,
            title: title.trim(),
            amount: totalAmount,
            category: category || 'Other',
            description: description || '',
            expense_date: dateStr,
            paid_by_user_id: payerId,
            split_method,
            receipt_url
        });

        // Parse splits
        let splitList = [];
        if (splits) {
            splitList = typeof splits === 'string' ? JSON.parse(splits) : splits;
        }

        // If no custom splits provided, default to equal split across all room members
        if (!splitList || splitList.length === 0) {
            const roomMembers = await RoomMember.find({ room_id: roomId });
            const memberCount = roomMembers.length;
            const equalShare = totalAmount / memberCount;

            splitList = roomMembers.map(m => ({
                user_id: m.user_id.toString(),
                amount_owed: equalShare
            }));
        }

        // Calculate and validate splits
        let calculatedSplits = [];
        if (split_method === 'equal') {
            const share = totalAmount / splitList.length;
            calculatedSplits = splitList.map(s => ({
                user_id: s.user_id.toString(),
                amount_owed: share
            }));
        } else if (split_method === 'percentage') {
            calculatedSplits = splitList.map(s => {
                const pct = parseFloat(s.percentage || 0);
                return {
                    user_id: s.user_id.toString(),
                    percentage: pct,
                    amount_owed: (totalAmount * pct) / 100
                };
            });
        } else if (split_method === 'shares') {
            const totalShares = splitList.reduce((acc, curr) => acc + parseInt(curr.shares || 1, 10), 0);
            calculatedSplits = splitList.map(s => {
                const sh = parseInt(s.shares || 1, 10);
                return {
                    user_id: s.user_id.toString(),
                    shares: sh,
                    amount_owed: (totalAmount * sh) / totalShares
                };
            });
        } else {
            // custom amounts
            calculatedSplits = splitList.map(s => ({
                user_id: s.user_id.toString(),
                amount_owed: parseFloat(s.amount_owed !== undefined ? s.amount_owed : (s.split_amount || 0))
            }));
        }

        // Insert split rows
        for (const split of calculatedSplits) {
            await ExpenseSplit.create({
                shared_expense_id: sharedExp._id,
                user_id: split.user_id,
                amount_owed: split.amount_owed,
                percentage: split.percentage || null,
                shares: split.shares || null
            });

            // Send notification if user owes money
            if (split.user_id.toString() !== payerId.toString() && split.amount_owed > 0) {
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
                id: sharedExp.id,
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

        const expensesDocs = await SharedExpense.find({ room_id: roomId }).sort({ expense_date: -1, _id: -1 });

        const expenses = [];
        for (const exp of expensesDocs) {
            const payer = await User.findById(exp.paid_by_user_id).select('full_name');
            const splitsDocs = await ExpenseSplit.find({ shared_expense_id: exp._id });

            const splits = [];
            for (const s of splitsDocs) {
                const splitUser = await User.findById(s.user_id).select('full_name');
                splits.push({
                    ...s.toJSON(),
                    full_name: splitUser ? splitUser.full_name : ''
                });
            }

            expenses.push({
                ...exp.toJSON(),
                paid_by_name: payer ? payer.full_name : '',
                splits
            });
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

        const deleted = await SharedExpense.findOneAndDelete({ _id: expenseId, room_id: roomId });
        if (deleted) {
            await ExpenseSplit.deleteMany({ shared_expense_id: expenseId });
        }

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
        const roomObjectId = new mongoose.Types.ObjectId(roomId);

        const membership = await verifyRoomMember(userId, roomId);
        if (!membership) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        // Fetch all members
        const membersDocs = await RoomMember.find({ room_id: roomId });
        const members = [];
        for (const m of membersDocs) {
            const u = await User.findById(m.user_id).select('full_name email');
            if (u) {
                members.push({
                    user_id: u.id,
                    full_name: u.full_name,
                    email: u.email
                });
            }
        }

        // Paid totals per user
        const paidRows = await SharedExpense.aggregate([
            { $match: { room_id: roomObjectId } },
            {
                $group: {
                    _id: "$paid_by_user_id",
                    total_paid: { $sum: "$amount" }
                }
            }
        ]);
        const paidMap = {};
        paidRows.forEach(r => { paidMap[r._id.toString()] = parseFloat(r.total_paid || 0); });

        // Owed totals per user
        const roomExpenses = await SharedExpense.find({ room_id: roomId }).select('_id');
        const expenseIds = roomExpenses.map(e => e._id);

        const owedRows = await ExpenseSplit.aggregate([
            { $match: { shared_expense_id: { $in: expenseIds } } },
            {
                $group: {
                    _id: "$user_id",
                    total_owed: { $sum: "$amount_owed" }
                }
            }
        ]);
        const owedMap = {};
        owedRows.forEach(r => { owedMap[r._id.toString()] = parseFloat(r.total_owed || 0); });

        // Completed Settlements Adjustments
        const completedSettlements = await Settlement.aggregate([
            { $match: { room_id: roomObjectId, status: 'completed' } },
            {
                $group: {
                    _id: { payer_id: "$payer_id", payee_id: "$payee_id" },
                    total_settled: { $sum: "$amount" }
                }
            }
        ]);

        const settledPayerMap = {};
        const settledPayeeMap = {};
        completedSettlements.forEach(s => {
            const amt = parseFloat(s.total_settled || 0);
            const payerIdStr = s._id.payer_id.toString();
            const payeeIdStr = s._id.payee_id.toString();
            settledPayerMap[payerIdStr] = (settledPayerMap[payerIdStr] || 0) + amt;
            settledPayeeMap[payeeIdStr] = (settledPayeeMap[payeeIdStr] || 0) + amt;
        });

        // Compute member balance objects
        const memberBalances = members.map(m => {
            const uidStr = m.user_id.toString();
            const paid = paidMap[uidStr] || 0;
            const owed = owedMap[uidStr] || 0;
            const settledPaid = settledPayerMap[uidStr] || 0;
            const settledReceived = settledPayeeMap[uidStr] || 0;

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

        const currentUserBalance = memberBalances.find(b => b.user_id.toString() === userId.toString()) || { netBalance: 0 };

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

        const settlement = await Settlement.create({
            room_id: roomId,
            payer_id: userId,
            payee_id,
            amount: numericAmount,
            status: 'completed',
            notes: notes || 'Settlement payment'
        });

        await sendNotification(
            payee_id,
            roomId,
            'settlement_completed',
            `${req.user.full_name} recorded a settlement payment of ₹${numericAmount.toFixed(2)} to you.`
        );

        return res.status(201).json({
            success: true,
            message: 'Settlement recorded successfully.',
            settlementId: settlement.id
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

        const budgets = await SharedBudget.find({ room_id: roomId, month }).sort({ category: 1 });

        const expensesAgg = await SharedExpense.aggregate([
            {
                $match: {
                    room_id: new mongoose.Types.ObjectId(roomId),
                    expense_date: { $regex: `^${month}` }
                }
            },
            {
                $group: {
                    _id: "$category",
                    spent: { $sum: "$amount" }
                }
            }
        ]);

        const spentMap = {};
        expensesAgg.forEach(e => { spentMap[e._id] = parseFloat(e.spent || 0); });

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

        await SharedBudget.findOneAndUpdate(
            { room_id: roomId, category, month: targetMonth },
            { amount: numericAmount },
            { upsert: true, new: true, runValidators: true }
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

        const notificationsDocs = await Notification.find({ user_id: userId })
            .sort({ created_at: -1 })
            .limit(20);

        return res.json({
            success: true,
            notifications: notificationsDocs.map(n => n.toJSON())
        });
    } catch (error) {
        next(error);
    }
};
