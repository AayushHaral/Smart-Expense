import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon, 
  PieChart as PieIcon, 
  Plus, 
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Zap,
  Clock,
  FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';

import { dashboardService } from '../services/dashboardService';
import { StatCard } from '../components/ui/StatCard';
import { DashboardCalendar } from '../components/dashboard/DashboardCalendar';
import { ReceiptModal } from '../components/transactions/ReceiptModal';

const CATEGORY_COLORS = {
  Food: '#f59e0b',
  Shopping: '#ec4899',
  Transport: '#06b6d4',
  Bills: '#ef4444',
  Entertainment: '#8b5cf6',
  Health: '#10b981',
  Education: '#3b82f6',
  Travel: '#6366f1',
  Other: '#64748b'
};

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receiptTx, setReceiptTx] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getSummary();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Calculating financial metrics & savings rates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const { summary, recentTransactions, charts } = data;

  const budgetUsedPercentage = summary.monthlyBudget > 0
    ? Math.min(100, Math.round((summary.currentMonthExpense / summary.monthlyBudget) * 100))
    : 0;

  const isBudgetWarning = budgetUsedPercentage >= 80 && budgetUsedPercentage < 100;
  const isBudgetExceeded = budgetUsedPercentage >= 100;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-brand-500/20">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Smart Financial Dashboard</h2>
          <p className="text-xs sm:text-sm text-brand-100 mt-1">Real-time balances, burn rates, and savings analytics</p>
        </div>
        <Link
          to="/add-transaction"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-brand-700 hover:bg-brand-50 font-bold text-sm shadow-md transition-all duration-200 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Transaction</span>
        </Link>
      </div>

      {/* Row 1: Primary Balance & Savings Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Balance"
          amount={summary.totalBalance}
          icon={Wallet}
          color="brand"
          subtitle="Net financial worth"
        />
        <StatCard
          title="Total Income"
          amount={summary.totalIncome}
          icon={TrendingUp}
          color="emerald"
          subtitle="Lifetime total earnings"
        />
        <StatCard
          title="Total Expenses"
          amount={summary.totalExpenses}
          icon={TrendingDown}
          color="rose"
          subtitle="Lifetime total outflows"
        />
        <StatCard
          title="Savings & Rate"
          amount={summary.savings}
          icon={DollarSign}
          color="indigo"
          subtitle={`Savings Rate: ${summary.savingsRate}%`}
        />
      </div>

      {/* Row 2: Granular Spending Period Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase mb-1">
            <span>Today's Spending</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            ₹{summary.todaySpending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Burn rate for today</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase mb-1">
            <span>This Week's Spending</span>
            <Clock className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            ₹{summary.thisWeekSpending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Current week total</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase mb-1">
            <span>This Month's Spending</span>
            <CalendarIcon className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            ₹{summary.currentMonthExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Current month total</span>
        </div>
      </div>

      {/* Budget Progress Widget */}
      {summary.monthlyBudget > 0 && (
        <div className={`p-5 rounded-2xl border ${
          isBudgetExceeded
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
            : isBudgetWarning
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
        } shadow-card transition-all`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <PieIcon className={`w-5 h-5 ${isBudgetExceeded ? 'text-rose-500' : isBudgetWarning ? 'text-amber-500' : 'text-brand-500'}`} />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Budget Usage</h3>
            </div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              ₹{summary.currentMonthExpense.toLocaleString('en-IN')} spent of ₹{summary.monthlyBudget.toLocaleString('en-IN')} budget
            </div>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden mb-2">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                isBudgetExceeded ? 'bg-rose-500' : isBudgetWarning ? 'bg-amber-500' : 'bg-brand-500'
              }`} 
              style={{ width: `${budgetUsedPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-medium">
            <span className={isBudgetExceeded ? 'text-rose-600 dark:text-rose-400 font-bold' : isBudgetWarning ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500'}>
              {budgetUsedPercentage}% Used
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Remaining: <span className="font-bold text-slate-800 dark:text-slate-200">₹{summary.remainingBudget.toLocaleString('en-IN')}</span>
            </span>
          </div>
        </div>
      )}

      {/* Interactive Calendar Widget */}
      <DashboardCalendar />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Income vs Expense (Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-2xl shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Income vs Expenses (Past 6 Months)</h3>
          </div>
          <div className="h-64 w-full">
            {charts.monthlyComparison && charts.monthlyComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.monthlyComparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415522" />
                  <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff' }} 
                    formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No monthly data recorded yet</div>
            )}
          </div>
        </div>

        {/* Chart 2: Category Expense Breakdown (Pie Chart) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-2xl shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Expense Distribution (Current Month)</h3>
          </div>
          <div className="h-64 w-full">
            {charts.categoryExpenses && charts.categoryExpenses.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.categoryExpenses}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {charts.categoryExpenses.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CATEGORY_COLORS[entry.category] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff' }}
                    formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No expenses recorded for current month</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Latest activity in your account</p>
          </div>
          <Link
            to="/transactions"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentTransactions && recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3 text-center">Receipt</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {recentTransactions.map((tx) => {
                  const isIncome = tx.type === 'income';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300">
                        {new Date(tx.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                          {tx.category} {tx.subcategory ? `• ${tx.subcategory}` : ''}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-slate-500 dark:text-slate-400">
                        {tx.description || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                        {tx.payment_method}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {tx.receipt_url ? (
                          <button
                            onClick={() => setReceiptTx(tx)}
                            className="p-1 rounded-md text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                            title="View receipt"
                          >
                            <FileText className="w-4 h-4 mx-auto" />
                          </button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        <span className={`inline-flex items-center gap-1 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isIncome ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {isIncome ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No transactions found. <Link to="/add-transaction" className="text-brand-500 hover:underline">Add your first transaction</Link>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!receiptTx}
        onClose={() => setReceiptTx(null)}
        transaction={receiptTx}
      />
    </div>
  );
};
