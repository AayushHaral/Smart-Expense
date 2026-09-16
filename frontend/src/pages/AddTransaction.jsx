import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  ArrowLeft, 
  AlertCircle, 
  Upload, 
  Repeat, 
  Split, 
  Trash2, 
  Plus, 
  FileText,
  Check
} from 'lucide-react';
import { transactionService } from '../services/transactionService';
import { 
  EXPENSE_CATEGORIES, 
  INCOME_CATEGORIES, 
  SUBCATEGORIES_MAP, 
  RECURRING_TYPES, 
  PAYMENT_METHODS 
} from '../utils/categories';

export const AddTransaction = () => {
  const navigate = useNavigate();
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [subcategory, setSubcategory] = useState('Groceries');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().substring(0, 10));
  const [description, setDescription] = useState('');
  
  // Receipt Upload State
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  // Recurring Payment State
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');

  // Split Transaction State
  const [isSplit, setIsSplit] = useState(false);
  const [splitItems, setSplitItems] = useState([
    { amount: '', category: 'Food', subcategory: 'Groceries', description: '' },
    { amount: '', category: 'Shopping', subcategory: 'Clothing', description: '' }
  ]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTypeChange = (newType) => {
    setType(newType);
    const newCat = newType === 'income' ? 'Salary' : 'Food';
    setCategory(newCat);
    setSubcategory(SUBCATEGORIES_MAP[newCat]?.[0] || '');
  };

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    const subCats = SUBCATEGORIES_MAP[newCat] || [];
    setSubcategory(subCats[0] || '');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Receipt file size must be less than 5MB.');
        return;
      }
      setReceiptFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setReceiptPreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview(null);
      }
    }
  };

  const handleRecurringShortcut = (recType) => {
    setIsRecurring(true);
    setCategory(recType.category);
    const subCats = SUBCATEGORIES_MAP[recType.category] || [];
    setSubcategory(subCats.includes(recType.subcategory) ? recType.subcategory : subCats[0] || '');
    setDescription(recType.label);
  };

  const addSplitItem = () => {
    setSplitItems(prev => [
      ...prev,
      { amount: '', category: 'Food', subcategory: 'Groceries', description: '' }
    ]);
  };

  const removeSplitItem = (idx) => {
    setSplitItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSplitItemChange = (idx, field, value) => {
    setSplitItems(prev => {
      const updated = [...prev];
      updated[idx][field] = value;
      if (field === 'category') {
        const subs = SUBCATEGORIES_MAP[value] || [];
        updated[idx].subcategory = subs[0] || '';
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid total amount greater than 0.');
      return;
    }

    if (isSplit) {
      const totalSplit = splitItems.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      if (Math.abs(totalSplit - numericAmount) > 0.01) {
        setError(`Split items sum (₹${totalSplit}) must equal total amount (₹${numericAmount}).`);
        return;
      }
    }

    setLoading(true);

    try {
      // Use FormData to send receipt file + form values
      const formData = new FormData();
      formData.append('type', type);
      formData.append('amount', numericAmount);
      formData.append('category', category);
      formData.append('subcategory', subcategory);
      formData.append('payment_method', paymentMethod);
      formData.append('transaction_date', transactionDate);
      formData.append('description', description);
      formData.append('is_recurring', isRecurring);
      formData.append('recurring_frequency', recurringFrequency);

      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      if (isSplit && splitItems.length > 0) {
        formData.append('split_items', JSON.stringify(splitItems));
      }

      const res = await transactionService.createTransaction(formData);
      if (res.success) {
        navigate('/transactions');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record transaction.');
    } finally {
      setLoading(false);
    }
  };

  const availableCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const availableSubcategories = SUBCATEGORIES_MAP[category] || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Record New Transaction</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Add income, expenses, recurring payments, receipts or split payments</p>
        </div>
      </div>

      {/* Quick Recurring Payment Shortcuts */}
      {type === 'expense' && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Quick Recurring Payment Shortcuts
          </span>
          <div className="flex flex-wrap gap-2">
            {RECURRING_TYPES.map(rec => (
              <button
                key={rec.label}
                type="button"
                onClick={() => handleRecurringShortcut(rec)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-600 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all"
              >
                + {rec.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Form Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-card">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                  type === 'expense'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                  type === 'income'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Total Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-lg font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                required
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-lg font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
              >
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Subcategory
              </label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
              >
                {availableSubcategories.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            {/* Transaction Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Transaction Date
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Description / Notes
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly rent or electricity payment"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Advanced Features Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Recurring Payment Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-brand-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Recurring Payment</span>
                </div>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
              </div>

              {isRecurring && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Frequency</label>
                  <select
                    value={recurringFrequency}
                    onChange={(e) => setRecurringFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}
            </div>

            {/* Split Transaction Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Split className="w-4 h-4 text-brand-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Split Transaction</span>
                </div>
                <input
                  type="checkbox"
                  checked={isSplit}
                  onChange={(e) => setIsSplit(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Split total amount across multiple category line items
              </p>
            </div>
          </div>

          {/* Split Items Builder UI */}
          {isSplit && (
            <div className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-brand-700 dark:text-brand-300">Split Items Allocations</h4>
                <button
                  type="button"
                  onClick={addSplitItem}
                  className="px-2.5 py-1 rounded-lg bg-brand-500 text-white font-semibold text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Line Item
                </button>
              </div>

              {splitItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center">
                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount (₹)"
                      value={item.amount}
                      onChange={(e) => handleSplitItemChange(idx, 'amount', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <select
                      value={item.category}
                      onChange={(e) => handleSplitItemChange(idx, 'category', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    >
                      {availableCategories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Note"
                      value={item.description}
                      onChange={(e) => handleSplitItemChange(idx, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeSplitItem(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Receipt Image Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Attach Receipt Image / PDF
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-center bg-slate-50/50 dark:bg-slate-800/30 hover:border-brand-500 transition-colors relative cursor-pointer">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {receiptPreview ? (
                <div className="relative inline-block max-h-40 overflow-hidden rounded-xl">
                  <img src={receiptPreview} alt="Receipt Preview" className="max-h-40 mx-auto object-cover rounded-xl" />
                  <span className="absolute top-2 right-2 px-2 py-1 rounded-md bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Attached
                  </span>
                </div>
              ) : receiptFile ? (
                <div className="py-3 flex items-center justify-center gap-2 text-xs font-semibold text-brand-500">
                  <FileText className="w-5 h-5" />
                  <span>{receiptFile.name}</span>
                </div>
              ) : (
                <div className="py-4 space-y-1.5">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Click or drag & drop receipt file here
                  </p>
                  <p className="text-[11px] text-slate-400">Supports PNG, JPG, WEBP or PDF up to 5MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <PlusCircle className="w-5 h-5" />
                  <span>Save Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
