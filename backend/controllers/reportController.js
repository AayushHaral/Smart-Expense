const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// Helper month names
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// GET /api/reports/monthly
exports.getMonthlyReport = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const year = req.query.year || new Date().getFullYear();
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const yearStr = String(year);

        const monthlyData = await Transaction.aggregate([
            {
                $match: {
                    user_id: userObjectId,
                    transaction_date: { $regex: `^${yearStr}` }
                }
            },
            {
                $project: {
                    month_num: { $substrCP: ["$transaction_date", 5, 2] },
                    type: 1,
                    amount: 1
                }
            },
            {
                $group: {
                    _id: "$month_num",
                    income: {
                        $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] }
                    },
                    expense: {
                        $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const map = {};
        monthlyData.forEach(d => {
            map[d._id] = { income: d.income, expense: d.expense };
        });

        const resultData = [];
        for (let m = 1; m <= 12; m++) {
            const mKey = String(m).padStart(2, '0');
            const d = map[mKey] || { income: 0, expense: 0 };
            const monthName = monthNames[m - 1];
            resultData.push({
                month: monthName,
                income: parseFloat(d.income),
                expense: parseFloat(d.expense),
                savings: parseFloat(d.income) - parseFloat(d.expense)
            });
        }

        return res.json({
            success: true,
            year: parseInt(year, 10),
            data: resultData
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

        const match = {
            user_id: new mongoose.Types.ObjectId(userId),
            type
        };

        if (startDate || endDate) {
            match.transaction_date = {};
            if (startDate) match.transaction_date.$gte = startDate;
            if (endDate) match.transaction_date.$lte = endDate;
        }

        const categoryData = await Transaction.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$category",
                    total_amount: { $sum: "$amount" },
                    transaction_count: { $sum: 1 }
                }
            },
            { $sort: { total_amount: -1 } }
        ]);

        return res.json({
            success: true,
            data: categoryData.map(item => ({
                category: item._id,
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
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const match = { user_id: userObjectId };
        if (startDate || endDate) {
            match.transaction_date = {};
            if (startDate) match.transaction_date.$gte = startDate;
            if (endDate) match.transaction_date.$lte = endDate;
        }

        let keySubstrLength = 7; // Default 'monthly' (YYYY-MM)
        if (period === 'daily') keySubstrLength = 10; // (YYYY-MM-DD)
        else if (period === 'yearly') keySubstrLength = 4; // (YYYY)

        const rawTimeline = await Transaction.aggregate([
            { $match: match },
            {
                $project: {
                    period_key: { $substrCP: ["$transaction_date", 0, keySubstrLength] },
                    transaction_date: 1,
                    type: 1,
                    amount: 1
                }
            },
            {
                $group: {
                    _id: "$period_key",
                    sample_date: { $min: "$transaction_date" },
                    income: {
                        $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] }
                    },
                    expense: {
                        $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Overall statistics
        const statsResult = await Transaction.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    total_income: {
                        $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] }
                    },
                    total_expense: {
                        $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] }
                    },
                    distinct_dates: { $addToSet: "$transaction_date" }
                }
            }
        ]);

        const totalIncome = statsResult.length > 0 ? parseFloat(statsResult[0].total_income || 0) : 0;
        const totalExpense = statsResult.length > 0 ? parseFloat(statsResult[0].total_expense || 0) : 0;
        const activeDays = statsResult.length > 0 ? Math.max(1, statsResult[0].distinct_dates.length) : 1;
        const avgDailySpending = totalExpense / activeDays;

        // Highest spending categories
        const highestMatch = { ...match, type: 'expense' };
        const highestCatData = await Transaction.aggregate([
            { $match: highestMatch },
            {
                $group: {
                    _id: "$category",
                    total: { $sum: "$amount" }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 5 }
        ]);

        return res.json({
            success: true,
            period,
            timeline: rawTimeline.map(r => ({
                period: r._id,
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
                    category: h._id,
                    total: parseFloat(h.total)
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};
