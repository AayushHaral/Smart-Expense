const db = require('../config/db');

// GET /api/dashboard/summary
exports.getDashboardSummary = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        const currentYear = now.getFullYear();
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
        const currentMonthStr = `${currentYear}-${currentMonth}`;

        // 1. Total Income & Total Expenses
        const totalsResult = await db.query(
            `SELECT 
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
             FROM transactions 
             WHERE user_id = ?`,
            [userId]
        );

        const totalIncome = parseFloat(totalsResult[0].total_income || 0);
        const totalExpense = parseFloat(totalsResult[0].total_expense || 0);
        const totalBalance = totalIncome - totalExpense;
        const savings = Math.max(0, totalBalance);
        const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 1000) / 10) : 0;

        // 2. Today's Spending
        const todayResult = await db.query(
            `SELECT SUM(amount) as today_spending 
             FROM transactions 
             WHERE user_id = ? AND type = 'expense' AND transaction_date = ?`,
            [userId, todayStr]
        );
        const todaySpending = parseFloat(todayResult[0].today_spending || 0);

        // 3. This Week's Spending
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

        const weekResult = await db.query(
            `SELECT SUM(amount) as week_spending 
             FROM transactions 
             WHERE user_id = ? AND type = 'expense' AND transaction_date >= ?`,
            [userId, startOfWeekStr]
        );
        const thisWeekSpending = parseFloat(weekResult[0].week_spending || 0);

        // 4. Current Month Expense
        const currentMonthExpenseResult = await db.query(
            `SELECT SUM(amount) as current_month_expense 
             FROM transactions 
             WHERE user_id = ? AND type = 'expense' 
               AND DATE_FORMAT(transaction_date, '%Y-%m') = ?`,
            [userId, currentMonthStr]
        );
        const currentMonthExpense = parseFloat(currentMonthExpenseResult[0].current_month_expense || 0);

        // 5. Current Month Budget & Remaining Budget
        const budgetResult = await db.query(
            `SELECT SUM(amount) as total_budget 
             FROM budgets 
             WHERE user_id = ? AND month = ? AND period = 'monthly'`,
            [userId, currentMonthStr]
        );
        const monthlyBudget = parseFloat(budgetResult[0].total_budget || 0);
        const remainingBudget = monthlyBudget - currentMonthExpense;

        // 6. Recent 5 Transactions
        const recentTransactions = await db.query(
            `SELECT * FROM transactions 
             WHERE user_id = ? 
             ORDER BY transaction_date DESC, id DESC 
             LIMIT 5`,
            [userId]
        );

        // 7. Income vs Expense (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        const startDateStr = sixMonthsAgo.toISOString().split('T')[0];

        const monthlyComparison = await db.query(
            `SELECT 
                DATE_FORMAT(transaction_date, '%b %Y') as month_label,
                DATE_FORMAT(transaction_date, '%Y-%m') as ym_code,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
             FROM transactions
             WHERE user_id = ? AND transaction_date >= ?
             GROUP BY DATE_FORMAT(transaction_date, '%Y-%m'), DATE_FORMAT(transaction_date, '%b %Y')
             ORDER BY DATE_FORMAT(transaction_date, '%Y-%m') ASC`,
            [userId, startDateStr]
        );

        // 8. Expense by Category (Current Month)
        const categoryExpenses = await db.query(
            `SELECT 
                category, 
                SUM(amount) as total_amount
             FROM transactions 
             WHERE user_id = ? AND type = 'expense' 
               AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
             GROUP BY category
             ORDER BY total_amount DESC`,
            [userId, currentMonthStr]
        );

        // 9. Weekly Spending (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        const weeklySpending = await db.query(
            `SELECT 
                DATE_FORMAT(transaction_date, '%a') as day,
                transaction_date,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income
             FROM transactions
             WHERE user_id = ? AND transaction_date >= ?
             GROUP BY transaction_date, DATE_FORMAT(transaction_date, '%a')
             ORDER BY transaction_date ASC`,
            [userId, sevenDaysAgoStr]
        );

        return res.json({
            success: true,
            summary: {
                totalBalance,
                totalIncome,
                totalExpenses: totalExpense,
                savings,
                savingsRate,
                todaySpending,
                thisWeekSpending,
                currentMonthExpense,
                thisMonthSpending: currentMonthExpense,
                monthlyBudget,
                remainingBudget
            },
            recentTransactions,
            charts: {
                monthlyComparison,
                categoryExpenses: categoryExpenses.map(c => ({
                    category: c.category,
                    amount: parseFloat(c.total_amount)
                })),
                weeklySpending: weeklySpending.map(w => ({
                    day: w.day,
                    date: w.transaction_date,
                    expense: parseFloat(w.expense),
                    income: parseFloat(w.income)
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};
