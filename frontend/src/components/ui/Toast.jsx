import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const typeConfig = {
    success: {
      bg: 'bg-emerald-500 text-white',
      icon: CheckCircle2
    },
    error: {
      bg: 'bg-rose-500 text-white',
      icon: AlertCircle
    },
    info: {
      bg: 'bg-brand-500 text-white',
      icon: Info
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl transition-all duration-300 transform translate-y-0 animate-bounce-subtle">
      <div className={`flex items-center gap-2.5 ${config.bg} px-4 py-2.5 rounded-xl shadow-lg font-medium text-sm`}>
        <Icon className="w-5 h-5 shrink-0" />
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 opacity-80 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
