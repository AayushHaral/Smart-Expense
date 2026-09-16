import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  X,
  FileText,
  DollarSign
} from 'lucide-react';
import API from '../../services/api';
import { Modal } from '../ui/Modal';
import { ReceiptModal } from '../transactions/ReceiptModal';

export const DashboardCalendar = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [calendarMap, setCalendarMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Selected date details state
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayDetails, setDayDetails] = useState(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [receiptTx, setReceiptTx] = useState(null);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const res = await API.get('/transactions/calendar', {
        params: { year, month: String(month).padStart(2, '0') }
      });
      if (res.data.success) {
        setCalendarMap(res.data.calendarData || {});
      }
    } catch (err) {
      console.error('Failed to fetch calendar summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [year, month]);

  const handleDateClick = async (dateStr) => {
    setSelectedDate(dateStr);
    setDayLoading(true);
    try {
      const res = await API.get('/transactions/calendar', {
        params: { date: dateStr }
      });
      if (res.data.success) {
        setDayDetails(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch day details:', err);
    } finally {
      setDayLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };

  // Calendar Grid Math
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-card space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Financial Calendar</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Click any date to inspect daily income & expenses</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <span className="text-xs font-bold text-slate-900 dark:text-white min-w-[100px] text-center">
            {monthNames[month - 1]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 text-center border-b border-slate-100 dark:border-slate-800 pb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading calendar data...</div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5 text-xs">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-20 rounded-xl bg-slate-50/30 dark:bg-slate-950/20 border border-transparent" />
          ))}

          {/* Actual Month Days */}
          {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
            const dayNum = dayIdx + 1;
            const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayData = calendarMap[dayStr];
            const isToday = dayStr === new Date().toISOString().substring(0, 10);

            return (
              <button
                key={dayStr}
                onClick={() => handleDateClick(dayStr)}
                className={`h-20 p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] ${
                  isToday
                    ? 'border-brand-500 bg-brand-500/5 dark:bg-brand-500/10 shadow-sm'
                    : dayData
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 hover:border-brand-300'
                    : 'border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {dayNum}
                  </span>
                  {dayData && (
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                  )}
                </div>

                {dayData ? (
                  <div className="space-y-0.5 overflow-hidden">
                    {dayData.income > 0 && (
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
                        +₹{dayData.income >= 1000 ? `${Math.round(dayData.income / 1000)}k` : dayData.income}
                      </div>
                    )}
                    {dayData.expense > 0 && (
                      <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 truncate">
                        -₹{dayData.expense >= 1000 ? `${Math.round(dayData.expense / 1000)}k` : dayData.expense}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-300 dark:text-slate-700 font-normal">-</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Date Details Modal */}
      <Modal
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={`Transactions on ${selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : ''}`}
        maxWidth="max-w-xl"
      >
        {dayLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Fetching date details...</div>
        ) : dayDetails ? (
          <div className="space-y-4 text-xs">
            {/* Daily Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <span className="text-[10px] font-semibold uppercase tracking-wider block">Income</span>
                <span className="text-base font-bold">₹{dayDetails.summary.income.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                <span className="text-[10px] font-semibold uppercase tracking-wider block">Expense</span>
                <span className="text-base font-bold">₹{dayDetails.summary.expense.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400">
                <span className="text-[10px] font-semibold uppercase tracking-wider block">Net Total</span>
                <span className="text-base font-bold">₹{dayDetails.summary.netBalance.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Day Transactions List */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs">Day Records ({dayDetails.summary.count})</h4>

              {dayDetails.transactions && dayDetails.transactions.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                  {dayDetails.transactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    return (
                      <div key={tx.id} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isIncome ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}>
                            {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {tx.category} {tx.subcategory ? `• ${tx.subcategory}` : ''}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {tx.description || tx.payment_method}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {tx.receipt_url && (
                            <button
                              onClick={() => setReceiptTx(tx)}
                              className="p-1 rounded-md text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                              title="View receipt image"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          <span className={`font-extrabold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isIncome ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400">No transactions recorded for this day</div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Receipt View Modal */}
      <ReceiptModal
        isOpen={!!receiptTx}
        onClose={() => setReceiptTx(null)}
        transaction={receiptTx}
      />
    </div>
  );
};
