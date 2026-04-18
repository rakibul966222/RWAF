import React, { useState, useEffect, FormEvent } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  Users, CreditCard, Vote, MessageSquare, Settings, 
  UserCheck, UserMinus, Trash2, Edit, Check, X,
  Plus, BarChart3, Bell, KeyRound, Megaphone, Receipt,
  Shield, UserCog, Smartphone, Calendar, CheckCircle2, XCircle, Clock,
  User, UserPlus
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
  const { showToast } = useAuth();

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 relative z-10">
        <div className="relative group">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-white uppercase relative"
          >
            অ্যাডমিন <span className="text-gradient">প্যানেল</span>
          </motion.h1>
          <p className="text-slate-500 text-xs font-bold uppercase mt-2 opacity-80 flex items-center gap-3">
            <span className="w-6 h-[1px] bg-indigo-500/50" />
            সিস্টেম কন্ট্রোল এবং ম্যানেজমেন্ট
          </p>
        </div>
        <div className="flex items-center gap-4 px-6 py-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase shadow-inner">
          <Shield size={20} /> সিস্টেম অ্যাডমিনিস্ট্রেটর
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar p-2 glass border border-white/5 rounded-3xl relative z-10">
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
                "flex items-center gap-3 px-6 py-4 rounded-2xl font-bold uppercase text-xs transition-all whitespace-nowrap border group/nav",
                isActive 
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-lg text-white" 
                  : "glass border-white/5 text-slate-400 hover:text-white"
              )}
            >
              <Icon size={16} className={cn("transition-transform group-hover/nav:scale-110", isActive ? "text-white" : "text-slate-500")} /> 
              {item.label}
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
  const { showToast, showConfirm } = useAuth();
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
      showToast('ইউজার সফলভাবে তৈরি করা হয়েছে।');
    } catch (err: any) {
      showToast('ইউজার তৈরি করতে ব্যর্থ হয়েছে: ' + err.message, 'error');
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
      showToast('ফান্ড সফলভাবে যোগ করা হয়েছে।');
    } catch (err: any) {
      showToast('ফান্ড যোগ করতে ব্যর্থ হয়েছে: ' + err.message, 'error');
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
      showToast('ইউজার তথ্য সফলভাবে আপডেট করা হয়েছে।');
    } catch (err: any) {
      showToast('আপডেট করতে ব্যর্থ হয়েছে: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const resetPassword = (email: string) => {
    showConfirm('আপনি কি এই ইউজারের ইমেইলে পাসওয়ার্ড রিসেট লিংক পাঠাতে চান?', async () => {
      try {
        await sendPasswordResetEmail(auth, email);
        showToast('পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।');
      } catch (err: any) {
        showToast('ব্যর্থ হয়েছে: ' + err.message, 'error');
      }
    });
  };

  const toggleStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    await updateDoc(doc(db, 'users', user.uid), { status: newStatus });
  };

  const deleteUser = (uid: string) => {
    showConfirm('আপনি কি নিশ্চিত যে এই ইউজারকে ডিলিট করতে চান?', async () => {
      await deleteDoc(doc(db, 'users', uid));
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-10"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 glass p-6 md:p-8 rounded-[2rem] md:rounded-3xl border border-white/5 relative overflow-hidden group">
        <div className="flex items-center gap-6 relative z-10">
          <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-all">
            <Users size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white uppercase">ইউজার ম্যানেজমেন্ট</h2>
            <div className="flex gap-6 text-xs font-bold uppercase mt-2">
              <span className="flex items-center gap-2 text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                মোট: {users.length}
              </span>
              <span className="flex items-center gap-2 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                ব্লক: {users.filter(u => u.status === 'blocked').length}
              </span>
            </div>
          </div>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold uppercase text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-3 transition-all"
        >
          <Plus size={20} /> 
          <span>ইউজার যোগ করুন</span>
        </motion.button>
      </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-slate-500 text-[10px] md:text-xs uppercase font-bold text-left">
              <tr>
                <th className="px-4 py-6 md:px-6 md:py-8">নাম ও তথ্য</th>
                <th className="px-4 py-6 md:px-6 md:py-8">ক্যাটাগরি</th>
                <th className="px-4 py-6 md:px-6 md:py-8">মোট জমা</th>
                <th className="px-4 py-6 md:px-6 md:py-8">স্ট্যাটাস</th>
                <th className="px-4 py-6 md:px-6 md:py-8 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <motion.tr 
                  layout
                  key={u.uid} 
                  className="hover:bg-white/5 transition-colors group"
                >
                  <td className="px-4 py-6 md:px-6 md:py-8">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center font-bold text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-lg">
                        {u.name[0]}
                      </div>
                      <div>
                        <p className="text-sm md:text-lg font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                          {u.name} 
                          {u.role === 'admin' && (
                            <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 uppercase ml-2">Admin</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 font-bold uppercase mt-1">{u.mobileNo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-6 md:px-6 md:py-8">
                    <span className="px-2 py-0.5 md:px-3 md:py-1 bg-indigo-500/10 text-indigo-400 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold uppercase border border-indigo-500/20">
                      {u.category}
                    </span>
                  </td>
                  <td className="px-4 py-6 md:px-6 md:py-8">
                    <p className="text-lg md:text-xl font-black text-white">৳{u.totalContribution?.toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-6 md:px-6 md:py-8">
                    <span className={cn(
                      "px-2 py-0.5 md:px-3 md:py-1 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold uppercase border",
                      u.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                      {u.status === 'active' ? 'Active' : 'Blocked'}
                    </span>
                  </td>
                  <td className="px-6 py-8">
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => {
                          setSelectedUser(u);
                          setShowFundModal(true);
                        }}
                        className="p-3 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-all border border-emerald-500/20"
                        title="ফান্ড যোগ করুন"
                      >
                        <Plus size={18} />
                      </button>
                      <button 
                        onClick={() => toggleStatus(u)}
                        className={cn(
                          "p-3 rounded-xl transition-all border",
                          u.status === 'active' ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
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
                        className="p-3 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl transition-all border border-indigo-500/20"
                        title="এডিট"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => resetPassword(u.email)}
                        className="p-3 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-xl transition-all border border-purple-500/20"
                        title="পাসওয়ার্ড রিসেট"
                      >
                        <KeyRound size={18} />
                      </button>
                      <button 
                        onClick={() => deleteUser(u.uid)}
                        className="p-3 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all border border-rose-500/20"
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
      
      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="glass-card w-full max-w-3xl overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 pointer-events-none" />
              
              <div className="bg-white/5 p-10 border-b border-white/5 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
                    <UserPlus size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase">নতুন ইউজার যোগ করুন</h3>
                    <p className="text-xs font-black text-slate-500 uppercase mt-1 opacity-60">সদস্যের বিস্তারিত তথ্য প্রদান করুন</p>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAddModal(false)}
                  className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-xl transition-colors border border-white/5"
                >
                  <X size={24} />
                </motion.button>
              </div>

              <form onSubmit={handleAddUser} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">নাম</label>
                  <input 
                    type="text" required
                    placeholder="পুরো নাম লিখুন..."
                    className="w-full px-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-bold transition-all placeholder:text-slate-700"
                    value={newUser.name || ''}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">ইমেইল</label>
                  <input 
                    type="email" required
                    placeholder="example@mail.com"
                    className="w-full px-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-bold transition-all placeholder:text-slate-700"
                    value={newUser.email || ''}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">পাসওয়ার্ড</label>
                  <input 
                    type="password" required minLength={6}
                    placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                    className="w-full px-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-bold transition-all placeholder:text-slate-700"
                    value={newUser.password || ''}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">মোবাইল নং</label>
                  <input 
                    type="tel" required
                    placeholder="০১XXXXXXXXX"
                    className="w-full px-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-bold transition-all placeholder:text-slate-700"
                    value={newUser.mobileNo || ''}
                    onChange={(e) => setNewUser({...newUser, mobileNo: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">চাঁদার পরিমান</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-indigo-500 text-xl">৳</span>
                    <input 
                      type="number" required
                      placeholder="0.00"
                      className="w-full pl-12 pr-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-black text-xl transition-all placeholder:text-slate-700"
                      value={newUser.subscriptionAmount ?? 0}
                      onChange={(e) => setNewUser({...newUser, subscriptionAmount: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">ঠিকানা</label>
                  <textarea 
                    className="w-full px-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-bold transition-all placeholder:text-slate-700 h-32 resize-none"
                    placeholder="পুরো ঠিকানা লিখুন..."
                    value={newUser.address || ''}
                    onChange={(e) => setNewUser({...newUser, address: e.target.value})}
                  />
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fund Modal */}
      <AnimatePresence>
        {showFundModal && selectedUser && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="glass-card w-full max-w-md overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 pointer-events-none" />
              
              <div className="bg-white/5 p-10 border-b border-white/5 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20">
                    <Plus size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase">ফান্ড যোগ করুন</h3>
                    <p className="text-xs font-black text-slate-500 uppercase mt-1 opacity-60">সদস্যের একাউন্টে টাকা যোগ করুন</p>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowFundModal(false)}
                  className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-xl transition-colors border border-white/5"
                >
                  <X size={24} />
                </motion.button>
              </div>

              <form onSubmit={handleAddFund} className="p-10 space-y-8 relative z-10">
                <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 flex items-center gap-6">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center font-black text-emerald-400 border border-emerald-500/20">
                    {selectedUser.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase">ইউজার</p>
                    <p className="text-lg font-black text-white tracking-tight">{selectedUser.name}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">টাকার পরিমাণ</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-emerald-500 text-2xl">৳</span>
                    <input 
                      type="number" required min="1"
                      placeholder="0.00"
                      className="w-full pl-12 pr-6 py-6 bg-white/5 border border-white/5 rounded-[2rem] outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-black text-3xl transition-all placeholder:text-slate-700"
                      value={fundAmount || ''}
                      onChange={(e) => setFundAmount(Number(e.target.value))}
                    />
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={actionLoading}
                  className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white py-6 rounded-[2rem] font-black uppercase text-sm shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden group/btn"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  {actionLoading ? 'প্রসেসিং...' : 'ফান্ড যোগ করুন'}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="glass-card w-full max-w-3xl overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 pointer-events-none" />
              
              <div className="bg-white/5 p-10 border-b border-white/5 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
                    <Edit size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase">ইউজার তথ্য এডিট করুন</h3>
                    <p className="text-xs font-black text-slate-500 uppercase mt-1 opacity-60">সদস্যের তথ্য সংশোধন করুন</p>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowEditModal(false)}
                  className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-xl transition-colors border border-white/5"
                >
                  <X size={24} />
                </motion.button>
              </div>

              <form onSubmit={handleEditUser} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">নাম</label>
                  <input 
                    type="text" required
                    placeholder="পুরো নাম লিখুন..."
                    className="w-full px-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-bold transition-all placeholder:text-slate-700"
                    value={selectedUser.name || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, name: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">মোবাইল নং</label>
                  <input 
                    type="tel" required
                    placeholder="০১XXXXXXXXX"
                    className="w-full px-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-bold transition-all placeholder:text-slate-700"
                    value={selectedUser.mobileNo || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, mobileNo: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">চাঁদার পরিমান</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-indigo-500 text-xl">৳</span>
                    <input 
                      type="number" required
                      placeholder="0.00"
                      className="w-full pl-12 pr-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-black text-xl transition-all placeholder:text-slate-700"
                      value={selectedUser.subscriptionAmount ?? 0}
                      onChange={(e) => setSelectedUser({...selectedUser, subscriptionAmount: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">ঠিকানা</label>
                  <textarea 
                    required
                    placeholder="সদস্যের বর্তমান ঠিকানা লিখুন..."
                    className="w-full px-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 h-32 resize-none text-white font-bold transition-all placeholder:text-slate-700"
                    value={selectedUser.address || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, address: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={actionLoading}
                    className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white py-6 rounded-[2rem] font-black uppercase text-sm shadow-[0_20px_40px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden group/btn"
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    {actionLoading ? 'প্রসেসিং...' : 'তথ্য আপডেট করুন'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FundApproval() {
  const { showToast } = useAuth();
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
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <div className="flex items-center gap-4 md:gap-8 bg-white/5 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="p-5 bg-amber-500/10 rounded-[2rem] text-amber-400 border border-amber-500/20 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all relative z-10">
          <CreditCard size={40} />
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white uppercase">আয় অনুমোদন</h2>
          <p className="text-xs font-black text-slate-500 uppercase mt-3 opacity-60">পেন্ডিং লেনদেনগুলো যাচাই করে অনুমোদন দিন ({pending.length})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
        {pending.map((t, idx) => (
          <motion.div 
            layout
            key={t.id} 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-card p-6 md:p-12 relative overflow-hidden group border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.3)] perspective-1000"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[80px] -mr-24 -mt-24 transition-all group-hover:bg-indigo-500/20" />
            <div className="flex justify-between items-start mb-10 relative z-10">
              <div>
                <p className="text-2xl font-black text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{t.userName}</p>
                <p className="text-xs text-slate-500 font-black uppercase mt-3 flex items-center gap-2 transition-all">
                  <Clock size={14} />
                  {format(new Date(t.date), 'dd MMM, hh:mm a')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl md:text-4xl font-black text-gradient drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">৳{t.amount?.toLocaleString()}</p>
                <p className="text-xs font-black text-slate-500 uppercase mt-3 bg-white/5 px-3 py-1 rounded-lg border border-white/10">{t.paymentMethod || t.method} • {t.transactionId || t.txId}</p>
              </div>
            </div>
            <div className="flex gap-6 relative z-10">
              <motion.button 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAction(t, 'approved')}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-5 rounded-[1.5rem] font-black uppercase text-xs shadow-lg flex items-center justify-center gap-3 group/btn"
              >
                <CheckCircle2 size={20} className="group-hover:scale-125 transition-transform" /> অনুমোদন
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAction(t, 'rejected')}
                className="flex-1 glass border border-white/10 text-rose-400 py-5 rounded-[1.5rem] font-black uppercase text-xs hover:bg-rose-500/10 hover:border-rose-500/20 transition-all flex items-center justify-center gap-3 group/btn"
              >
                <X size={20} className="group-hover:rotate-90 transition-transform" /> বাতিল
              </motion.button>
            </div>
          </motion.div>
        ))}
        {pending.length === 0 && (
          <div className="md:col-span-2 glass-card p-12 md:p-32 border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-6 md:gap-8">
            <div className="p-10 bg-white/5 rounded-[3rem] border border-white/5">
              <Check size={64} className="text-slate-700" />
            </div>
            <p className="text-slate-500 font-black uppercase opacity-40">কোন পেন্ডিং রিকোয়েস্ট নেই।</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ExpenseManagement() {
  const { showToast, showConfirm } = useAuth();
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
      showToast('খরচের হিসাব যোগ করা হয়েছে।');
    } catch (err: any) {
      showToast('ব্যর্থ হয়েছে: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = (exp: FundTransaction) => {
    showConfirm('আপনি কি নিশ্চিত যে এই খরচের হিসাবটি ডিলিট করতে চান?', async () => {
      await deleteDoc(doc(db, 'transactions', exp.id));
      await setDoc(doc(db, 'settings', 'main'), {
        totalExpense: increment(-exp.amount)
      }, { merge: true });
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-8 relative z-10">
          <div className="p-5 bg-rose-500/10 rounded-[2rem] text-rose-400 border border-rose-500/20 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all">
            <Receipt size={40} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white uppercase">খরচের হিসাব</h2>
            <p className="text-xs font-black text-slate-500 uppercase mt-3 opacity-60">ফাউন্ডেশনের সকল ব্যয়ের হিসাব এখান থেকে নিয়ন্ত্রণ করুন</p>
          </div>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05, y: -5, rotateX: -10 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 text-white px-12 py-6 rounded-[2.5rem] font-black uppercase text-xs shadow-xl flex items-center gap-4 group/btn relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
          <Plus size={28} className="group-hover:rotate-90 transition-transform" /> 
          <span>খরচ যোগ করুন</span>
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {expenses.map((exp, idx) => (
          <motion.div 
            key={exp.id} 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-card p-6 md:p-12 relative overflow-hidden group border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.3)] perspective-1000"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 blur-[80px] -mr-24 -mt-24 transition-all group-hover:bg-rose-500/20" />
            <div className="flex justify-between items-start mb-10 relative z-10">
              <div>
                <p className="text-2xl font-black text-white uppercase tracking-tight group-hover:text-rose-400 transition-colors">{exp.category}</p>
                <p className="text-xs text-slate-500 font-black uppercase mt-3 flex items-center gap-2 transition-all">
                  <Clock size={14} />
                  {format(new Date(exp.date), 'dd MMM yyyy')}
                </p>
              </div>
              <p className="text-4xl font-black text-rose-500">৳{exp.amount?.toLocaleString()}</p>
            </div>
            <p className="text-base text-slate-400 font-bold leading-relaxed mb-10 relative z-10 opacity-80">{exp.description}</p>
            <div className="flex justify-between items-center relative z-10">
              {exp.fbLink ? (
                <motion.a 
                  whileHover={{ x: 5 }}
                  href={exp.fbLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center gap-3 text-indigo-400 text-xs font-black uppercase hover:text-indigo-300 transition-colors bg-indigo-500/10 px-5 py-2.5 rounded-xl border border-indigo-500/20 shadow-sm"
                >
                  <Smartphone size={16} /> ফেসবুক লিংক
                </motion.a>
              ) : <div />}
              <motion.button 
                whileHover={{ scale: 1.1, rotate: -10 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => deleteExpense(exp)}
                className="p-4 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-2xl transition-all border border-rose-500/20 shadow-xl"
              >
                <Trash2 size={24} />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="glass-card w-full max-w-xl overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-indigo-500/10 pointer-events-none" />
              
              <div className="bg-white/5 p-10 border-b border-white/5 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-rose-500/10 rounded-2xl text-rose-400 border border-rose-500/20">
                    <Plus size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase">নতুন খরচ যোগ করুন</h3>
                    <p className="text-xs font-black text-slate-500 uppercase mt-1 opacity-60">ব্যয়ের বিস্তারিত তথ্য প্রদান করুন</p>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAddModal(false)}
                  className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-xl transition-colors border border-white/5"
                >
                  <X size={24} />
                </motion.button>
              </div>

              <form onSubmit={handleAddExpense} className="p-10 space-y-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="block text-xs font-black text-slate-500 uppercase ml-2">টাকার পরিমান</label>
                    <div className="relative group">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-rose-500 text-xl group-focus-within:scale-125 transition-transform">৳</span>
                      <input 
                        type="number" required min="1"
                        className="w-full pl-12 pr-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/50 text-white font-black text-2xl transition-all placeholder:text-slate-700"
                        placeholder="0.00"
                        value={newExpense.amount || ''}
                        onChange={(e) => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-xs font-black text-slate-500 uppercase ml-2">তারিখ</label>
                    <div className="relative">
                      <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                      <input 
                        type="date" required
                        className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/50 text-white font-bold transition-all [color-scheme:dark]"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">ক্যাটাগরি</label>
                  <input 
                    type="text" required
                    placeholder="যেমন: ইফতার সামগ্রী, যাতায়াত খরচ"
                    className="w-full px-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/50 text-white font-bold transition-all placeholder:text-slate-700"
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">বিস্তারিত বর্ণনা</label>
                  <textarea 
                    required
                    placeholder="ব্যয়ের বিস্তারিত তথ্য এখানে লিখুন..."
                    className="w-full px-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/50 h-32 resize-none text-white font-bold transition-all placeholder:text-slate-700"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">ফেসবুক পোস্ট লিংক (ঐচ্ছিক)</label>
                  <div className="relative">
                    <Smartphone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input 
                      type="url"
                      placeholder="https://facebook.com/..."
                      className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/50 text-white font-bold transition-all placeholder:text-slate-700"
                      value={newExpense.fbLink}
                      onChange={(e) => setNewExpense({...newExpense, fbLink: e.target.value})}
                    />
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 text-white py-6 rounded-[2rem] font-black uppercase text-sm shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden group/btn"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  {loading ? 'প্রসেসিং...' : 'খরচ নিশ্চিত করুন'}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function NoticeManagement() {
  const { showToast, showConfirm } = useAuth();
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
        const pushRes = await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: "নতুন নোটিশ: " + newNotice.title, 
            body: newNotice.content.substring(0, 100) + "..." 
          })
        });
        const pushData = await pushRes.json();
        if (!pushRes.ok) {
           console.warn("Push notification warning:", pushData.error);
           showToast('নোটিশ সেভ হয়েছে কিন্তু পুশ নোটিফিকেশন কাজ করেনি। সেটিংস চেক করুন।', 'info');
        } else {
           showToast('নোটিশ এবং পুশ নোটিফিকেশন পাঠানো হয়েছে।');
        }
      } catch (pushErr) {
        console.error("Push notification network error:", pushErr);
        showToast('নোটিশ সেভ হয়েছে কিন্তু মেমরি বা নেটওয়ার্ক সমস্যার কারণে পুশ যায়নি।', 'info');
      }

      setShowAddModal(false);
      setNewNotice({ title: '', content: '', type: 'info' });
    } catch (err: any) {
      showToast('ব্যর্থ হয়েছে: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleNotice = async (notice: AdminNotice) => {
    await updateDoc(doc(db, 'notices', notice.id), { active: !notice.active });
  };

  const deleteNotice = (id: string) => {
    showConfirm('আপনি কি নিশ্চিত?', async () => {
      await deleteDoc(doc(db, 'notices', id));
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-8 relative z-10">
          <div className="p-5 bg-indigo-500/10 rounded-[2rem] text-indigo-400 border border-indigo-500/20 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all">
            <Bell size={40} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white uppercase">নোটিশ বোর্ড</h2>
            <p className="text-xs font-black text-slate-500 uppercase mt-3 opacity-60">গুরুত্বপূর্ণ ঘোষণা ও নোটিশ এখান থেকে পাবলিশ করুন</p>
          </div>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05, y: -5, rotateX: -10 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white px-12 py-6 rounded-[2.5rem] font-black uppercase text-xs shadow-xl flex items-center gap-4 group/btn relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
          <Plus size={28} className="group-hover:rotate-90 transition-transform" /> 
          <span>নতুন নোটিশ</span>
        </motion.button>
      </div>

      <div className="space-y-8">
        {notices.map((n, idx) => (
          <motion.div 
            key={n.id} 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
              "glass-card p-6 md:p-12 relative overflow-hidden group border border-white/5 transition-all hover:bg-white/5",
              !n.active && "opacity-40 grayscale blur-[1px]"
            )}
          >
            <div className={cn(
              "absolute left-0 top-0 w-2 h-full transition-transform origin-top scale-y-0 group-hover:scale-y-100",
              n.type === 'urgent' ? "bg-rose-500" : 
              n.type === 'warning' ? "bg-amber-500" : "bg-indigo-500"
            )} />
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="flex items-center gap-6">
                <div className={cn(
                  "w-4 h-4 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] relative",
                  n.type === 'urgent' ? "bg-rose-500 animate-pulse shadow-rose-500/50" : 
                  n.type === 'warning' ? "bg-amber-500 shadow-amber-500/50" : "bg-indigo-500 shadow-indigo-500/50"
                )}>
                  <div className="absolute inset-0 rounded-full animate-ping bg-inherit opacity-40" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{n.title}</h3>
              </div>
              <div className="flex gap-4">
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleNotice(n)} 
                  className={cn(
                    "p-4 rounded-2xl transition-all border shadow-xl",
                    n.active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-white/5 text-slate-500 border-white/10 hover:bg-white/10"
                  )}
                >
                  {n.active ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: -10 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => deleteNotice(n.id)} 
                  className="p-4 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-2xl transition-all border border-rose-500/20 shadow-xl"
                >
                  <Trash2 size={24} />
                </motion.button>
              </div>
            </div>
            <p className="text-lg text-slate-400 font-bold leading-relaxed mb-8 relative z-10 opacity-80">{n.content}</p>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-black uppercase relative z-10 opacity-60">
              <Clock size={14} />
              {format(new Date(n.createdAt), 'dd MMM yyyy, hh:mm a')}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="glass-card w-full max-w-xl overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 pointer-events-none" />
              
              <div className="bg-white/5 p-10 border-b border-white/5 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
                    <Bell size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase">নতুন নোটিশ পাবলিশ করুন</h3>
                    <p className="text-xs font-black text-slate-500 uppercase mt-1 opacity-60">নোটিশের বিস্তারিত তথ্য প্রদান করুন</p>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAddModal(false)}
                  className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-xl transition-colors border border-white/5"
                >
                  <X size={24} />
                </motion.button>
              </div>

              <form onSubmit={handleAddNotice} className="p-10 space-y-8 relative z-10">
                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">টাইটেল</label>
                  <input 
                    type="text" required
                    placeholder="নোটিশের শিরোনাম লিখুন..."
                    className="w-full px-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-black text-xl tracking-tight transition-all placeholder:text-slate-700"
                    value={newNotice.title}
                    onChange={(e) => setNewNotice({...newNotice, title: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">নোটিশের ধরণ</label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'info', label: 'সাধারণ', color: 'indigo' },
                      { id: 'warning', label: 'সতর্কবার্তা', color: 'amber' },
                      { id: 'urgent', label: 'জরুরী', color: 'rose' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setNewNotice({...newNotice, type: type.id as any})}
                        className={cn(
                          "py-4 rounded-2xl font-black uppercase text-xs border transition-all",
                          newNotice.type === type.id 
                            ? `bg-${type.color}-500/20 text-${type.color}-400 border-${type.color}-500/50 shadow-lg` 
                            : "bg-white/5 text-slate-500 border-white/5 hover:bg-white/10"
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-500 uppercase ml-2">নোটিশের বিস্তারিত</label>
                  <textarea 
                    required
                    placeholder="নোটিশের বিস্তারিত তথ্য এখানে লিখুন..."
                    className="w-full px-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 h-40 resize-none text-white font-bold transition-all placeholder:text-slate-700"
                    value={newNotice.content}
                    onChange={(e) => setNewNotice({...newNotice, content: e.target.value})}
                  />
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white py-6 rounded-[2rem] font-black uppercase text-sm shadow-[0_20px_40px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden group/btn"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  {loading ? 'প্রসেসিং...' : 'নোটিশ পাবলিশ করুন'}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
function Voting() {
  const { showToast } = useAuth();
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
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <div className="glass-card p-6 md:p-12 border border-white/5 relative overflow-hidden group shadow-[0_40px_80px_rgba(0,0,0,0.3)]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-8 mb-10 relative z-10">
          <div className="p-5 bg-indigo-500/10 rounded-[2rem] text-indigo-400 border border-indigo-500/20 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all">
            <Vote size={40} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white uppercase">নতুন ভোট তৈরি করুন</h2>
            <p className="text-xs font-black text-slate-500 uppercase mt-3 opacity-60">সদস্যদের মতামতের জন্য নতুন পোল তৈরি করুন</p>
          </div>
        </div>
        <form onSubmit={createPoll} className="flex flex-col md:flex-row gap-6 relative z-10">
          <input 
            type="text" 
            required
            placeholder="ভোটের বিষয় বা প্রশ্নটি এখানে লিখুন..."
            className="flex-1 px-8 py-6 bg-white/5 border border-white/5 rounded-[2rem] outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-bold text-lg transition-all placeholder:text-slate-700"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <motion.button 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white px-12 py-6 rounded-[2rem] font-black uppercase text-xs shadow-lg flex items-center gap-4 group/btn relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
            <Plus size={24} className="group-hover:rotate-90 transition-transform" /> 
            <span>তৈরি করুন</span>
          </motion.button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {polls.map((p, idx) => (
          <motion.div 
            key={p.id} 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="glass p-8 border border-white/5 relative overflow-hidden group shadow-xl"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[80px] -mr-24 -mt-24 transition-all group-hover:bg-indigo-500/20" />
            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-10 relative z-10 group-hover:text-indigo-400 transition-colors leading-tight">{p.question}</h3>
            <div className="space-y-8 relative z-10">
              {p.options.map((opt, idx) => {
                const total = p.votedBy.length || 1;
                const percent = Math.round((opt.votes / total) * 100);
                return (
                  <div key={idx} className="group/opt">
                    <div className="flex justify-between text-xs font-black uppercase mb-4">
                      <span className="text-slate-500 group-hover/opt:text-white transition-colors">{opt.text}</span>
                      <span className="text-indigo-400">{percent}% ({opt.votes})</span>
                    </div>
                    <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.5)] relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-center relative z-10">
              <div className="flex items-center gap-3 text-xs text-slate-500 font-black uppercase opacity-60">
                <Users size={14} />
                মোট ভোট: {p.votedBy.length}
              </div>
              <div className="text-xs text-slate-500 font-black uppercase opacity-60 flex items-center gap-2">
                <Clock size={14} />
                {format(new Date(p.createdAt), 'dd MMM yyyy')}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function ProfileRequestManagement() {
  const { showToast } = useAuth();
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
      showToast(`অনুরোধ ${action === 'approved' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'} হয়েছে।`);
    } catch (err) {
      console.error(err);
      showToast('ব্যর্থ হয়েছে।', 'error');
    }
  };

  if (loading) return (
    <div className="p-32 text-center">
      <div className="inline-block w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-8" />
      <p className="text-slate-500 font-black uppercase animate-pulse">লোড হচ্ছে...</p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-8 relative z-10">
          <div className="p-5 bg-indigo-500/10 rounded-[2rem] text-indigo-400 border border-indigo-500/20 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all">
            <UserCog size={40} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white uppercase">প্রোফাইল পরিবর্তনের অনুরোধ</h2>
            <p className="text-xs font-black text-slate-500 uppercase mt-3 opacity-60">সদস্যদের প্রোফাইল পরিবর্তনের আবেদনগুলো যাচাই করুন ({requests.length})</p>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {requests.length === 0 ? (
          <div className="glass-card p-32 border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-8">
            <div className="p-10 bg-white/5 rounded-[3rem] border border-white/5">
              <UserCheck size={64} className="text-slate-700" />
            </div>
            <p className="text-slate-500 font-black uppercase opacity-40">কোন পেন্ডিং অনুরোধ নেই।</p>
          </div>
        ) : (
          requests.map((req, idx) => (
            <motion.div 
              key={req.id} 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-card p-6 md:p-12 relative overflow-hidden group border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.3)] flex flex-col lg:flex-row justify-between gap-6 md:gap-12"
            >
              <div className="absolute left-0 top-0 w-2 h-full bg-indigo-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
              <div className="flex-1">
                <div className="flex items-center gap-6 mb-10">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group-hover:scale-110 transition-transform">
                    <User size={32} className="text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-black text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{req.userName}</h4>
                    <p className="text-xs text-slate-500 font-black uppercase mt-2 flex items-center gap-2">
                      <Clock size={14} />
                      {format(new Date(req.createdAt), 'PPpp')}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Object.entries(req.newData).map(([key, value]) => (
                    <div key={key} className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all group/field">
                      <p className="text-xs font-black text-slate-500 uppercase mb-3 group-hover/field:text-indigo-400 transition-colors uppercase">{key}</p>
                      <p className="text-lg text-white font-bold tracking-tight">{value as string}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex lg:flex-col items-center justify-center gap-6 min-w-[200px]">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAction(req, 'approved')}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-6 rounded-[2rem] font-black uppercase text-xs shadow-lg flex items-center justify-center gap-4 group/btn"
                >
                  <CheckCircle2 size={24} className="group-hover:scale-125 transition-transform" /> 
                  <span>অনুমোদন</span>
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAction(req, 'rejected')}
                  className="w-full glass border border-white/10 text-rose-400 py-6 rounded-[2rem] font-black uppercase text-xs hover:bg-rose-500/10 hover:border-rose-500/20 transition-all flex items-center justify-center gap-4 group/btn"
                >
                  <XCircle size={24} className="group-hover:rotate-90 transition-transform" /> 
                  <span>বাতিল</span>
                </motion.button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function PushNotificationPanel() {
  const { showToast } = useAuth();
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
        showToast('নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!');
        setTitle('');
        setBody('');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error(err);
      showToast('নোটিফিকেশন পাঠাতে ব্যর্থ হয়েছে: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <div className="flex items-center gap-4 md:gap-8 bg-white/5 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="p-5 bg-blue-500/10 rounded-[2rem] text-blue-400 border border-blue-500/20 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all relative z-10">
          <Bell size={40} />
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white uppercase">পুশ নোটিফিকেশন</h2>
          <p className="text-xs font-black text-slate-500 uppercase mt-3 opacity-60">সকল ইউজারের মোবাইলে সরাসরি নোটিফিকেশন পাঠান</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-6 md:p-12 border border-white/5 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32 transition-all group-hover:bg-blue-500/10" />
          
          <form onSubmit={handleSend} className="space-y-10 relative z-10">
            <div className="space-y-4">
              <label className="block text-xs font-black text-slate-500 uppercase ml-2">টাইটেল</label>
              <input 
                type="text" 
                required
                placeholder="যেমন: নতুন নোটিশ প্রকাশিত হয়েছে"
                className="w-full px-8 py-6 bg-white/5 border border-white/5 rounded-[2rem] outline-none focus:ring-2 focus:ring-blue-500/50 text-white font-bold text-lg transition-all placeholder:text-slate-700"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-black text-slate-500 uppercase ml-2">মেসেজ</label>
              <textarea 
                required
                rows={5}
                placeholder="বিস্তারিত মেসেজ লিখুন..."
                className="w-full px-8 py-6 bg-white/5 border border-white/5 rounded-[2rem] outline-none focus:ring-2 focus:ring-blue-500/50 text-white font-bold text-lg transition-all placeholder:text-slate-700 resize-none"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white py-8 rounded-[2.5rem] font-black uppercase text-sm shadow-[0_20px_40px_rgba(37,99,235,0.4)] flex items-center justify-center gap-6 disabled:opacity-50 relative overflow-hidden group/btn"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              {loading ? 'পাঠানো হচ্ছে...' : <><Bell size={24} className="group-hover:rotate-12 transition-transform" /> সকল ইউজারকে পাঠান</>}
            </motion.button>
          </form>
        </motion.div>

        <div className="space-y-8">
          <div className="glass-card p-10 border border-white/5 relative overflow-hidden group">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20">
                <Megaphone size={24} />
              </div>
              <div>
                <h4 className="text-xl font-black text-white uppercase tracking-tight">সতর্কতা</h4>
                <p className="text-xs text-slate-500 font-bold mt-1">নোটিফিকেশন পাঠানোর আগে টাইটেল এবং মেসেজ পুনরায় চেক করুন।</p>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-10 border border-white/5 relative overflow-hidden group">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20">
                <Smartphone size={24} />
              </div>
              <div>
                <h4 className="text-xl font-black text-white uppercase tracking-tight">সরাসরি ডেলিভারি</h4>
                <p className="text-xs text-slate-500 font-bold mt-1">এটি সকল ইউজারের ডিভাইসে রিয়েল-টাইম পুশ নোটিফিকেশন হিসেবে যাবে।</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function GlobalSettings() {
  const { showToast } = useAuth();
  const [settings, setSettings] = useState<AppSettings>({
    bkashNo: '',
    nagadNo: '',
    rocketNo: '',
    totalFund: 0,
    totalExpense: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onSnapshot(doc(db, 'settings', 'main'), (docSnap) => {
      if (docSnap.exists()) setSettings(docSnap.data() as AppSettings);
    });
  }, []);

  const saveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'main'), settings);
      showToast('সেটিংস সফলভাবে সেভ হয়েছে।');
    } catch (err) {
      console.error(err);
      showToast('সেটিংস সেভ করতে ব্যর্থ হয়েছে।', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <div className="flex items-center gap-8 bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="p-5 bg-indigo-500/10 rounded-[2rem] text-indigo-400 border border-indigo-500/20 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all relative z-10">
          <Settings size={40} />
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white uppercase">গ্লোবাল সেটিংস</h2>
          <p className="text-xs font-black text-slate-500 uppercase mt-3 opacity-60">অ্যাপের পেমেন্ট নম্বর এবং ফান্ড অ্যাডজাস্টমেন্ট করুন</p>
        </div>
      </div>

      <form onSubmit={saveSettings} className="space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
          <div className="space-y-8">
            <h3 className="text-xl font-black text-white uppercase flex items-center gap-4 transition-all">
              <CreditCard className="text-indigo-400" /> পেমেন্ট নম্বরসমূহ
            </h3>
            <div className="grid grid-cols-1 gap-6">
              {[
                { id: 'bkash', label: 'বিকাশ নম্বর', logo: 'https://www.logo.wine/a/logo/BKash/BKash-Logo.wine.svg', value: settings.bkashNo, setter: (v: string) => setSettings({...settings, bkashNo: v}) },
                { id: 'nagad', label: 'নগদ নম্বর', logo: 'https://www.logo.wine/a/logo/Nagad/Nagad-Logo.wine.svg', value: settings.nagadNo, setter: (v: string) => setSettings({...settings, nagadNo: v}) },
                { id: 'rocket', label: 'রকেট নম্বর', logo: 'https://www.logo.wine/a/logo/Dutch_Bangla_Bank/Dutch_Bangla_Bank-Logo.wine.svg', value: settings.rocketNo, setter: (v: string) => setSettings({...settings, rocketNo: v}) },
              ].map((item) => (
                <div key={item.id} className="flex items-center gap-6 p-8 glass border border-white/10 rounded-[2rem] group hover:border-white/20 transition-all relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-20 h-20 bg-white/5 rounded-2xl p-3 flex items-center justify-center border border-white/5 group-hover:scale-110 group-hover:rotate-3 transition-transform relative z-10">
                    <img src={item.logo} alt={item.label} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 relative z-10">
                    <label className="block text-xs font-black text-slate-500 uppercase mb-2">{item.label}</label>
                    <input 
                      type="text" 
                      className="w-full bg-transparent font-black text-white text-2xl outline-none placeholder:text-slate-700 tracking-tight"
                      value={item.value || ''}
                      onChange={(e) => item.setter(e.target.value)}
                      placeholder="নম্বর লিখুন..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-xl font-black text-white uppercase flex items-center gap-4 transition-all">
              <BarChart3 className="text-indigo-400" /> ফান্ড অ্যাডজাস্টমেন্ট
            </h3>
            <div className="glass-card p-10 border border-white/5 space-y-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32" />
              <div className="space-y-4 relative z-10">
                <label className="block text-xs font-black text-slate-500 uppercase ml-2">মোট ফান্ড (৳)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-indigo-500 text-xl">৳</span>
                  <input 
                    type="number" 
                    className="w-full pl-12 pr-6 py-6 bg-white/5 border border-white/5 rounded-[2rem] outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-black text-3xl transition-all"
                    value={settings.totalFund ?? 0}
                    onChange={(e) => setSettings({...settings, totalFund: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="space-y-4 relative z-10">
                <label className="block text-xs font-black text-slate-500 uppercase ml-2">মোট খরচ (৳)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-rose-500 text-xl">৳</span>
                  <input 
                    type="number" 
                    className="w-full pl-12 pr-6 py-6 bg-white/5 border border-white/5 rounded-[2rem] outline-none focus:ring-2 focus:ring-rose-500/50 text-white font-black text-3xl transition-all"
                    value={settings.totalExpense ?? 0}
                    onChange={(e) => setSettings({...settings, totalExpense: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 relative z-10">
                <p className="text-xs font-black text-slate-500 uppercase mb-2">বর্তমান ব্যালেন্স</p>
                <p className="text-4xl font-black text-white">৳{(settings.totalFund - settings.totalExpense).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <motion.button 
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white py-8 rounded-[2.5rem] font-black uppercase text-sm shadow-[0_20px_40px_rgba(79,70,229,0.4)] flex items-center justify-center gap-6 disabled:opacity-50 relative overflow-hidden group/btn"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
          {loading ? 'সেভ হচ্ছে...' : <><Check size={24} className="group-hover:scale-125 transition-transform" /> সেটিংস সেভ করুন</>}
        </motion.button>
      </form>
    </motion.div>
  );
}
