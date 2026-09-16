import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Award,
  Filter
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

import { reportService } from '../services/reportService';
import { StatCard } from '../components/ui/StatCard';
import { Toast } from '../components/ui/Toast';

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

export const Reports = () => {
  const [period, setPeriod] = useState('monthly'); // 'daily', 'weekly', 'monthly', 'yearly'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [reportData, setReportData] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [incomeExpenseRes, categoryRes] = await Promise.all([
        reportService.getIncomeExpenseReport({ period, startDate, endDate }),
        reportService.getCategoryReport({ startDate, endDate, type: 'expense' })
      ]);

      if (incomeExpenseRes.success) {
        setReportData(incomeExpenseRes);
      }
      if (categoryRes.success) {
        setCategoryData(categoryRes.data);
      }
    } catch (err) {
      setToast({ message: 'Failed to generate financial reports.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period, startDate, endDate]);

  const { analytics, timeline } = reportData || {};

  return (
    <div className="space-y-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Analytics & Reports</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Deep financial insights, category distribution, and time trends</p>
        </div>

        {/* Date Filters & Period Switcher */}
        <div className="flex flex-wrap items-center gap-3 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {['daily', 'weekly', 'monthly', 'yearly'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  period === p
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs outline-none"
            />
          </div>
        </div>
      </div>

      {/* Analytical Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Period Income"
          amount={analytics?.totalIncome || 0}
          icon={TrendingUp}
          color="emerald"
          subtitle="Total inflows in selected range"
        />
        <StatCard
          title="Period Expenses"
          amount={analytics?.totalExpense || 0}
          icon={TrendingDown}
          color="rose"
          subtitle="Total outflows in selected range"
        />
        <StatCard
          title="Net Savings"
          amount={analytics?.netSavings || 0}
          icon={DollarSign}
          color="brand"
          subtitle="Surplus (Income - Expenses)"
        />
        <StatCard
          title="Avg Daily Spending"
          amount={analytics?.avgDailySpending || 0}
          icon={Calendar}
          color="amber"
          subtitle="Average burn rate per active day"
        />
      </div>

      {/* Main Charts */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs text-slate-400">Generating analytical charts...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Income vs Expense Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cash Flow Timeline ({period.toUpperCase()})</h3>
            </div>
            <div className="h-72 w-full">
              {timeline && timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415522" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff' }}
                      formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No data found for this timeframe</div>
              )}
            </div>
          </div>

          {/* Chart 2: Category Expenses Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Category Expense Breakdown</h3>
            </div>
            <div className="h-72 w-full">
              {categoryData && categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {categoryData.map((entry, index) => (
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
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No expenses recorded</div>
              )}
            </div>
          </div>

          {/* Leaderboard Table: Highest Spending Categories */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-card lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Highest Spending Categories</h3>
            </div>

            {categoryData && categoryData.length > 0 ? (
              <div className="space-y-3">
                {categoryData.slice(0, 5).map((item, idx) => {
                  const maxAmount = categoryData[0].amount;
                  const percentage = maxAmount > 0 ? Math.round((item.amount / maxAmount) * 100) : 0;

                  return (
                    <div key={item.category} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-500 font-bold flex items-center justify-center text-[11px]">
                            #{idx + 1}
                          </span>
                          <span className="text-slate-900 dark:text-white">{item.category}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({item.count} transactions)</span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">No expense categories to display</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
