import React from 'react';
import { FolderOpen } from 'lucide-react';

export const EmptyState = ({ title = 'No records found', description = 'There are no items matching your criteria yet.', icon: Icon = FolderOpen, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 shadow-inner">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">{description}</p>
      {action && action}
    </div>
  );
};
