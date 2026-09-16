const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// GET /api/budgets
exports.getBudgets = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const period = req.query.period || 'monthly';
        const month = req.query.month || new Date().toISOString().substring(0, 7);

        // Fetch defined budgets for this user, month, and period
        const budgets = await Budget.find({
            user_id: userId,
            month,
            period
        }).sort({ category: 1 });

        // Fetch actual expenses per category for this month
        const actualExpenses = await Transaction.aggregate([
            {
                $match: {
                    user_id: new mongoose.Types.ObjectId(userId),
                    type: 'expense',
                    transaction_date: { $regex: `^${month}` }
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
        actualExpenses.forEach(item => {
            spentMap[item._id] = parseFloat(item.spent || 0);
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

        // Get unique months from budgets for this user
        const budgetMonths = await Budget.aggregate([
            {
                $match: {
                    user_id: new mongoose.Types.ObjectId(userId),
                    period
                }
            },
            {
                $group: {
                    _id: "$month",
                    planned_budget: { $sum: "$amount" }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 6 }
        ]);

        const historyList = [];
        for (const bm of budgetMonths) {
            const monthStr = bm._id;
            const planned = parseFloat(bm.planned_budget || 0);

            const spentAgg = await Transaction.aggregate([
                {
                    $match: {
                        user_id: new mongoose.Types.ObjectId(userId),
                        type: 'expense',
                        transaction_date: { $regex: `^${monthStr}` }
                    }
                },
                {
                    $group: {
                        _id: null,
                        actual_spent: { $sum: "$amount" }
                    }
                }
            ]);

            const actual = spentAgg.length > 0 ? parseFloat(spentAgg[0].actual_spent) : 0;

            historyList.push({
                month: monthStr,
                planned,
                actual,
                variance: planned - actual
            });
        }

        return res.json({
            success: true,
            history: historyList
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

        const updatedBudget = await Budget.findOneAndUpdate(
            { user_id: userId, category, month: targetMonth, period },
            { amount: numericAmount },
            { upsert: true, new: true, runValidators: true }
        );

        return res.status(201).json({
            success: true,
            message: 'Budget saved successfully.',
            data: updatedBudget.toJSON()
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

        if (!mongoose.Types.ObjectId.isValid(budgetId)) {
            return res.status(404).json({ success: false, message: 'Budget not found or unauthorized.' });
        }

        const existing = await Budget.findOne({ _id: budgetId, user_id: userId });

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Budget not found or unauthorized.' });
        }

        existing.amount = numericAmount;
        if (category) existing.category = category;
        if (month) existing.month = month;
        if (period) existing.period = period;

        await existing.save();

        return res.json({
            success: true,
            message: 'Budget updated successfully.',
            data: existing.toJSON()
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

        if (!mongoose.Types.ObjectId.isValid(budgetId)) {
            return res.status(404).json({ success: false, message: 'Budget not found or unauthorized.' });
        }

        const deleted = await Budget.findOneAndDelete({ _id: budgetId, user_id: userId });

        if (!deleted) {
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
