import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

const getPageTitle = (pathname) => {
  switch (pathname) {
    case '/dashboard': return 'Financial Dashboard';
    case '/transactions': return 'Transactions History';
    case '/add-transaction': return 'Record New Transaction';
    case '/budgets': return 'Monthly Budgets';
    case '/reports': return 'Analytics & Reports';
    case '/profile': return 'User Profile';
    default: return 'Smart Expense Tracker';
  }
};

export const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Navbar setMobileOpen={setMobileOpen} pageTitle={pageTitle} />
        
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
