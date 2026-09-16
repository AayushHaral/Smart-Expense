const db = require('../config/db');

// GET /api/budgets
exports.getBudgets = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const period = req.query.period || 'monthly';
        const month = req.query.month || new Date().toISOString().substring(0, 7); // YYYY-MM or YYYY-Www

        // Fetch defined budgets for this user, month, and period
        const budgets = await db.query(
            'SELECT * FROM budgets WHERE user_id = ? AND month = ? AND period = ? ORDER BY category ASC',
            [userId, month, period]
        );

        // Fetch actual expenses per category for this month
        const actualExpenses = await db.query(
            `SELECT category, SUM(amount) as spent
             FROM transactions
             WHERE user_id = ? AND type = 'expense' 
               AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
             GROUP BY category`,
            [userId, month]
        );

        const spentMap = {};
        actualExpenses.forEach(item => {
            spentMap[item.category] = parseFloat(item.spent || 0);
        });

        const budgetList = budgets.map(b => {
            const budgetAmount = parseFloat(b.amount);
            const spentAmount = spentMap[b.category] || 0;
            const remaining = budgetAmount - spentAmount;
            const percentageUsed = budgetAmount > 0 ? Math.min(100, (spentAmount / budgetAmount) * 100) : 0;
            const exactPercentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

            return {
                id: b.id,
                category: b.category,
                amount: budgetAmount,
                spent: spentAmount,
                remaining,
                percentageUsed: Math.round(percentageUsed * 10) / 10,
                exactPercentage: Math.round(exactPercentage * 10) / 10,
                month: b.month,
                period: b.period,
                isWarning: exactPercentage >= 80 && exactPercentage < 100,
                isExceeded: exactPercentage >= 100
            };
        });

        const totalBudget = budgetList.reduce((acc, curr) => acc + curr.amount, 0);
        const totalSpent = budgetList.reduce((acc, curr) => acc + curr.spent, 0);

        return res.json({
            success: true,
            month,
            period,
            summary: {
                totalBudget,
                totalSpent,
                remaining: totalBudget - totalSpent,
                percentageUsed: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 1000) / 10 : 0
            },
            data: budgetList
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/budgets/history
exports.getBudgetHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const period = req.query.period || 'monthly';

        // Query past 6 months of budget totals vs actual spending
        const historyData = await db.query(
            `SELECT 
                b.month,
                SUM(b.amount) as planned_budget,
                (
                    SELECT SUM(t.amount) 
                    FROM transactions t 
                    WHERE t.user_id = b.user_id 
                      AND t.type = 'expense' 
                      AND DATE_FORMAT(t.transaction_date, '%Y-%m') = b.month
                ) as actual_spent
             FROM budgets b
             WHERE b.user_id = ? AND b.period = ?
             GROUP BY b.month
             ORDER BY b.month DESC
             LIMIT 6`,
            [userId, period]
        );

        return res.json({
            success: true,
            history: historyData.map(h => {
                const planned = parseFloat(h.planned_budget || 0);
                const actual = parseFloat(h.actual_spent || 0);
                return {
                    month: h.month,
                    planned,
                    actual,
                    variance: planned - actual
                };
            })
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/budgets
exports.createOrUpdateBudget = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { category, amount, month, period = 'monthly' } = req.body;

        if (!category) {
            return res.status(400).json({ success: false, message: 'Category is required.' });
        }

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Budget amount must be a positive number.' });
        }

        const targetMonth = month || new Date().toISOString().substring(0, 7);

        await db.query(
            `INSERT INTO budgets (user_id, category, amount, month, period)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = CURRENT_TIMESTAMP`,
            [userId, category, numericAmount, targetMonth, period]
        );

        const result = await db.query(
            'SELECT * FROM budgets WHERE user_id = ? AND category = ? AND month = ? AND period = ?',
            [userId, category, targetMonth, period]
        );

        return res.status(201).json({
            success: true,
            message: 'Budget saved successfully.',
            data: result[0]
        });
    } catch (error) {
        next(error);
    }
};

// PUT /api/budgets/:id
exports.updateBudget = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const budgetId = req.params.id;
        const { amount, category, month, period } = req.body;

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be greater than 0.' });
        }

        const existing = await db.query(
            'SELECT id FROM budgets WHERE id = ? AND user_id = ?',
            [budgetId, userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Budget not found or unauthorized.' });
        }

        await db.query(
            `UPDATE budgets
             SET amount = ?,
                 category = COALESCE(?, category),
                 month = COALESCE(?, month),
                 period = COALESCE(?, period)
             WHERE id = ? AND user_id = ?`,
            [numericAmount, category, month, period, budgetId, userId]
        );

        const updated = await db.query('SELECT * FROM budgets WHERE id = ?', [budgetId]);

        return res.json({
            success: true,
            message: 'Budget updated successfully.',
            data: updated[0]
        });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/budgets/:id
exports.deleteBudget = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const budgetId = req.params.id;

        const result = await db.query(
            'DELETE FROM budgets WHERE id = ? AND user_id = ?',
            [budgetId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Budget not found or unauthorized.' });
        }

        return res.json({
            success: true,
            message: 'Budget deleted successfully.'
        });
    } catch (error) {
        next(error);
    }
};
