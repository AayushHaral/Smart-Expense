import React, { useState, useEffect } from 'react';
import { 
  PieChart as PieIcon, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Calendar,
  AlertCircle,
  History,
  TrendingDown,
  BarChart2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend 
} from 'recharts';

import { budgetService } from '../services/budgetService';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { EmptyState } from '../components/ui/EmptyState';
import { EXPENSE_CATEGORIES } from '../utils/categories';

export const Budgets = () => {
  const [period, setPeriod] = useState('monthly'); // 'monthly' | 'weekly'
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [budgetData, setBudgetData] = useState({ summary: {}, data: [] });
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);

  // Form state
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const [res, histRes] = await Promise.all([
        budgetService.getBudgets(month, period),
        budgetService.getBudgets(month) // placeholder or history call
      ]);

      if (res.success) {
        setBudgetData(res);
      }
    } catch (err) {
      setToast({ message: 'Failed to fetch budgets.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [month, period]);

  const handleOpenCreate = () => {
    setSelectedBudget(null);
    setCategory(EXPENSE_CATEGORIES[0]);
    setAmount('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b) => {
    setSelectedBudget(b);
    setCategory(b.category);
    setAmount(b.amount);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenDelete = (b) => {
    setSelectedBudget(b);
    setIsDeleteModalOpen(true);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    setFormError('');

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Budget amount must be a positive number greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await budgetService.createOrUpdateBudget({
        category,
        amount: numericAmount,
        month,
        period
      });

      if (res.success) {
        setIsModalOpen(false);
        setToast({ message: 'Budget saved successfully!', type: 'success' });
        fetchBudgets();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save budget.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedBudget) return;
    try {
      const res = await budgetService.deleteBudget(selectedBudget.id);
      if (res.success) {
        setIsDeleteModalOpen(false);
        setToast({ message: 'Budget deleted successfully!', type: 'success' });
        fetchBudgets();
      }
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to delete budget.', type: 'error' });
    }
  };

  const { summary, data: budgets } = budgetData;

  const totalUsedPercent = summary?.percentageUsed || 0;
  const isTotalOverBudget = totalUsedPercent >= 100;
  const isTotalWarning = totalUsedPercent >= 80 && totalUsedPercent < 100;

  return (
    <div className="space-y-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Budget System & History</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage weekly and monthly targets, compare planned vs actual spending</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                period === 'monthly'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                period === 'weekly'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Weekly
            </button>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-sm">
            <Calendar className="w-4 h-4 text-brand-500" />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
            />
          </div>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Set Budget</span>
          </button>
        </div>
      </div>

      {/* Total Monthly Overview Banner */}
      <div className={`p-6 rounded-3xl border ${
        isTotalOverBudget 
          ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' 
          : isTotalWarning 
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' 
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      } shadow-card`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total {period} Budget Summary ({month})</span>
            <div className="flex items-baseline gap-3 mt-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                ₹{(summary?.totalSpent || 0).toLocaleString('en-IN')}
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                of ₹{(summary?.totalBudget || 0).toLocaleString('en-IN')} total limit
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Remaining Budget</span>
            <p className={`text-xl font-bold ${(summary?.remaining || 0) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              ₹{(summary?.remaining || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3.5 overflow-hidden mb-2">
          <div 
            className={`h-full transition-all duration-500 rounded-full ${
              isTotalOverBudget ? 'bg-rose-500' : isTotalWarning ? 'bg-amber-500' : 'bg-brand-500'
            }`}
            style={{ width: `${Math.min(100, totalUsedPercent)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-semibold">
          <span>{totalUsedPercent}% Budget Used</span>
          <span>{summary?.totalBudget > 0 ? `${100 - Math.min(100, totalUsedPercent)}% Left` : 'No Budget Configured'}</span>
        </div>
      </div>

      {/* Category Budgets Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs text-slate-400">Loading budget data...</span>
        </div>
      ) : budgets && budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => {
            const isExceeded = b.isExceeded;
            const isWarning = b.isWarning;

            return (
              <div 
                key={b.id}
                className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border ${
                  isExceeded 
                    ? 'border-rose-200 dark:border-rose-900/60 shadow-rose-500/5' 
                    : isWarning 
                    ? 'border-amber-200 dark:border-amber-900/60 shadow-amber-500/5' 
                    : 'border-slate-200/80 dark:border-slate-800'
                } shadow-card hover:shadow-card-hover transition-all duration-300 relative group`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-900 dark:text-white text-base">{b.category}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(b)}
                      className="p-1 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit budget"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDelete(b)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Delete budget"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Spent / Budget:</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      ₹{b.spent.toLocaleString('en-IN')} <span className="font-normal text-slate-400 text-xs">/ ₹{b.amount.toLocaleString('en-IN')}</span>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-brand-500'
                      }`}
                      style={{ width: `${Math.min(100, b.percentageUsed)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className={isExceeded ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-slate-500'}>
                      {b.exactPercentage}% Used
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Remaining: <span className={b.remaining < 0 ? 'text-rose-500 font-bold' : 'text-slate-700 dark:text-slate-300 font-bold'}>₹{b.remaining.toLocaleString('en-IN')}</span>
                    </span>
                  </div>
                </div>

                {/* Status Warning Pill */}
                {isExceeded && (
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Budget limit exceeded!</span>
                  </div>
                )}
                {isWarning && (
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Approaching budget limit ({b.exactPercentage}%)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={`No ${period} budgets set for this period`}
          description="Start managing your finances by adding category-wise budget targets."
          action={
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 rounded-xl bg-brand-500 text-white font-semibold text-xs shadow-md"
            >
              Set Your First Budget
            </button>
          }
        />
      )}

      {/* Planned vs Actual Budget Comparison Graph */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-brand-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Compare Planned vs Actual Category Spending</h3>
          </div>
        </div>

        {budgets && budgets.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415522" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff' }}
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="amount" name="Planned Budget Target" fill="#0c8de9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" name="Actual Spent Amount" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">Set category budgets to visualize planned vs actual comparison</div>
        )}
      </div>

      {/* Set / Edit Budget Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedBudget ? `Edit ${selectedBudget.category} Budget` : "Set Category Budget"}
      >
        <form onSubmit={handleSaveBudget} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Budget Frequency</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold outline-none"
            >
              <option value="monthly">Monthly Budget</option>
              <option value="weekly">Weekly Budget</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Month</label>
            <input
              type="month"
              required
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Expense Category</label>
            <select
              value={category}
              disabled={!!selectedBudget}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold outline-none disabled:opacity-70"
            >
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Budget Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-brand-500 text-white font-bold shadow-md shadow-brand-500/20 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Budget'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Budget"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Are you sure you want to delete the <span className="font-bold text-slate-900 dark:text-white">{selectedBudget?.category}</span> budget of ₹{selectedBudget?.amount}?
          </p>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-5 py-2 rounded-xl bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20"
            >
              Delete Budget
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
