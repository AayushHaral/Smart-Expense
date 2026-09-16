const db = require('../config/db');

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

        let query = 'SELECT * FROM transactions WHERE user_id = ?';
        let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?';
        const params = [userId];
        const countParams = [userId];

        if (type && type !== 'all') {
            query += ' AND type = ?';
            countQuery += ' AND type = ?';
            params.push(type);
            countParams.push(type);
        }

        if (category && category !== 'all') {
            query += ' AND category = ?';
            countQuery += ' AND category = ?';
            params.push(category);
            countParams.push(category);
        }

        if (subcategory && subcategory !== 'all') {
            query += ' AND subcategory = ?';
            countQuery += ' AND subcategory = ?';
            params.push(subcategory);
            countParams.push(subcategory);
        }

        if (is_recurring === 'true' || is_recurring === '1') {
            query += ' AND is_recurring = TRUE';
            countQuery += ' AND is_recurring = TRUE';
        }

        if (startDate) {
            query += ' AND transaction_date >= ?';
            countQuery += ' AND transaction_date >= ?';
            params.push(startDate);
            countParams.push(startDate);
        }

        if (endDate) {
            query += ' AND transaction_date <= ?';
            countQuery += ' AND transaction_date <= ?';
            params.push(endDate);
            countParams.push(endDate);
        }

        if (search && search.trim() !== '') {
            const searchPattern = `%${search.trim()}%`;
            query += ' AND (description LIKE ? OR category LIKE ? OR subcategory LIKE ? OR payment_method LIKE ?)';
            countQuery += ' AND (description LIKE ? OR category LIKE ? OR subcategory LIKE ? OR payment_method LIKE ?)';
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
            countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Sorting
        const allowedSortFields = ['transaction_date', 'amount', 'category', 'created_at'];
        const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'transaction_date';
        const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        query += ` ORDER BY ${safeSortBy} ${safeSortOrder}, id DESC`;

        // Pagination
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
        const offset = (pageNum - 1) * limitNum;

        query += ' LIMIT ? OFFSET ?';
        params.push(limitNum, offset);

        const transactions = await db.query(query, params);
        const countResult = await db.query(countQuery, countParams);
        const total = countResult[0].total;

        return res.json({
            success: true,
            data: transactions,
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
            const dailyTransactions = await db.query(
                'SELECT * FROM transactions WHERE user_id = ? AND transaction_date = ? ORDER BY id DESC',
                [userId, date]
            );

            const totals = await db.query(
                `SELECT 
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
                 FROM transactions 
                 WHERE user_id = ? AND transaction_date = ?`,
                [userId, date]
            );

            const income = parseFloat(totals[0].total_income || 0);
            const expense = parseFloat(totals[0].total_expense || 0);

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
                transactions: dailyTransactions
            });
        }

        // Return month-level day-by-day aggregations
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const dailyAggregates = await db.query(
            `SELECT 
                DATE_FORMAT(transaction_date, '%Y-%m-%d') as date,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
                COUNT(*) as count
             FROM transactions
             WHERE user_id = ? AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
             GROUP BY date
             ORDER BY date ASC`,
            [userId, monthStr]
        );

        const calendarMap = {};
        dailyAggregates.forEach(row => {
            calendarMap[row.date] = {
                income: parseFloat(row.income),
                expense: parseFloat(row.expense),
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

        const results = await db.query(
            'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
            [transactionId, userId]
        );

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found or unauthorized.'
            });
        }

        const transaction = results[0];

        // If parent transaction, fetch split items
        const splitItems = await db.query(
            'SELECT * FROM transactions WHERE parent_transaction_id = ? AND user_id = ?',
            [transactionId, userId]
        );

        return res.json({
            success: true,
            data: {
                ...transaction,
                split_items: splitItems
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
            split_items // Optional array of split items
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
        const result = await db.query(
            `INSERT INTO transactions 
             (user_id, type, amount, category, subcategory, payment_method, description, transaction_date, receipt_url, is_recurring, recurring_frequency)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, type, numericAmount, category, subcategory || null, finalPaymentMethod, finalDescription, transaction_date, receipt_url, isRec, recFreq]
        );

        const parentId = result.insertId;

        // Handle split transaction items if provided
        let parsedSplitItems = [];
        if (split_items) {
            try {
                parsedSplitItems = typeof split_items === 'string' ? JSON.parse(split_items) : split_items;
                if (Array.isArray(parsedSplitItems) && parsedSplitItems.length > 0) {
                    for (const item of parsedSplitItems) {
                        await db.query(
                            `INSERT INTO transactions 
                             (user_id, type, amount, category, subcategory, payment_method, description, transaction_date, parent_transaction_id)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [userId, type, parseFloat(item.amount), item.category, item.subcategory || null, finalPaymentMethod, item.description || finalDescription, transaction_date, parentId]
                        );
                    }
                }
            } catch (e) {
                console.error('Failed to parse split items:', e);
            }
        }

        const newTransaction = {
            id: parentId,
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
            recurring_frequency: recFreq,
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

        const existing = await db.query(
            'SELECT id, receipt_url FROM transactions WHERE id = ? AND user_id = ?',
            [transactionId, userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found or unauthorized.'
            });
        }

        let receipt_url = existing[0].receipt_url;
        if (req.file) {
            receipt_url = `/uploads/receipts/${req.file.filename}`;
        } else if (req.body.receipt_url !== undefined) {
            receipt_url = req.body.receipt_url;
        }

        const isRec = is_recurring !== undefined ? (is_recurring === 'true' || is_recurring === true) : undefined;

        await db.query(
            `UPDATE transactions 
             SET type = COALESCE(?, type),
                 amount = COALESCE(?, amount),
                 category = COALESCE(?, category),
                 subcategory = COALESCE(?, subcategory),
                 payment_method = COALESCE(?, payment_method),
                 description = COALESCE(?, description),
                 transaction_date = COALESCE(?, transaction_date),
                 receipt_url = ?,
                 is_recurring = COALESCE(?, is_recurring),
                 recurring_frequency = COALESCE(?, recurring_frequency)
             WHERE id = ? AND user_id = ?`,
            [type, amount, category, subcategory, payment_method, description, transaction_date, receipt_url, isRec, recurring_frequency, transactionId, userId]
        );

        const updated = await db.query('SELECT * FROM transactions WHERE id = ?', [transactionId]);

        return res.json({
            success: true,
            message: 'Transaction updated successfully.',
            data: updated[0]
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

        const result = await db.query(
            'DELETE FROM transactions WHERE id = ? AND user_id = ?',
            [transactionId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found or unauthorized.'
            });
        }

        return res.json({
            success: true,
            message: 'Transaction deleted successfully.'
        });
    } catch (error) {
        next(error);
    }
};
