const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// GET /api/transactions
exports.getTransactions = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const {
            type,
            category,
            subcategory,
            search,
            startDate,
            endDate,
            is_recurring,
            sortBy = 'transaction_date',
            sortOrder = 'DESC',
            page = 1,
            limit = 20
        } = req.query;

        const filter = { user_id: new mongoose.Types.ObjectId(userId) };

        if (type && type !== 'all') {
            filter.type = type;
        }

        if (category && category !== 'all') {
            filter.category = category;
        }

        if (subcategory && subcategory !== 'all') {
            filter.subcategory = subcategory;
        }

        if (is_recurring === 'true' || is_recurring === '1' || is_recurring === true) {
            filter.is_recurring = true;
        }

        if (startDate || endDate) {
            filter.transaction_date = {};
            if (startDate) filter.transaction_date.$gte = startDate;
            if (endDate) filter.transaction_date.$lte = endDate;
        }

        if (search && search.trim() !== '') {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { description: searchRegex },
                { category: searchRegex },
                { subcategory: searchRegex },
                { payment_method: searchRegex }
            ];
        }

        // Sorting
        const allowedSortFields = ['transaction_date', 'amount', 'category', 'created_at'];
        const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'transaction_date';
        const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 1 : -1;

        const sortObj = {};
        sortObj[safeSortBy] = sortDirection;
        sortObj._id = -1;

        // Pagination
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [transactions, total] = await Promise.all([
            Transaction.find(filter).sort(sortObj).skip(skip).limit(limitNum),
            Transaction.countDocuments(filter)
        ]);

        return res.json({
            success: true,
            data: transactions.map(t => t.toJSON()),
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/transactions/calendar
exports.getCalendarTransactions = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { year = new Date().getFullYear(), month = String(new Date().getMonth() + 1).padStart(2, '0'), date } = req.query;

        // If specific date requested, return list of transactions
        if (date) {
            const dailyTransactions = await Transaction.find({
                user_id: userId,
                transaction_date: date
            }).sort({ _id: -1 });

            let income = 0;
            let expense = 0;

            dailyTransactions.forEach(tx => {
                if (tx.type === 'income') income += tx.amount;
                if (tx.type === 'expense') expense += tx.amount;
            });

            return res.json({
                success: true,
                date,
                summary: {
                    income,
                    expense,
                    totalSpending: expense,
                    netBalance: income - expense,
                    count: dailyTransactions.length
                },
                transactions: dailyTransactions.map(t => t.toJSON())
            });
        }

        // Return month-level day-by-day aggregations
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        
        const dailyAggregates = await Transaction.aggregate([
            {
                $match: {
                    user_id: new mongoose.Types.ObjectId(userId),
                    transaction_date: { $regex: `^${monthStr}` }
                }
            },
            {
                $group: {
                    _id: "$transaction_date",
                    income: {
                        $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] }
                    },
                    expense: {
                        $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const calendarMap = {};
        dailyAggregates.forEach(row => {
            calendarMap[row._id] = {
                income: row.income,
                expense: row.expense,
                count: row.count
            };
        });

        return res.json({
            success: true,
            year: parseInt(year, 10),
            month: parseInt(month, 10),
            monthStr,
            calendarData: calendarMap
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/transactions/:id
exports.getTransactionById = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const transactionId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(transactionId)) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found or unauthorized.'
            });
        }

        const transaction = await Transaction.findOne({ _id: transactionId, user_id: userId });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found or unauthorized.'
            });
        }

        // Fetch split items if parent
        const splitItems = await Transaction.find({ parent_transaction_id: transactionId, user_id: userId });

        return res.json({
            success: true,
            data: {
                ...transaction.toJSON(),
                split_items: splitItems.map(s => s.toJSON())
            }
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/transactions
exports.createTransaction = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const {
            type,
            amount,
            category,
            subcategory,
            payment_method,
            description,
            transaction_date,
            is_recurring,
            recurring_frequency,
            split_items
        } = req.body;

        if (!type || !['income', 'expense'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid transaction type.' });
        }

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be greater than 0.' });
        }

        if (!category) {
            return res.status(400).json({ success: false, message: 'Category is required.' });
        }

        if (!transaction_date) {
            return res.status(400).json({ success: false, message: 'Transaction date is required.' });
        }

        let receipt_url = null;
        if (req.file) {
            receipt_url = `/uploads/receipts/${req.file.filename}`;
        } else if (req.body.receipt_url) {
            receipt_url = req.body.receipt_url;
        }

        const finalPaymentMethod = payment_method || 'Cash';
        const finalDescription = description ? description.trim() : '';
        const isRec = is_recurring === 'true' || is_recurring === true;
        const recFreq = isRec ? (recurring_frequency || 'monthly') : null;

        // Insert main parent transaction
        const mainTx = await Transaction.create({
            user_id: userId,
            type,
            amount: numericAmount,
            category,
            subcategory: subcategory || null,
            payment_method: finalPaymentMethod,
            description: finalDescription,
            transaction_date,
            receipt_url,
            is_recurring: isRec,
            recurring_frequency: recFreq
        });

        // Handle split transaction items if provided
        let parsedSplitItems = [];
        if (split_items) {
            try {
                parsedSplitItems = typeof split_items === 'string' ? JSON.parse(split_items) : split_items;
                if (Array.isArray(parsedSplitItems) && parsedSplitItems.length > 0) {
                    for (const item of parsedSplitItems) {
                        await Transaction.create({
                            user_id: userId,
                            type,
                            amount: parseFloat(item.amount),
                            category: item.category,
                            subcategory: item.subcategory || null,
                            payment_method: finalPaymentMethod,
                            description: item.description || finalDescription,
                            transaction_date,
                            parent_transaction_id: mainTx._id
                        });
                    }
                }
            } catch (e) {
                console.error('Failed to parse split items:', e);
            }
        }

        const newTransaction = {
            ...mainTx.toJSON(),
            split_items: parsedSplitItems
        };

        return res.status(201).json({
            success: true,
            message: 'Transaction recorded successfully.',
            data: newTransaction
        });
    } catch (error) {
        next(error);
    }
};

