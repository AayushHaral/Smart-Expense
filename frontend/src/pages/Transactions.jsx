import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  X,
  Calendar,
  FileText,
  Repeat,
  Upload
} from 'lucide-react';
import { transactionService } from '../services/transactionService';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { EmptyState } from '../components/ui/EmptyState';
import { ReceiptModal } from '../components/transactions/ReceiptModal';
import { 
  EXPENSE_CATEGORIES, 
  INCOME_CATEGORIES, 
  SUBCATEGORIES_MAP, 
  PAYMENT_METHODS 
} from '../utils/categories';

export const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Filters State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [isRecurringFilter, setIsRecurringFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('transaction_date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [currentPage, setCurrentPage] = useState(1);

  // Receipt Lightbox State
  const [receiptTx, setReceiptTx] = useState(null);

  // Edit / Delete Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  // Edit Form Data
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: 'Food',
    subcategory: 'Groceries',
    payment_method: 'Cash',
    description: '',
    transaction_date: '',
    is_recurring: false,
    recurring_frequency: 'monthly'
  });
  const [editReceiptFile, setEditReceiptFile] = useState(null);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await transactionService.getTransactions({
        type: typeFilter,
        category: categoryFilter,
        subcategory: subcategoryFilter,
        search,
        startDate,
        endDate,
        is_recurring: isRecurringFilter ? 'true' : 'false',
        sortBy,
        sortOrder,
        page: currentPage,
        limit: 10
      });

      if (res.success) {
        setTransactions(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      setToast({ message: 'Failed to fetch transactions.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, categoryFilter, subcategoryFilter, isRecurringFilter, search, startDate, endDate, sortBy, sortOrder, currentPage]);

  const handleOpenEdit = (tx) => {
    setSelectedTx(tx);
    setFormData({
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      subcategory: tx.subcategory || '',
      payment_method: tx.payment_method || 'Cash',
      description: tx.description || '',
      transaction_date: tx.transaction_date.substring(0, 10),
      is_recurring: !!tx.is_recurring,
      recurring_frequency: tx.recurring_frequency || 'monthly'
    });
    setEditReceiptFile(null);
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (tx) => {
    setSelectedTx(tx);
    setIsDeleteModalOpen(true);
  };

  const handleCategoryChange = (newCat) => {
    const subCats = SUBCATEGORIES_MAP[newCat] || [];
    setFormData(p => ({
      ...p,
      category: newCat,
      subcategory: subCats[0] || ''
    }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }

    setFormSubmitting(true);
    try {
      const updateData = new FormData();
      updateData.append('type', formData.type);
      updateData.append('amount', formData.amount);
      updateData.append('category', formData.category);
      updateData.append('subcategory', formData.subcategory);
      updateData.append('payment_method', formData.payment_method);
      updateData.append('description', formData.description);
      updateData.append('transaction_date', formData.transaction_date);
      updateData.append('is_recurring', formData.is_recurring);
      updateData.append('recurring_frequency', formData.recurring_frequency);

      if (editReceiptFile) {
        updateData.append('receipt', editReceiptFile);
      }

      const res = await transactionService.updateTransaction(selectedTx.id, updateData);
      if (res.success) {
        setIsEditModalOpen(false);
        setToast({ message: 'Transaction updated successfully!', type: 'success' });
        fetchTransactions();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update transaction.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTx) return;
    try {
      const res = await transactionService.deleteTransaction(selectedTx.id);
      if (res.success) {
        setIsDeleteModalOpen(false);
        setToast({ message: 'Transaction deleted successfully!', type: 'success' });
        fetchTransactions();
      }
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to delete transaction.', type: 'error' });
    }
  };

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setIsRecurringFilter(false);
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const availableEditCategories = formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const availableEditSubcategories = SUBCATEGORIES_MAP[formData.category] || [];

  return (
    <div className="space-y-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Transactions Management</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Search, filter, view receipts, and manage all cash flow records</p>
        </div>
        <a
          href="/add-transaction"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Transaction</span>
        </a>
      </div>

      {/* Search & Multi-Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search description, subcategory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-brand-500 outline-none"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-brand-500 outline-none"
            >
              <option value="all">All Types (Income & Expenses)</option>
              <option value="income">Income Only</option>
              <option value="expense">Expenses Only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-brand-500 outline-none"
            >
              <option value="all">All Categories</option>
              {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-brand-500 outline-none"
            >
              <option value="transaction_date-DESC">Date: Newest First</option>
              <option value="transaction_date-ASC">Date: Oldest First</option>
              <option value="amount-DESC">Amount: Highest First</option>
              <option value="amount-ASC">Amount: Lowest First</option>
            </select>
          </div>
        </div>

        {/* Sub-Filters: Date Range & Recurring Checkbox */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Dates:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 font-semibold">
              <input
                type="checkbox"
                checked={isRecurringFilter}
                onChange={(e) => setIsRecurringFilter(e.target.checked)}
                className="rounded text-brand-500"
              />
              <span>Recurring Only</span>
            </label>
          </div>

          {(search || typeFilter !== 'all' || categoryFilter !== 'all' || isRecurringFilter || startDate || endDate) && (
            <button
              onClick={clearFilters}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-400">Loading records...</span>
          </div>
        ) : transactions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Subcategory</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">Method</th>
                    <th className="py-3.5 px-4 text-center">Receipt</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {transactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {new Date(tx.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span>{tx.category}</span>
                            {tx.is_recurring && (
                              <span className="p-0.5 rounded bg-brand-500/10 text-brand-500" title={`Recurring (${tx.recurring_frequency})`}>
                                <Repeat className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          {tx.subcategory ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px]">
                              {tx.subcategory}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {tx.description || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {tx.payment_method}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {tx.receipt_url ? (
                            <button
                              onClick={() => setReceiptTx(tx)}
                              className="p-1 rounded-md text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                              title="View uploaded receipt"
                            >
                              <FileText className="w-4 h-4 mx-auto" />
                            </button>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isIncome ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {isIncome ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(tx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit record"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(tx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Delete record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Showing <span className="font-bold text-slate-800 dark:text-slate-200">{transactions.length}</span> of <span className="font-bold text-slate-800 dark:text-slate-200">{pagination.total}</span> records
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>
                <button
                  disabled={currentPage >= pagination.totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title="No transactions found"
            description="Try changing your search terms or filter criteria."
          />
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Transaction"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, type: 'expense' }))}
                className={`py-2 rounded-xl font-bold ${formData.type === 'expense' ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, type: 'income' }))}
                className={`py-2 rounded-xl font-bold ${formData.type === 'income' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
              >
                Income
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              >
                {availableEditCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subcategory</label>
              <select
                value={formData.subcategory}
                onChange={(e) => setFormData(p => ({ ...p, subcategory: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              >
                {availableEditSubcategories.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData(p => ({ ...p, payment_method: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Transaction Date</label>
            <input
              type="date"
              required
              value={formData.transaction_date}
              onChange={(e) => setFormData(p => ({ ...p, transaction_date: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
            />
          </div>

          {/* Replace Receipt File */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Update Receipt File</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setEditReceiptFile(e.target.files[0])}
              className="w-full text-slate-500 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2 rounded-xl bg-brand-500 text-white font-bold shadow-md shadow-brand-500/20 disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Delete"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Are you sure you want to delete this transaction of <span className="font-bold text-rose-500">₹{selectedTx?.amount}</span> ({selectedTx?.category})?
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-5 py-2 rounded-xl bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Receipt Lightbox Modal */}
      <ReceiptModal
        isOpen={!!receiptTx}
        onClose={() => setReceiptTx(null)}
        transaction={receiptTx}
      />
    </div>
  );
};
