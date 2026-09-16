const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const mongoose = require('mongoose');

// Helper to get abbreviated month name (e.g., "Jan", "Sep")
const getMonthAbbr = (dateObj) => {
    return dateObj.toLocaleString('en-US', { month: 'short' });
};

// Helper to get day name (e.g., "Mon", "Tue")
const getDayAbbr = (dateObj) => {
    return dateObj.toLocaleString('en-US', { weekday: 'short' });
};

// GET /api/dashboard/summary
exports.getDashboardSummary = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const currentYear = now.getFullYear();
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
        const currentMonthStr = `${currentYear}-${currentMonth}`;

        const userObjectId = new mongoose.Types.ObjectId(userId);

        // 1. Total Income & Total Expenses
        const totalsResult = await Transaction.aggregate([
            { $match: { user_id: userObjectId } },
            {
                $group: {
                    _id: null,
                    total_income: {
                        $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] }
                    },
                    total_expense: {
                        $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] }
                    }
                }
            }
        ]);

        const totalIncome = totalsResult.length > 0 ? parseFloat(totalsResult[0].total_income || 0) : 0;
        const totalExpense = totalsResult.length > 0 ? parseFloat(totalsResult[0].total_expense || 0) : 0;
        const totalBalance = totalIncome - totalExpense;
        const savings = Math.max(0, totalBalance);
        const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 1000) / 10) : 0;

        // 2. Today's Spending
        const todayResult = await Transaction.aggregate([
            {
                $match: {
                    user_id: userObjectId,
                    type: 'expense',
                    transaction_date: todayStr
                }
            },
            {
                $group: {
                    _id: null,
                    today_spending: { $sum: "$amount" }
                }
            }
        ]);
        const todaySpending = todayResult.length > 0 ? parseFloat(todayResult[0].today_spending || 0) : 0;

        // 3. This Week's Spending
        const startOfWeek = new Date(now);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

        const weekResult = await Transaction.aggregate([
            {
                $match: {
                    user_id: userObjectId,
                    type: 'expense',
                    transaction_date: { $gte: startOfWeekStr }
                }
            },
            {
                $group: {
                    _id: null,
                    week_spending: { $sum: "$amount" }
                }
            }
        ]);
        const thisWeekSpending = weekResult.length > 0 ? parseFloat(weekResult[0].week_spending || 0) : 0;

        // 4. Current Month Expense
        const currentMonthExpenseResult = await Transaction.aggregate([
            {
                $match: {
                    user_id: userObjectId,
                    type: 'expense',
                    transaction_date: { $regex: `^${currentMonthStr}` }
                }
            },
            {
                $group: {
                    _id: null,
                    current_month_expense: { $sum: "$amount" }
                }
            }
        ]);
        const currentMonthExpense = currentMonthExpenseResult.length > 0 ? parseFloat(currentMonthExpenseResult[0].current_month_expense || 0) : 0;

        // 5. Current Month Budget & Remaining Budget
        const budgetResult = await Budget.aggregate([
            {
                $match: {
                    user_id: userObjectId,
                    month: currentMonthStr,
                    period: 'monthly'
                }
            },
            {
                $group: {
                    _id: null,
                    total_budget: { $sum: "$amount" }
                }
            }
        ]);
        const monthlyBudget = budgetResult.length > 0 ? parseFloat(budgetResult[0].total_budget || 0) : 0;
        const remainingBudget = monthlyBudget - currentMonthExpense;

        // 6. Recent 5 Transactions
        const recentTransactionsDocs = await Transaction.find({ user_id: userId })
            .sort({ transaction_date: -1, _id: -1 })
            .limit(5);
        const recentTransactions = recentTransactionsDocs.map(t => t.toJSON());

        // 7. Income vs Expense (Last 6 Months)
        const monthsList = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const ymCode = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
            monthsList.push({ ymCode, monthLabel });
        }

        const sixMonthsAgoStr = monthsList[0].ymCode;

        const monthlyComparisonRaw = await Transaction.aggregate([
            {
                $match: {
                    user_id: userObjectId,
                    transaction_date: { $gte: `${sixMonthsAgoStr}-01` }
                }
            },
            {
                $project: {
                    ym_code: { $substrCP: ["$transaction_date", 0, 7] },
                    type: 1,
                    amount: 1
                }
            },
            {
                $group: {
                    _id: "$ym_code",
                    income: {
                        $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] }
                    },
                    expense: {
                        $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] }
                    }
                }
            }
        ]);

        const monthlyMap = {};
        monthlyComparisonRaw.forEach(row => {
            monthlyMap[row._id] = { income: row.income, expense: row.expense };
        });

        const monthlyComparison = monthsList.map(m => {
            const data = monthlyMap[m.ymCode] || { income: 0, expense: 0 };
            return {
                ym_code: m.ymCode,
                month_label: m.monthLabel,
                income: data.income,
                expense: data.expense
            };
        });

        // 8. Expense by Category (Current Month)
        const categoryExpensesRaw = await Transaction.aggregate([
            {
                $match: {
                    user_id: userObjectId,
                    type: 'expense',
                    transaction_date: { $regex: `^${currentMonthStr}` }
                }
            },
            {
                $group: {
                    _id: "$category",
                    total_amount: { $sum: "$amount" }
                }
            },
            { $sort: { total_amount: -1 } }
        ]);

        const categoryExpenses = categoryExpensesRaw.map(c => ({
            category: c._id,
            amount: parseFloat(c.total_amount)
        }));

        // 9. Weekly Spending (Last 7 Days)
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayAbbr = getDayAbbr(d);
            last7Days.push({ dateStr, dayAbbr });
        }

        const sevenDaysAgoStr = last7Days[0].dateStr;

        const weeklySpendingRaw = await Transaction.aggregate([
            {
                $match: {
                    user_id: userObjectId,
                    transaction_date: { $gte: sevenDaysAgoStr }
                }
            },
            {
                $group: {
                    _id: "$transaction_date",
                    expense: {
                        $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] }
                    },
                    income: {
                        $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] }
                    }
                }
            }
        ]);

        const weeklyMap = {};
        weeklySpendingRaw.forEach(r => {
            weeklyMap[r._id] = { expense: r.expense, income: r.income };
        });

        const weeklySpending = last7Days.map(item => {
            const d = weeklyMap[item.dateStr] || { expense: 0, income: 0 };
            return {
                day: item.dayAbbr,
                date: item.dateStr,
                expense: parseFloat(d.expense),
                income: parseFloat(d.income)
            };
        });

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
                categoryExpenses,
                weeklySpending
            }
        });
    } catch (error) {
        next(error);
    }
};
