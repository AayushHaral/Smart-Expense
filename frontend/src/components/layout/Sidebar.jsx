import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  Users,
  PlusCircle, 
  PieChart, 
  BarChart3, 
  User, 
  LogOut, 
  X,
  Wallet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navigationItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', path: '/transactions', icon: Receipt },
  { name: 'Roommates', path: '/roommates', icon: Users },
  { name: 'Add Transaction', path: '/add-transaction', icon: PlusCircle },
  { name: 'Budgets', path: '/budgets', icon: PieChart },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'Profile', path: '/profile', icon: User },
];

export const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-lg tracking-tight leading-none">SmartExpense</h1>
            <span className="text-xs font-medium text-brand-600 dark:text-brand-400">Finance Tracker</span>
          </div>
        </div>
        {mobileOpen && (
          <button 
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 lg:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-4 py-6 overflow-y-auto space-y-1.5">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-3 mb-2">Main Menu</div>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* User Footer Profile & Logout */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 mb-3">
          <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center text-sm border border-brand-200 dark:border-brand-700/30">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.full_name || 'User'}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email || ''}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed top-0 left-0 bottom-0 w-64 z-30">
        <NavContent />
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside className={`fixed top-0 left-0 bottom-0 w-72 z-50 transform lg:hidden transition-transform duration-300 ease-in-out ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <NavContent />
      </aside>
    </>
  );
};
