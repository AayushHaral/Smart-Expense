const db = require('../config/db');

// GET /api/reports/monthly
exports.getMonthlyReport = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const year = req.query.year || new Date().getFullYear();

        const monthlyData = await db.query(
            `SELECT 
                DATE_FORMAT(transaction_date, '%m') as month_num,
                DATE_FORMAT(transaction_date, '%b') as month_name,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
             FROM transactions
             WHERE user_id = ? AND YEAR(transaction_date) = ?
             GROUP BY DATE_FORMAT(transaction_date, '%m'), DATE_FORMAT(transaction_date, '%b')
             ORDER BY DATE_FORMAT(transaction_date, '%m') ASC`,
            [userId, year]
        );

        return res.json({
            success: true,
            year: parseInt(year, 10),
            data: monthlyData.map(d => ({
                month: d.month_name,
                income: parseFloat(d.income),
                expense: parseFloat(d.expense),
                savings: parseFloat(d.income) - parseFloat(d.expense)
            }))
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/reports/category
exports.getCategoryReport = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate, type = 'expense' } = req.query;

        let query = `
            SELECT category, SUM(amount) as total_amount, COUNT(*) as transaction_count
            FROM transactions
            WHERE user_id = ? AND type = ?
        `;
        const params = [userId, type];

        if (startDate) {
            query += ' AND transaction_date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND transaction_date <= ?';
            params.push(endDate);
        }

        query += ' GROUP BY category ORDER BY total_amount DESC';

        const categoryData = await db.query(query, params);

        return res.json({
            success: true,
            data: categoryData.map(item => ({
                category: item.category,
                amount: parseFloat(item.total_amount),
                count: item.transaction_count
            }))
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/reports/income-expense
exports.getIncomeExpenseReport = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { period = 'monthly', startDate, endDate } = req.query; // 'daily', 'weekly', 'monthly', 'yearly'

        let dateFormat = '%Y-%m';
        if (period === 'daily') dateFormat = '%Y-%m-%d';
        else if (period === 'weekly') dateFormat = '%Y-%u';
        else if (period === 'yearly') dateFormat = '%Y';

        let query = `
            SELECT 
                DATE_FORMAT(transaction_date, '${dateFormat}') as period_key,
                MIN(transaction_date) as sample_date,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
            FROM transactions
            WHERE user_id = ?
        `;
        const params = [userId];

        if (startDate) {
            query += ' AND transaction_date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND transaction_date <= ?';
            params.push(endDate);
        }

        query += ` GROUP BY DATE_FORMAT(transaction_date, '${dateFormat}') ORDER BY period_key ASC`;

        const rawData = await db.query(query, params);

        // Overall statistics
        const statsQuery = `
            SELECT 
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
                COUNT(DISTINCT transaction_date) as active_days
            FROM transactions
            WHERE user_id = ?
            ${startDate ? 'AND transaction_date >= ?' : ''}
            ${endDate ? 'AND transaction_date <= ?' : ''}
        `;
        const statsParams = [userId];
        if (startDate) statsParams.push(startDate);
        if (endDate) statsParams.push(endDate);

        const statsResult = await db.query(statsQuery, statsParams);
        const totalExpense = parseFloat(statsResult[0].total_expense || 0);
        const totalIncome = parseFloat(statsResult[0].total_income || 0);
        const activeDays = parseInt(statsResult[0].active_days || 1, 10);
        const avgDailySpending = activeDays > 0 ? (totalExpense / activeDays) : 0;

        // Highest spending categories
        const highestCatQuery = `
            SELECT category, SUM(amount) as total
            FROM transactions
            WHERE user_id = ? AND type = 'expense'
            ${startDate ? 'AND transaction_date >= ?' : ''}
            ${endDate ? 'AND transaction_date <= ?' : ''}
            GROUP BY category
            ORDER BY total DESC
            LIMIT 5
        `;
        const highestCatData = await db.query(highestCatQuery, statsParams);

        return res.json({
            success: true,
            period,
            timeline: rawData.map(r => ({
                period: r.period_key,
                date: r.sample_date,
                income: parseFloat(r.income),
                expense: parseFloat(r.expense),
                net: parseFloat(r.income) - parseFloat(r.expense)
            })),
            analytics: {
                totalIncome,
                totalExpense,
                netSavings: totalIncome - totalExpense,
                avgDailySpending,
                highestSpendingCategories: highestCatData.map(h => ({
                    category: h.category,
                    total: parseFloat(h.total)
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};
