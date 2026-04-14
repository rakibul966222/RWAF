import React, { useState, useEffect, FormEvent } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Users, CreditCard, Vote, MessageSquare, Settings, 
  UserCheck, UserMinus, Trash2, Edit, Check, X,
  Plus, BarChart3, Bell, KeyRound, Megaphone, Receipt
} from 'lucide-react';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { 
  collection, query, onSnapshot, doc, updateDoc, 
  deleteDoc, addDoc, getDoc, setDoc, increment,
  orderBy, where, serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile, FundTransaction, Poll, AppSettings, SubscriptionType, AdminNotice } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

// Secondary app for creating users without logging out admin
const firebaseConfig = {
  apiKey: "AIzaSyCJn2zMfWYz_gFN5goDUrkUjVAIqPGCW-Y",
  authDomain: "mtxr-d8b90.firebaseapp.com",
  projectId: "mtxr-d8b90",
  storageBucket: "mtxr-d8b90.firebasestorage.app",
  messagingSenderId: "688078973753",
  appId: "1:688078973753:web:c7279cdd8ba04c8e0b56e8"
};

const secondaryApp = getApps().length > 1 ? getApp('Secondary') : initializeApp(firebaseConfig, 'Secondary');
const secondaryAuth = getAuth(secondaryApp);

export default function AdminPanel() {
  const location = useLocation();

  return (
    <div className="space-y-6">
      <header className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2"
        >
          🎉 স্বাগতম অ্যাডমিন প্যানেলে!
        </motion.h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">ফাউন্ডেশনের সকল কার্যক্রম এখান থেকে নিয়ন্ত্রণ করুন।</p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[
          { path: '/admin', icon: Users, label: 'ইউজার' },
          { path: '/admin/funds', icon: CreditCard, label: 'আয় অনুমোদন' },
          { path: '/admin/expenses', icon: Receipt, label: 'ব্যয়' },
          { path: '/admin/polls', icon: Vote, label: 'ভোট' },
          { path: '/admin/notices', icon: Megaphone, label: 'নোটিশ' },
          { path: '/admin/push', icon: Bell, label: 'পুশ নোটিফিকেশন' },
          { path: '/admin/posts', icon: MessageSquare, label: 'পোস্ট' },
          { path: '/admin/requests', icon: UserCheck, label: 'প্রোফাইল অনুরোধ' },
          { path: '/admin/settings', icon: Settings, label: 'সেটিংস' },
        ].map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap",
                isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
            >
              <Icon size={18} /> {item.label}
            </Link>
          );
        })}
      </div>

      <Routes>
        <Route path="/" element={<UserManagement />} />
        <Route path="/funds" element={<FundApproval />} />
        <Route path="/expenses" element={<ExpenseManagement />} />
        <Route path="/polls" element={<Voting />} />
        <Route path="/notices" element={<NoticeManagement />} />
        <Route path="/push" element={<PushNotificationPanel />} />
        <Route path="/requests" element={<ProfileRequestManagement />} />
        <Route path="/settings" element={<GlobalSettings />} />
      </Routes>
    </div>
  );
}