// PUT /api/transactions/:id
exports.updateTransaction = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const transactionId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(transactionId)) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found or unauthorized.'
            });
        }

        const existing = await Transaction.findOne({ _id: transactionId, user_id: userId });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found or unauthorized.'
            });
        }

        const {
            type,
            amount,
            category,
            subcategory,
            payment_method,
            description,
            transaction_date,
            is_recurring,
            recurring_frequency
        } = req.body;

        let receipt_url = existing.receipt_url;
        if (req.file) {
            receipt_url = `/uploads/receipts/${req.file.filename}`;
        } else if (req.body.receipt_url !== undefined) {
            receipt_url = req.body.receipt_url;
        }

        if (type !== undefined) existing.type = type;
        if (amount !== undefined) existing.amount = parseFloat(amount);
        if (category !== undefined) existing.category = category;
        if (subcategory !== undefined) existing.subcategory = subcategory;
        if (payment_method !== undefined) existing.payment_method = payment_method;
        if (description !== undefined) existing.description = description;
        if (transaction_date !== undefined) existing.transaction_date = transaction_date;
        existing.receipt_url = receipt_url;
        if (is_recurring !== undefined) existing.is_recurring = is_recurring === 'true' || is_recurring === true;
        if (recurring_frequency !== undefined) existing.recurring_frequency = recurring_frequency;

        await existing.save();

        return res.json({
            success: true,
            message: 'Transaction updated successfully.',
            data: existing.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/transactions/:id
exports.deleteTransaction = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const transactionId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(transactionId)) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found or unauthorized.'
            });
        }

        const deleted = await Transaction.findOneAndDelete({ _id: transactionId, user_id: userId });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found or unauthorized.'
            });
        }

        // Delete any child splits
        await Transaction.deleteMany({ parent_transaction_id: transactionId, user_id: userId });

        return res.json({
            success: true,
            message: 'Transaction deleted successfully.'
        });
    } catch (error) {
        next(error);
    }
};
