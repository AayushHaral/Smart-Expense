import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  UserPlus, 
  Copy, 
  Check, 
  DollarSign, 
  PieChart as PieIcon, 
  FileText, 
  ArrowRight, 
  Trash2, 
  AlertCircle, 
  Bell,
  Split,
  Calendar,
  CheckCircle2,
  LogOut,
  Upload,
  BarChart2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';

import { roomService } from '../services/roomService';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ReceiptModal } from '../components/transactions/ReceiptModal';
import { EXPENSE_CATEGORIES } from '../utils/categories';
import { useAuth } from '../context/AuthContext';

const DEFAULT_COLORS = ['#0c8de9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export const Roommates = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [roomDetails, setRoomDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'expenses', 'balances', 'budgets', 'members'
  
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [copiedCode, setCopiedCode] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Data States
  const [sharedExpenses, setSharedExpenses] = useState([]);
  const [balancesData, setBalancesData] = useState(null);
  const [sharedBudgets, setSharedBudgets] = useState([]);

  // Modals
  const [isCreateRoomModal, setIsCreateRoomModal] = useState(false);
  const [isJoinRoomModal, setIsJoinRoomModal] = useState(false);
  const [isAddExpenseModal, setIsAddExpenseModal] = useState(false);
  const [isSettleModal, setIsSettleModal] = useState(false);
  const [isBudgetModal, setIsBudgetModal] = useState(false);
  const [receiptTx, setReceiptTx] = useState(null);

  // Form States
  const [newRoomName, setNewRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  // Add Shared Expense Form
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expDate, setExpDate] = useState(new Date().toISOString().substring(0, 10));
  const [expPaidBy, setExpPaidBy] = useState('');
  const [expSplitMethod, setExpSplitMethod] = useState('equal'); // 'equal', 'custom', 'percentage', 'shares'
  const [expDescription, setExpDescription] = useState('');
  const [expReceiptFile, setExpReceiptFile] = useState(null);
  const [memberSplits, setMemberSplits] = useState([]);

  // Settle Up Form
  const [settlePayeeId, setSettlePayeeId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNotes, setSettleNotes] = useState('');

  // Shared Budget Form
  const [budgetCat, setBudgetCat] = useState(EXPENSE_CATEGORIES[0]);
  const [budgetAmt, setBudgetAmt] = useState('');
  const [budgetMonth, setBudgetMonth] = useState(new Date().toISOString().substring(0, 7));

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch Rooms
  const fetchMyRooms = async () => {
    setLoading(true);
    try {
      const res = await roomService.getMyRooms();
      if (res.success) {
        setRooms(res.rooms);
        if (res.rooms.length > 0 && !selectedRoomId) {
          setSelectedRoomId(res.rooms[0].id);
        }
      }
    } catch (err) {
      setToast({ message: 'Failed to load roommate groups.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const res = await roomService.getNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMyRooms();
    fetchNotifications();
  }, []);

  // Fetch Room Specific Data when selectedRoomId changes
  const fetchRoomData = async () => {
    if (!selectedRoomId) return;
    setLoading(true);
    try {
      const [detailsRes, expensesRes, balancesRes, budgetsRes] = await Promise.all([
        roomService.getRoomDetails(selectedRoomId),
        roomService.getSharedExpenses(selectedRoomId),
        roomService.getRoomBalances(selectedRoomId),
        roomService.getSharedBudgets(selectedRoomId, budgetMonth)
      ]);

      if (detailsRes.success) setRoomDetails(detailsRes);
      if (expensesRes.success) setSharedExpenses(expensesRes.expenses);
      if (balancesRes.success) setBalancesData(balancesRes);
      if (budgetsRes.success) setSharedBudgets(budgetsRes.budgets);
    } catch (err) {
      setToast({ message: 'Failed to load room details.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomData();
  }, [selectedRoomId, budgetMonth]);

  // Handle Room Creation
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!newRoomName) return;

    setSubmitting(true);
    try {
      const res = await roomService.createRoom(newRoomName);
      if (res.success) {
        setIsCreateRoomModal(false);
        setNewRoomName('');
        setToast({ message: `Room '${res.room.name}' created!`, type: 'success' });
        setSelectedRoomId(res.room.id);
        fetchMyRooms();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create room.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Join Room
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!joinCode) return;

    setSubmitting(true);
    try {
      const res = await roomService.joinRoom(joinCode);
      if (res.success) {
        setIsJoinRoomModal(false);
        setJoinCode('');
        setToast({ message: res.message, type: 'success' });
        setSelectedRoomId(res.room.id);
        fetchMyRooms();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to join room.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Add Shared Expense Modal & Init Member Splits
  const handleOpenAddExpense = () => {
    if (!roomDetails?.members) return;
    setExpTitle('');
    setExpAmount('');
    setExpCategory(EXPENSE_CATEGORIES[0]);
    setExpDate(new Date().toISOString().substring(0, 10));
    setExpPaidBy(user?.id || roomDetails.members[0]?.user_id);
    setExpSplitMethod('equal');
    setExpDescription('');
    setExpReceiptFile(null);
    setFormError('');

    // Init splits per member
    setMemberSplits(roomDetails.members.map(m => ({
      user_id: m.user_id,
      full_name: m.full_name,
      amount_owed: '',
      percentage: Math.round(100 / roomDetails.members.length),
      shares: 1
    })));

    setIsAddExpenseModal(true);
  };

  // Handle Shared Expense Creation
  const handleSaveSharedExpense = async (e) => {
    e.preventDefault();
    setFormError('');

    const numericAmount = parseFloat(expAmount);
    if (!expTitle || isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Please enter a valid title and total amount.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', expTitle);
      formData.append('amount', numericAmount);
      formData.append('category', expCategory);
      formData.append('description', expDescription);
      formData.append('expense_date', expDate);
      formData.append('paid_by_user_id', expPaidBy);
      formData.append('split_method', expSplitMethod);
      formData.append('splits', JSON.stringify(memberSplits));

      if (expReceiptFile) {
        formData.append('receipt', expReceiptFile);
      }

      const res = await roomService.createSharedExpense(selectedRoomId, formData);
      if (res.success) {
        setIsAddExpenseModal(false);
        setToast({ message: 'Shared expense added!', type: 'success' });
        fetchRoomData();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add shared expense.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Settlement
  const handleRecordSettlement = async (e) => {
    e.preventDefault();
    setFormError('');

    const numericAmount = parseFloat(settleAmount);
    if (!settlePayeeId || isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Please select recipient and enter a valid settlement amount.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await roomService.recordSettlement(selectedRoomId, {
        payee_id: settlePayeeId,
        amount: numericAmount,
        notes: settleNotes
      });

      if (res.success) {
        setIsSettleModal(false);
        setToast({ message: 'Settlement payment recorded!', type: 'success' });
        fetchRoomData();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to record settlement.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Shared Budget Save
  const handleSaveSharedBudget = async (e) => {
    e.preventDefault();
    setFormError('');

    const numericAmount = parseFloat(budgetAmt);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Please enter a valid budget amount.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await roomService.createOrUpdateSharedBudget(selectedRoomId, {
        category: budgetCat,
        amount: numericAmount,
        month: budgetMonth
      });

      if (res.success) {
        setIsBudgetModal(false);
        setToast({ message: 'Shared budget saved!', type: 'success' });
        fetchRoomData();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save shared budget.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteCode = () => {
    if (!roomDetails?.room?.invite_code) return;
    navigator.clipboard.writeText(roomDetails.room.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Category chart data
  const categoryChartData = Object.values(
    sharedExpenses.reduce((acc, curr) => {
      const cat = curr.category;
      acc[cat] = acc[cat] || { category: cat, amount: 0 };
      acc[cat].amount += parseFloat(curr.amount);
      return acc;
    }, {})
  );

  const currentRoom = rooms.find(r => String(r.id) === String(selectedRoomId)) || roomDetails?.room;
  const myBalanceObj = balancesData?.memberBalances?.find(m => m.user_id === user?.id);

  return (
    <div className="space-y-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* Header & Room Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Roommates & Shared Expenses</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage group bills, split payments, smart settlements, and shared budgets</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Room Selector Dropdown */}
          {rooms.length > 0 && (
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none"
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.invite_code})</option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsJoinRoomModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Join Room</span>
          </button>

          <button
            onClick={() => setIsCreateRoomModal(true)}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Room</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 relative"
            >
              <Bell className="w-4 h-4" />
              {notifications.some(n => !n.is_read) && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-1" />
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-3 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Roommate Activity</span>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 text-[11px]">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div key={n.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
                        {n.message}
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-slate-400">No notifications</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {rooms.length === 0 ? (
        <EmptyState
          title="You aren't in any Roommate Group yet"
          description="Create a new room or join an existing room with an invite code to split shared bills!"
          action={
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setIsCreateRoomModal(true)}
                className="px-4 py-2 rounded-xl bg-brand-500 text-white font-bold text-xs"
              >
                Create Room
              </button>
              <button
                onClick={() => setIsJoinRoomModal(true)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs"
              >
                Join with Code
              </button>
            </div>
          }
        />
      ) : (
        <>
          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
            {[
              { id: 'dashboard', name: 'Room Dashboard' },
              { id: 'expenses', name: 'Shared Expenses' },
              { id: 'balances', name: 'Balances & Settle Up' },
              { id: 'budgets', name: 'Shared Budgets' },
              { id: 'members', name: 'Members & Invite Code' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-500 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* TAB 1: Room Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Financial Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Group Expenses"
                  amount={sharedExpenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0)}
                  icon={PieIcon}
                  color="brand"
                  subtitle="Total shared spending in group"
                />
                <StatCard
                  title="Your Total Paid"
                  amount={myBalanceObj?.totalPaid || 0}
                  icon={TrendingUp}
                  color="emerald"
                  subtitle="Amount paid out of your pocket"
                />
                <StatCard
                  title="Your Share Owed"
                  amount={myBalanceObj?.totalOwed || 0}
                  icon={TrendingDown}
                  color="amber"
                  subtitle="Your calculated split share"
                />
                <StatCard
                  title="Your Net Balance"
                  amount={balancesData?.userNetBalance || 0}
                  icon={DollarSign}
                  color={(balancesData?.userNetBalance || 0) >= 0 ? 'emerald' : 'rose'}
                  subtitle={(balancesData?.userNetBalance || 0) >= 0 ? 'Amount you should receive' : 'Amount you owe to group'}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Spending by Category Chart */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-card">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Shared Expenses by Category</h3>
                  <div className="h-64 w-full">
                    {categoryChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryChartData}
                            dataKey="amount"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                          >
                            {categoryChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff' }}
                            formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">No shared expenses recorded</div>
                    )}
                  </div>
                </div>

                {/* Quick Settle Up Recommendation Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-card flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Smart Debt Minimization</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Optimized settlement transactions for this room</p>

                    <div className="space-y-2">
                      {balancesData?.smartSettlements && balancesData.smartSettlements.length > 0 ? (
                        balancesData.smartSettlements.map((s, idx) => (
                          <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 font-medium">
                              <span className="font-bold text-rose-500">{s.from_name}</span>
                              <span className="text-slate-400">owes</span>
                              <span className="font-bold text-emerald-500">{s.to_name}</span>
                            </div>
                            <span className="font-extrabold text-slate-900 dark:text-white">₹{s.amount.toLocaleString('en-IN')}</span>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-400">Everyone is all settled up! 🎉</div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (balancesData?.smartSettlements?.length > 0) {
                        const s = balancesData.smartSettlements[0];
                        setSettlePayeeId(s.to_user_id);
                        setSettleAmount(s.amount);
                      }
                      setIsSettleModal(true);
                    }}
                    className="w-full mt-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Record Settle Up Payment</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Shared Expenses List */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Shared Expense Log</h3>
                <button
                  onClick={handleOpenAddExpense}
                  className="px-4 py-2 rounded-xl bg-brand-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Shared Expense
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-card">
                {sharedExpenses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                          <th className="py-3.5 px-4">Title</th>
                          <th className="py-3.5 px-4">Amount</th>
                          <th className="py-3.5 px-4">Paid By</th>
                          <th className="py-3.5 px-4">Split Method</th>
                          <th className="py-3.5 px-4">Date</th>
                          <th className="py-3.5 px-4 text-center">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {sharedExpenses.map(exp => (
                          <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{exp.title}</td>
                            <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                              ₹{Number(exp.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                              {exp.paid_by_name}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-500/10 text-brand-500 capitalize">
                                {exp.split_method} Split
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">
                              {new Date(exp.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {exp.receipt_url ? (
                                <button onClick={() => setReceiptTx(exp)} className="p-1 text-brand-500">
                                  <FileText className="w-4 h-4 mx-auto" />
                                </button>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState title="No shared expenses added yet" description="Click 'Add Shared Expense' to record your first group bill!" />
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Balances & Smart Settle Up */}
          {activeTab === 'balances' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {balancesData?.memberBalances?.map(mb => (
                  <div key={mb.user_id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-brand-500/10 text-brand-500 font-bold flex items-center justify-center text-sm">
                          {mb.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{mb.full_name}</p>
                          <p className="text-[11px] text-slate-400">{mb.email}</p>
                        </div>
                      </div>

                      <span className={`text-sm font-extrabold px-3 py-1 rounded-full ${
                        mb.netBalance >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {mb.netBalance >= 0 ? `Gets ₹${mb.netBalance}` : `Owes ₹${Math.abs(mb.netBalance)}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400">Total Paid Out:</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200">₹{mb.totalPaid.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Share Owed:</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200">₹{mb.totalOwed.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Shared Budgets */}
          {activeTab === 'budgets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Roommate Shared Budgets</h3>
                <button
                  onClick={() => setIsBudgetModal(true)}
                  className="px-4 py-2 rounded-xl bg-brand-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Set Shared Budget
                </button>
              </div>

              {sharedBudgets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sharedBudgets.map(sb => (
                    <div key={sb.id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card space-y-2">
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white text-sm">
                        <span>{sb.category}</span>
                        <span>₹{sb.spent.toLocaleString('en-IN')} / ₹{sb.amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${sb.isExceeded ? 'bg-rose-500' : sb.isWarning ? 'bg-amber-500' : 'bg-brand-500'}`} 
                          style={{ width: `${sb.percentageUsed}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                        <span>{sb.percentageUsed}% Used</span>
                        <span>Remaining: ₹{sb.remaining.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No shared budgets set" description="Set category limits for your roommate group to track collective burn rate." />
              )}
            </div>
          )}

          {/* TAB 5: Members & Invite Code */}
          {activeTab === 'members' && (
            <div className="space-y-6 max-w-2xl">
              {/* Invite Code Box */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-100">Room Invite Code</span>
                  <p className="text-3xl font-extrabold tracking-widest mt-1">{currentRoom?.invite_code}</p>
                </div>
                <button
                  onClick={copyInviteCode}
                  className="px-4 py-2.5 rounded-xl bg-white text-brand-700 hover:bg-brand-50 font-bold text-xs shadow flex items-center gap-1.5 transition-all"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Members List */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-card space-y-4">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Room Members</h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {roomDetails?.members?.map(m => (
                    <div key={m.user_id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-xs">{m.full_name}</p>
                        <p className="text-[11px] text-slate-400">{m.email}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Room Modal */}
      <Modal isOpen={isCreateRoomModal} onClose={() => setIsCreateRoomModal(false)} title="Create New Room">
        <form onSubmit={handleCreateRoom} className="space-y-4 text-xs">
          {formError && <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">{formError}</div>}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Room Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Apartment 4B"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsCreateRoomModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-brand-500 text-white font-bold">Create</button>
          </div>
        </form>
      </Modal>

      {/* Join Room Modal */}
      <Modal isOpen={isJoinRoomModal} onClose={() => setIsJoinRoomModal(false)} title="Join Room with Code">
        <form onSubmit={handleJoinRoom} className="space-y-4 text-xs">
          {formError && <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">{formError}</div>}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">6-Character Invite Code</label>
            <input
              type="text"
              required
              placeholder="e.g. X7K9A2"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white font-mono uppercase font-bold text-center text-base tracking-widest outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsJoinRoomModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-brand-500 text-white font-bold">Join Room</button>
          </div>
        </form>
      </Modal>

      {/* Add Shared Expense Modal */}
      <Modal isOpen={isAddExpenseModal} onClose={() => setIsAddExpenseModal(false)} title="Add Shared Expense" maxWidth="max-w-xl">
        <form onSubmit={handleSaveSharedExpense} className="space-y-4 text-xs">
          {formError && <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">{formError}</div>}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Grocery store purchase"
              value={expTitle}
              onChange={(e) => setExpTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white outline-none font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white font-bold outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white outline-none"
              >
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Paid By</label>
              <select
                value={expPaidBy}
                onChange={(e) => setExpPaidBy(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white outline-none"
              >
                {roomDetails?.members?.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Split Method</label>
              <select
                value={expSplitMethod}
                onChange={(e) => setExpSplitMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white outline-none font-semibold capitalize"
              >
                <option value="equal">Equal Split</option>
                <option value="custom">Custom Amounts</option>
                <option value="percentage">Percentage (%)</option>
                <option value="shares">Shares</option>
              </select>
            </div>
          </div>

          {/* Member Splits Input Grid */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-2 border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-white block">Split Allocation</span>
            {memberSplits.map((ms, idx) => (
              <div key={ms.user_id} className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{ms.full_name}</span>
                {expSplitMethod === 'custom' && (
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount ₹"
                    value={ms.amount_owed}
                    onChange={(e) => {
                      const updated = [...memberSplits];
                      updated[idx].amount_owed = e.target.value;
                      setMemberSplits(updated);
                    }}
                    className="w-28 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border text-xs"
                  />
                )}
                {expSplitMethod === 'percentage' && (
                  <input
                    type="number"
                    placeholder="%"
                    value={ms.percentage}
                    onChange={(e) => {
                      const updated = [...memberSplits];
                      updated[idx].percentage = e.target.value;
                      setMemberSplits(updated);
                    }}
                    className="w-24 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border text-xs"
                  />
                )}
                {expSplitMethod === 'shares' && (
                  <input
                    type="number"
                    placeholder="Shares"
                    value={ms.shares}
                    onChange={(e) => {
                      const updated = [...memberSplits];
                      updated[idx].shares = e.target.value;
                      setMemberSplits(updated);
                    }}
                    className="w-24 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border text-xs"
                  />
                )}
                {expSplitMethod === 'equal' && (
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{expAmount ? (parseFloat(expAmount) / memberSplits.length).toFixed(2) : '0.00'}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Receipt Image (Optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setExpReceiptFile(e.target.files[0])} className="w-full text-xs text-slate-500" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsAddExpenseModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-brand-500 text-white font-bold">Save Shared Expense</button>
          </div>
        </form>
      </Modal>

      {/* Settle Up Modal */}
      <Modal isOpen={isSettleModal} onClose={() => setIsSettleModal(false)} title="Record Settlement Payment">
        <form onSubmit={handleRecordSettlement} className="space-y-4 text-xs">
          {formError && <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">{formError}</div>}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Paid To (Recipient)</label>
            <select
              value={settlePayeeId}
              onChange={(e) => setSettlePayeeId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white outline-none"
            >
              <option value="">Select Member</option>
              {roomDetails?.members?.filter(m => m.user_id !== user?.id).map(m => (
                <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Settlement Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white font-bold outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes / Reference</label>
            <input
              type="text"
              value={settleNotes}
              onChange={(e) => setSettleNotes(e.target.value)}
              placeholder="e.g. UPI Transfer for September bill"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsSettleModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-emerald-500 text-white font-bold">Record Payment</button>
          </div>
        </form>
      </Modal>

      {/* Shared Budget Modal */}
      <Modal isOpen={isBudgetModal} onClose={() => setIsBudgetModal(false)} title="Set Shared Category Budget">
        <form onSubmit={handleSaveSharedBudget} className="space-y-4 text-xs">
          {formError && <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">{formError}</div>}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
            <select
              value={budgetCat}
              onChange={(e) => setBudgetCat(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white outline-none"
            >
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Shared Budget Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              value={budgetAmt}
              onChange={(e) => setBudgetAmt(e.target.value)}
              placeholder="e.g. 15000"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white font-bold outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsBudgetModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-brand-500 text-white font-bold">Save Budget</button>
          </div>
        </form>
      </Modal>

      {/* Lightbox Receipt Modal */}
      <ReceiptModal isOpen={!!receiptTx} onClose={() => setReceiptTx(null)} transaction={receiptTx} />
    </div>
  );
};
