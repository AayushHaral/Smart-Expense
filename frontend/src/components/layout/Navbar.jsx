import React from 'react';
import { Menu, Sun, Moon, Plus } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export const Navbar = ({ setMobileOpen, pageTitle = 'Dashboard' }) => {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Add Transaction Button */}
        <Link
          to="/add-transaction"
          className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Add Transaction</span>
        </Link>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 transition-all duration-200"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Avatar Profile Badge */}
        <Link 
          to="/profile"
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
        </Link>
      </div>
    </header>
  );
};
