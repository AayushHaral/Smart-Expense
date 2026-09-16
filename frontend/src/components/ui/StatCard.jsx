import React from 'react';

export const StatCard = ({ title, amount, icon: Icon, color = 'brand', subtitle, trend }) => {
  const colorStyles = {
    brand: {
      bg: 'from-brand-500/10 to-brand-600/5 dark:from-brand-500/20 dark:to-brand-600/10',
      iconBg: 'bg-brand-500 text-white shadow-brand-500/30',
      border: 'border-brand-100 dark:border-brand-900/40',
      text: 'text-brand-600 dark:text-brand-400'
    },
    emerald: {
      bg: 'from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-600/10',
      iconBg: 'bg-emerald-500 text-white shadow-emerald-500/30',
      border: 'border-emerald-100 dark:border-emerald-900/40',
      text: 'text-emerald-600 dark:text-emerald-400'
    },
    rose: {
      bg: 'from-rose-500/10 to-rose-600/5 dark:from-rose-500/20 dark:to-rose-600/10',
      iconBg: 'bg-rose-500 text-white shadow-rose-500/30',
      border: 'border-rose-100 dark:border-rose-900/40',
      text: 'text-rose-600 dark:text-rose-400'
    },
    amber: {
      bg: 'from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10',
      iconBg: 'bg-amber-500 text-white shadow-amber-500/30',
      border: 'border-amber-100 dark:border-amber-900/40',
      text: 'text-amber-600 dark:text-amber-400'
    },
    indigo: {
      bg: 'from-indigo-500/10 to-indigo-600/5 dark:from-indigo-500/20 dark:to-indigo-600/10',
      iconBg: 'bg-indigo-500 text-white shadow-indigo-500/30',
      border: 'border-indigo-100 dark:border-indigo-900/40',
      text: 'text-indigo-600 dark:text-indigo-400'
    }
  };

  const style = colorStyles[color] || colorStyles.brand;

  const formattedAmount = typeof amount === 'number' 
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount)
    : amount;

  return (
    <div className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border ${style.border} shadow-card hover:shadow-card-hover transition-all duration-300 relative overflow-hidden group`}>
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-gradient-to-br ${style.bg} blur-xl group-hover:scale-125 transition-transform duration-500`} />
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</span>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center shadow-md`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{formattedAmount}</h3>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend.type === 'up' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'}`}>
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{subtitle}</p>
      )}
    </div>
  );
};