function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    mobileNo: '',
    address: '',
    subscriptionAmount: 100,
    subscriptionType: 'monthly' as SubscriptionType,
  });

  const [fundAmount, setFundAmount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('role', 'asc'));
    return onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => d.data() as UserProfile));
      setLoading(false);
    });
  }, []);

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, newUser.password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: newUser.name,
        email: newUser.email,
        mobileNo: newUser.mobileNo,
        address: newUser.address,
        subscriptionAmount: newUser.subscriptionAmount,
        subscriptionType: newUser.subscriptionType,
        role: 'user',
        status: 'active',
        totalContribution: 0,
        contributionVisibility: true,
        joinDate: new Date().toISOString().split('T')[0],
        isProfileComplete: true,
        createdAt: serverTimestamp(),
      });

      setShowAddModal(false);
      setNewUser({
        name: '', email: '', password: '', mobileNo: '', 
        category: 'A', address: '', subscriptionAmount: 100, subscriptionType: 'monthly'
      });
      alert('ইউজার সফলভাবে তৈরি করা হয়েছে।');
    } catch (err: any) {
      alert('ইউজার তৈরি করতে ব্যর্থ হয়েছে: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddFund = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const transRef = doc(collection(db, 'transactions'));
      await setDoc(transRef, {
        userId: selectedUser.uid,
        userName: selectedUser.name,
        amount: fundAmount,
        type: 'income',
        category: 'সরাসরি জমা (অ্যাডমিন)',
        status: 'approved',
        date: new Date().toISOString(),
        description: 'অ্যাডমিন কর্তৃক সরাসরি ফান্ড যোগ করা হয়েছে।',
      });

      await updateDoc(doc(db, 'users', selectedUser.uid), {
        totalContribution: increment(fundAmount)
      });

      await setDoc(doc(db, 'settings', 'main'), {
        totalFund: increment(fundAmount)
      }, { merge: true });

      setShowFundModal(false);
      setFundAmount(0);
      alert('ফান্ড সফলভাবে যোগ করা হয়েছে।');
    } catch (err: any) {
      alert('ফান্ড যোগ করতে ব্যর্থ হয়েছে: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        name: selectedUser.name,
        mobileNo: selectedUser.mobileNo,
        category: selectedUser.category,
        address: selectedUser.address,
        subscriptionAmount: selectedUser.subscriptionAmount,
        subscriptionType: selectedUser.subscriptionType,
      });

      setShowEditModal(false);
      alert('ইউজার তথ্য সফলভাবে আপডেট করা হয়েছে।');
    } catch (err: any) {
      alert('আপডেট করতে ব্যর্থ হয়েছে: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (window.confirm('আপনি কি এই ইউজারের ইমেইলে পাসওয়ার্ড রিসেট লিংক পাঠাতে চান?')) {
      try {
        await sendPasswordResetEmail(auth, email);
        alert('পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।');
      } catch (err: any) {
        alert('ব্যর্থ হয়েছে: ' + err.message);
      }
    }
  };

  const toggleStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    await updateDoc(doc(db, 'users', user.uid), { status: newStatus });
  };

  const deleteUser = async (uid: string) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই ইউজারকে ডিলিট করতে চান?')) {
      await deleteDoc(doc(db, 'users', uid));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">ইউজার ম্যানেজমেন্ট</h2>
            <div className="flex gap-4 text-[10px] font-bold uppercase mt-1">
              <span className="text-blue-600 dark:text-blue-400">মোট: {users.length}</span>
              <span className="text-red-600 dark:text-red-400">ব্লক: {users.filter(u => u.status === 'blocked').length}</span>
            </div>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> ইউজার যোগ করুন
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black">
              <tr>
                <th className="px-6 py-4">নাম ও তথ্য</th>
                <th className="px-6 py-4">ক্যাটাগরি</th>
                <th className="px-6 py-4">মোট জমা</th>
                <th className="px-6 py-4">স্ট্যাটাস</th>
                <th className="px-6 py-4">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {users.map((u) => (
                <motion.tr 
                  layout
                  key={u.uid} 
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-slate-400 dark:text-slate-500">
                        {u.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                          {u.name} {u.role === 'admin' && <span className="text-xs">👑</span>}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{u.mobileNo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold">
                      {u.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">৳{u.totalContribution}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                      u.status === 'active' ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                    )}>
                      {u.status === 'active' ? 'Active' : 'Blocked'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          setSelectedUser(u);
                          setShowFundModal(true);
                        }}
                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                        title="ফান্ড যোগ করুন"
                      >
                        <Plus size={18} />
                      </button>
                      <button 
                        onClick={() => toggleStatus(u)}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          u.status === 'active' ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" : "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30"
                        )}
                        title={u.status === 'active' ? "Block" : "Unblock"}
                      >
                        {u.status === 'active' ? <UserMinus size={18} /> : <UserCheck size={18} />}
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedUser(u);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="এডিট"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => resetPassword(u.email)}
                        className="p-2 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                        title="পাসওয়ার্ড রিসেট"
                      >
                        <KeyRound size={18} />
                      </button>
                      <button 
                        onClick={() => deleteUser(u.uid)}
                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="ডিলিট"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">নতুন ইউজার যোগ করুন</h3>
                <button onClick={() => setShowAddModal(false)}><X size={24} /></button>
              </div>
              <form onSubmit={handleAddUser} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">নাম</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    value={newUser.name || ''}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ইমেইল</label>
                  <input 
                    type="email" required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    value={newUser.email || ''}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">পাসওয়ার্ড</label>
                  <input 
                    type="password" required minLength={6}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    value={newUser.password || ''}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">মোবাইল নং</label>
                  <input 
                    type="tel" required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    value={newUser.mobileNo || ''}
                    onChange={(e) => setNewUser({...newUser, mobileNo: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">চাঁদার পরিমান</label>
                  <input 
                    type="number" required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    value={newUser.subscriptionAmount ?? 0}
                    onChange={(e) => setNewUser({...newUser, subscriptionAmount: Number(e.target.value)})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ঠিকানা</label>
                  <textarea 
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none text-slate-800 dark:text-slate-100"
                    value={newUser.address || ''}
                    onChange={(e) => setNewUser({...newUser, address: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <button 
                    disabled={actionLoading}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                  >
                    {actionLoading ? 'প্রসেসিং...' : 'ইউজার তৈরি করুন'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Money Modal */}
      <AnimatePresence>
        {showFundModal && selectedUser && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-green-600 p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">ফান্ড যোগ করুন</h3>
                <button onClick={() => setShowFundModal(false)}><X size={24} /></button>
              </div>
              <form onSubmit={handleAddFund} className="p-8 space-y-6">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">ইউজার: <span className="font-bold text-slate-800 dark:text-slate-100">{selectedUser.name}</span></p>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">টাকার পরিমাণ</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500">৳</span>
                    <input 
                      type="number" required min="1"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-slate-800 dark:text-slate-100 font-bold text-lg"
                      value={fundAmount || ''}
                      onChange={(e) => setFundAmount(Number(e.target.value))}
                    />
                  </div>
                </div>
                <button 
                  disabled={actionLoading}
                  className="w-full bg-green-600 text-white py-4 rounded-2xl font-black hover:bg-green-700 transition-all shadow-lg shadow-green-200 dark:shadow-none"
                >
                  {actionLoading ? 'প্রসেসিং...' : 'ফান্ড যোগ করুন'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">ইউজার তথ্য এডিট করুন</h3>
                <button onClick={() => setShowEditModal(false)}><X size={24} /></button>
              </div>
              <form onSubmit={handleEditUser} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">নাম</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    value={selectedUser.name || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">মোবাইল নং</label>
                  <input 
                    type="tel" required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    value={selectedUser.mobileNo || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, mobileNo: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">চাঁদার পরিমান</label>
                  <input 
                    type="number" required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    value={selectedUser.subscriptionAmount ?? 0}
                    onChange={(e) => setSelectedUser({...selectedUser, subscriptionAmount: Number(e.target.value)})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ঠিকানা</label>
                  <textarea 
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none text-slate-800 dark:text-slate-100"
                    value={selectedUser.address || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, address: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <button 
                    disabled={actionLoading}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                  >
                    {actionLoading ? 'আপডেট হচ্ছে...' : 'তথ্য আপডেট করুন'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FundApproval() {
  const [pending, setPending] = useState<FundTransaction[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), where('status', '==', 'pending'));
    return onSnapshot(q, (snap) => {
      const trans = snap.docs.map(d => ({ id: d.id, ...d.data() } as FundTransaction));
      trans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPending(trans);
    });
  }, []);

  const handleAction = async (t: FundTransaction, action: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'transactions', t.id), { status: action });
      
      if (action === 'approved') {
        // Update user total
        await updateDoc(doc(db, 'users', t.userId), {
          totalContribution: increment(t.amount)
        });
        
        // Update global fund
        await setDoc(doc(db, 'settings', 'main'), {
          totalFund: increment(t.amount)
        }, { merge: true });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <CreditCard size={20} /> পেন্ডিং রিকোয়েস্ট ({pending.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pending.map((t) => (
          <motion.div 
            layout
            key={t.id} 
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100">{t.userName}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{format(new Date(t.date), 'dd MMM, hh:mm a')}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">৳{t.amount}</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{t.paymentMethod} • {t.transactionId}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleAction(t, 'approved')}
                className="flex-1 bg-green-600 text-white py-2 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Check size={18} /> অনুমোদন
              </button>
              <button 
                onClick={() => handleAction(t, 'rejected')}
                className="flex-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 py-2 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} /> বাতিল
              </button>
            </div>
          </motion.div>
        ))}
        {pending.length === 0 && (
          <div className="md:col-span-2 bg-white dark:bg-slate-800 p-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
            <p className="text-slate-400 dark:text-slate-500">কোন পেন্ডিং রিকোয়েস্ট নেই।</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ExpenseManagement() {
  const [expenses, setExpenses] = useState<FundTransaction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newExpense, setNewExpense] = useState({
    amount: 0,
    category: '',
    description: '',
    fbLink: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const q = query(collection(db, 'transactions'), where('type', '==', 'expense'));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as FundTransaction));
      setExpenses(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
  }, []);

  const handleAddExpense = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const transRef = doc(collection(db, 'transactions'));
      await setDoc(transRef, {
        userId: 'admin',
        userName: 'Admin',
        amount: newExpense.amount,
        type: 'expense',
        category: newExpense.category,
        status: 'approved',
        date: new Date(newExpense.date).toISOString(),
        description: newExpense.description,
        fbLink: newExpense.fbLink
      });

      await setDoc(doc(db, 'settings', 'main'), {
        totalExpense: increment(newExpense.amount)
      }, { merge: true });

      setShowAddModal(false);
      setNewExpense({ amount: 0, category: '', description: '', fbLink: '', date: new Date().toISOString().split('T')[0] });
      alert('খরচের হিসাব যোগ করা হয়েছে।');
    } catch (err: any) {
      alert('ব্যর্থ হয়েছে: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (exp: FundTransaction) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই খরচের হিসাবটি ডিলিট করতে চান?')) {
      await deleteDoc(doc(db, 'transactions', exp.id));
      await setDoc(doc(db, 'settings', 'main'), {
        totalExpense: increment(-exp.amount)
      }, { merge: true });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <h2 className="font-bold text-slate-800 dark:text-slate-100">খরচের হিসাব</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-700 transition-all flex items-center gap-2"
        >
          <Plus size={18} /> খরচ যোগ করুন
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {expenses.map((exp) => (
          <div key={exp.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100">{exp.category}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{format(new Date(exp.date), 'dd MMM yyyy')}</p>
              </div>
              <p className="text-xl font-black text-red-600 dark:text-red-400">৳{exp.amount}</p>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{exp.description}</p>
            <div className="flex justify-between items-center">
              {exp.fbLink && (
                <a href={exp.fbLink} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline">
                  ফেসবুক লিংক
                </a>
              )}
              <button onClick={() => deleteExpense(exp)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-red-600 p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">নতুন খরচ যোগ করুন</h3>
                <button onClick={() => setShowAddModal(false)}><X size={24} /></button>
              </div>
              <form onSubmit={handleAddExpense} className="p-8 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">টাকার পরিমান</label>
                  <input 
                    type="number" required
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">ক্যাটাগরি</label>
                  <input 
                    type="text" required placeholder="যেমন: ইফতার মাহফিল"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100"
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">বিবরণ</label>
                  <textarea 
                    required
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none h-24 resize-none text-slate-800 dark:text-slate-100"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">ফেসবুক লিংক (ঐচ্ছিক)</label>
                  <input 
                    type="url"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100"
                    value={newExpense.fbLink}
                    onChange={(e) => setNewExpense({...newExpense, fbLink: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">তারিখ</label>
                  <input 
                    type="date" required
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                  />
                </div>
                <button 
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 dark:shadow-none"
                >
                  {loading ? 'প্রসেসিং...' : 'খরচ যোগ করুন'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NoticeManagement() {
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newNotice, setNewNotice] = useState({
    title: '',
    content: '',
    type: 'info' as AdminNotice['type']
  });

  useEffect(() => {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setNotices(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminNotice)));
    });
  }, []);

  const handleAddNotice = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'notices'), {
        ...newNotice,
        createdAt: new Date().toISOString(),
        active: true
      });

      // Automatically send push notification
      try {
        await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: "নতুন নোটিশ: " + newNotice.title, 
            body: newNotice.content.substring(0, 100) + "..." 
          })
        });
      } catch (pushErr) {
        console.error("Push notification failed:", pushErr);
      }

      setShowAddModal(false);
      setNewNotice({ title: '', content: '', type: 'info' });
      alert('নোটিশ পাবলিশ করা হয়েছে।');
    } catch (err: any) {
      alert('ব্যর্থ হয়েছে: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotice = async (notice: AdminNotice) => {
    await updateDoc(doc(db, 'notices', notice.id), { active: !notice.active });
  };

  const deleteNotice = async (id: string) => {
    if (window.confirm('আপনি কি নিশ্চিত?')) {
      await deleteDoc(doc(db, 'notices', id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <h2 className="font-bold text-slate-800 dark:text-slate-100">নোটিশ বোর্ড</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Plus size={18} /> নতুন নোটিশ
        </button>
      </div>

      <div className="space-y-4">
        {notices.map((n) => (
          <div key={n.id} className={cn(
            "bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700",
            !n.active && "opacity-60"
          )}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  n.type === 'urgent' ? "bg-red-500 animate-pulse" : 
                  n.type === 'warning' ? "bg-yellow-500" : "bg-blue-500"
                )} />
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{n.title}</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleNotice(n)} className="text-slate-400 dark:text-slate-500 hover:text-blue-600">
                  {n.active ? <Check size={18} /> : <X size={18} />}
                </button>
                <button onClick={() => deleteNotice(n.id)} className="text-slate-400 dark:text-slate-500 hover:text-red-500">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{n.content}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 uppercase font-bold">
              {format(new Date(n.createdAt), 'dd MMM yyyy, hh:mm a')}
            </p>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">নতুন নোটিশ</h3>
                <button onClick={() => setShowAddModal(false)}><X size={24} /></button>
              </div>
              <form onSubmit={handleAddNotice} className="p-8 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">টাইটেল</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100"
                    value={newNotice.title}
                    onChange={(e) => setNewNotice({...newNotice, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">ধরণ</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100"
                    value={newNotice.type}
                    onChange={(e) => setNewNotice({...newNotice, type: e.target.value as any})}
                  >
                    <option value="info">সাধারণ</option>
                    <option value="warning">সতর্কবার্তা</option>
                    <option value="urgent">জরুরী</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">বিবরণ</label>
                  <textarea 
                    required
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none h-32 resize-none text-slate-800 dark:text-slate-100"
                    value={newNotice.content}
                    onChange={(e) => setNewNotice({...newNotice, content: e.target.value})}
                  />
                </div>
                <button 
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  {loading ? 'প্রসেসিং...' : 'পাবলিশ করুন'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
function Voting() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [question, setQuestion] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setPolls(snap.docs.map(d => ({ id: d.id, ...d.data() } as Poll)));
    });
  }, []);

  const createPoll = async (e: FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'polls'), {
      question,
      options: [
        { text: 'হ্যাঁ', votes: 0 },
        { text: 'না', votes: 0 }
      ],
      votedBy: [],
      createdAt: new Date().toISOString(),
      active: true
    });
    setQuestion('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4">নতুন ভোট তৈরি করুন</h2>
        <form onSubmit={createPoll} className="flex gap-2">
          <input 
            type="text" 
            required
            placeholder="ভোটের বিষয় লিখুন..."
            className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors">
            তৈরি করুন
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {polls.map((p) => (
          <div key={p.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">{p.question}</h3>
            <div className="space-y-3">
              {p.options.map((opt, idx) => {
                const total = p.votedBy.length || 1;
                const percent = Math.round((opt.votes / total) * 100);
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">{opt.text}</span>
                      <span className="text-slate-500 dark:text-slate-400">{percent}% ({opt.votes})</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">মোট ভোট: {p.votedBy.length}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileRequestManagement() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'profile_requests'), where('status', '==', 'pending'));
    return onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const handleAction = async (req: any, action: 'approved' | 'rejected') => {
    try {
      if (action === 'approved') {
        await updateDoc(doc(db, 'users', req.userId), req.newData);
      }
      await updateDoc(doc(db, 'profile_requests', req.id), { status: action });
      alert(`অনুরোধ ${action === 'approved' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'} হয়েছে।`);
    } catch (err) {
      console.error(err);
      alert('ব্যর্থ হয়েছে।');
    }
  };

  if (loading) return <div className="p-8 text-center">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4">প্রোফাইল পরিবর্তনের অনুরোধ ({requests.length})</h2>
        <div className="space-y-4">
          {requests.length === 0 ? (
            <p className="text-slate-500 text-center py-8">কোন পেন্ডিং অনুরোধ নেই।</p>
          ) : (
            requests.map(req => (
              <div key={req.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">{req.userName}</h4>
                  <div className="mt-2 text-sm space-y-1 text-slate-600 dark:text-slate-400">
                    {Object.entries(req.newData).map(([key, value]) => (
                      <p key={key}><span className="font-bold uppercase">{key}:</span> {value as string}</p>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{format(new Date(req.createdAt), 'PPpp')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleAction(req, 'approved')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
                  >
                    অনুমোদন
                  </button>
                  <button 
                    onClick={() => handleAction(req, 'rejected')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                  >
                    বাতিল
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PushNotificationPanel() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body })
      });
      const data = await res.json();
      if (data.success) {
        alert('নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!');
        setTitle('');
        setBody('');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error(err);
      alert('নোটিফিকেশন পাঠাতে ব্যর্থ হয়েছে: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 max-w-xl"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
          <Bell size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">পুশ নোটিফিকেশন পাঠান</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">সকল ইউজারের মোবাইলে সরাসরি নোটিফিকেশন যাবে।</p>
        </div>
      </div>

      <form onSubmit={handleSend} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">টাইটেল</label>
          <input 
            type="text" 
            required
            placeholder="যেমন: নতুন নোটিশ প্রকাশিত হয়েছে"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">মেসেজ</label>
          <textarea 
            required
            rows={4}
            placeholder="বিস্তারিত মেসেজ লিখুন..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 resize-none"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <button 
          disabled={loading}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? 'পাঠানো হচ্ছে...' : <><Bell size={20} /> সকল ইউজারকে পাঠান</>}
        </button>
      </form>
    </motion.div>
  );
}

function GlobalSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    bkashNo: '',
    nagadNo: '',
    rocketNo: '',
    totalFund: 0,
    totalExpense: 0
  });

  useEffect(() => {
    onSnapshot(doc(db, 'settings', 'main'), (docSnap) => {
      if (docSnap.exists()) setSettings(docSnap.data() as AppSettings);
    });
  }, []);

  const saveSettings = async (e: FormEvent) => {
    e.preventDefault();
    await setDoc(doc(db, 'settings', 'main'), settings);
    alert('সেটিংস সেভ হয়েছে।');
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 max-w-xl">
      <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-6">অ্যাপ সেটিংস</h2>
      <form onSubmit={saveSettings} className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
            <img src="https://www.logo.wine/a/logo/BKash/BKash-Logo.wine.svg" alt="bKash" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">বিকাশ নম্বর</label>
              <input 
                type="text" 
                className="w-full bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none"
                value={settings.bkashNo || ''}
                onChange={(e) => setSettings({...settings, bkashNo: e.target.value})}
              />
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
            <img src="https://www.logo.wine/a/logo/Nagad/Nagad-Logo.wine.svg" alt="Nagad" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">নগদ নম্বর</label>
              <input 
                type="text" 
                className="w-full bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none"
                value={settings.nagadNo || ''}
                onChange={(e) => setSettings({...settings, nagadNo: e.target.value})}
              />
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
            <img src="https://www.logo.wine/a/logo/Dutch_Bangla_Bank/Dutch_Bangla_Bank-Logo.wine.svg" alt="Rocket" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">রকেট নম্বর</label>
              <input 
                type="text" 
                className="w-full bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none"
                value={settings.rocketNo || ''}
                onChange={(e) => setSettings({...settings, rocketNo: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">ফান্ড অ্যাডজাস্টমেন্ট</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">মোট ফান্ড (৳)</label>
              <input 
                type="number" 
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-100"
                value={settings.totalFund ?? 0}
                onChange={(e) => setSettings({...settings, totalFund: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">মোট খরচ (৳)</label>
              <input 
                type="number" 
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-100"
                value={settings.totalExpense ?? 0}
                onChange={(e) => setSettings({...settings, totalExpense: Number(e.target.value)})}
              />
            </div>
          </div>
        </div>

        <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none">
          সেটিংস সেভ করুন
        </button>
      </form>
    </div>
  );
}
