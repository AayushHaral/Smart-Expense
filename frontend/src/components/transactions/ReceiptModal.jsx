import React from 'react';
import { Modal } from '../ui/Modal';
import { FileText, Download, Calendar, Tag, CreditCard, DollarSign } from 'lucide-react';

export const ReceiptModal = ({ isOpen, onClose, transaction }) => {
  if (!transaction) return null;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const serverBase = API_URL.replace(/\/api\/?$/, '');

  const receiptFullUrl = transaction.receipt_url
    ? (transaction.receipt_url.startsWith('http') ? transaction.receipt_url : `${serverBase}${transaction.receipt_url}`)
    : null;

  const isPdf = receiptFullUrl && receiptFullUrl.toLowerCase().endsWith('.pdf');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Receipt Details"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 text-xs">
        {/* Transaction Summary Banner */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Transaction Amount</span>
            <div className={`text-xl font-bold mt-0.5 ${transaction.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {transaction.type === 'income' ? '+' : '-'}₹{Number(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="text-right">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-500/10 text-brand-500">
              {transaction.category} {transaction.subcategory ? `• ${transaction.subcategory}` : ''}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              {new Date(transaction.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300">
          <div>
            <span className="text-slate-400 font-medium">Payment Method:</span>
            <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{transaction.payment_method}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Description:</span>
            <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{transaction.description || 'No description provided'}</p>
          </div>
        </div>

        {/* Receipt Display */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-950 p-2 min-h-[220px] flex flex-col items-center justify-center text-center">
          {receiptFullUrl ? (
            isPdf ? (
              <div className="py-8 space-y-3">
                <FileText className="w-12 h-12 text-brand-400 mx-auto" />
                <p className="text-xs text-slate-300 font-semibold">PDF Receipt Attached</p>
                <a
                  href={receiptFullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-white font-bold text-xs shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Receipt</span>
                </a>
              </div>
            ) : (
              <div className="relative group w-full">
                <img
                  src={receiptFullUrl}
                  alt="Uploaded Receipt"
                  className="max-h-72 w-full object-contain rounded-xl mx-auto"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <a
                    href={receiptFullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-lg flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Open Full Image
                  </a>
                </div>
              </div>
            )
          ) : (
            <div className="py-10 text-slate-500">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No receipt image attached to this record</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
