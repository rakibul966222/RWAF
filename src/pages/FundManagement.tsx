import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Wallet, 
  History as HistoryIcon, 
  CheckCircle2, 
  Clock, 
  X, 
  CreditCard, 
  Smartphone,
  Shield,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';
import { auth, db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function FundManagement() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [txId, setTxId] = useState('');
  const [method, setMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const fetchProfile = async () => {
      const docRef = doc(db, 'users', auth.currentUser!.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    };

    fetchProfile();
    return () => unsubscribe();
  }, []);

  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Unknown User',
        amount: Number(amount),
        method,
        txId,
        status: 'pending',
        date: new Date().toISOString(),
        category: 'Contribution'
      });
      setIsAddModalOpen(false);
      setAmount('');
      setTxId('');
    } catch (error) {
      console.error('Error adding money:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMethodNumber = () => {
    switch (method) {
      case 'bkash': return '017XXXXXXXX';
      case 'nagad': return '018XXXXXXXX';
      case 'rocket': return '019XXXXXXXX';
      default: return '';
    }
  };

  return (
    <div className="space-y-12 perspective-1000 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
        <div className="relative group">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <motion.h1 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl md:text-6xl font-black text-white tracking-tighter uppercase relative"
          >
            ফান্ড <span className="text-gradient drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">ম্যানেজমেন্ট</span>
          </motion.h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] mt-4 opacity-80 flex items-center gap-3">
            <span className="w-8 h-[1px] bg-indigo-500/50" />
            আপনার জমার হিসাব এবং নতুন জমা
          </p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05, y: -5, rotateX: -10 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAddModalOpen(true)}
          className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white px-12 py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-[0_20px_40px_rgba(79,70,229,0.4)] flex items-center gap-4 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus size={28} className="group-hover:rotate-90 transition-transform" /> 
          <span>টাকা জমা দিন</span>
        </motion.button>
      </header>

      {/* User Stats Card */}
      <motion.div 
        initial={{ opacity: 0, y: 50, rotateX: -15 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        whileHover={{ y: -10, rotateY: 5, scale: 1.01 }}
        className="glass-card relative overflow-hidden group border border-white/5 preserve-3d shadow-[0_40px_80px_rgba(0,0,0,0.3)]"
      >
        <div className="absolute -top-20 -right-20 w-[30rem] h-[30rem] bg-indigo-600/10 blur-[120px] transition-all group-hover:scale-125 group-hover:opacity-20" />
        <div className="p-12 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-16">
            <div className="space-y-4">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] opacity-60">আপনার মোট জমা</p>
              <h2 className="text-7xl md:text-8xl font-black text-gradient drop-shadow-[0_0_20px_rgba(99,102,241,0.2)]">৳{profile?.totalContribution?.toLocaleString() || 0}</h2>
            </div>
            <motion.div 
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="p-8 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-[3rem] text-indigo-400 border border-indigo-500/20 shadow-2xl backdrop-blur-md"
            >
              <Wallet size={64} className="drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            </motion.div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
            <div className="p-8 glass border border-white/10 rounded-[2.5rem] group/item hover:border-indigo-500/30 transition-all relative overflow-hidden">
              <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover/item:opacity-100 transition-opacity" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4 relative z-10">এই মাসে জমা</p>
              <p className="text-4xl font-black text-white relative z-10">৳0</p>
            </div>
            <div className="p-8 glass border border-white/10 rounded-[2.5rem] group/item hover:border-purple-500/30 transition-all relative overflow-hidden">
              <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover/item:opacity-100 transition-opacity" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4 relative z-10">সদস্যপদ ধরণ</p>
              <p className="text-4xl font-black text-white uppercase tracking-tighter relative z-10">{profile?.subscriptionType === 'monthly' ? 'মাসিক' : 'বাৎসরিক'}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Transaction History */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card overflow-hidden flex flex-col border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.3)]"
      >
        <div className="p-12 border-b border-white/5 flex items-center gap-6 bg-white/5">
          <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20 shadow-inner">
            <HistoryIcon size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">জমার ইতিহাস</h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">আপনার সকল লেনদেনের তালিকা</p>
          </div>
        </div>
        <div className="divide-y divide-white/5">
          {transactions.length === 0 ? (
            <div className="p-24 text-center">
              <p className="text-slate-500 font-black uppercase tracking-[0.4em] opacity-40">আপনি এখনো কোন টাকা জমা দেননি।</p>
            </div>
          ) : (
            transactions.map((t, i) => (
              <motion.div 
                key={t.id} 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="p-10 flex items-center justify-between hover:bg-white/5 transition-all group relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 w-1 h-full bg-indigo-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                <div className="flex items-center gap-8 relative z-10">
                  <div className={cn(
                    "p-5 rounded-2xl transition-all group-hover:scale-110 group-hover:rotate-12 shadow-2xl border",
                    t.status === 'approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                    t.status === 'pending' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  )}>
                    {t.status === 'approved' ? <CheckCircle2 size={28} /> : <Clock size={28} />}
                  </div>
                  <div>
                    <p className="font-black text-white text-xl uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{t.category}</p>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500/30" />
                      {format(new Date(t.date), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  </div>
                </div>
                <div className="text-right relative z-10">
                  <p className="text-3xl font-black text-white tracking-tighter group-hover:text-indigo-400 transition-colors">৳{t.amount.toLocaleString()}</p>
                  <span className={cn(
                    "text-[9px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest mt-3 inline-block border shadow-sm",
                    t.status === 'approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                    t.status === 'pending' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  )}>
                    {t.status === 'approved' ? 'গৃহীত' : t.status === 'pending' ? 'পেন্ডিং' : 'বাতিল'}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Add Money Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 100, rotateX: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 100, rotateX: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl glass-card border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.6)] overflow-hidden rounded-[3.5rem]"
            >
              <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 p-12 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] -mr-32 -mt-32 animate-pulse"></div>
                <div className="relative z-10">
                  <h3 className="text-4xl font-black uppercase tracking-tighter">টাকা জমা দিন</h3>
                  <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.3em] mt-4 opacity-80">নিচের যে কোন মাধ্যমে টাকা পাঠিয়ে তথ্য দিন</p>
                </div>
                <motion.button 
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsAddModalOpen(false)}
                  className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors"
                >
                  <X size={24} />
                </motion.button>
              </div>
              
              <form onSubmit={handleAddMoney} className="p-12 space-y-10">
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { id: 'bkash', label: 'বিকাশ', color: 'rose', logo: 'https://www.logo.wine/a/logo/BKash/BKash-Logo.wine.svg' },
                    { id: 'nagad', label: 'নগদ', color: 'orange', logo: 'https://www.logo.wine/a/logo/Nagad/Nagad-Logo.wine.svg' },
                    { id: 'rocket', label: 'রকেট', color: 'purple', logo: 'https://www.logo.wine/a/logo/Dutch_Bangla_Bank/Dutch_Bangla_Bank-Logo.wine.svg' },
                  ].map((item) => (
                    <motion.button 
                      key={item.id}
                      whileHover={{ scale: 1.05, y: -8, rotateY: 10 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setMethod(item.id as any)}
                      className={cn(
                        "flex flex-col items-center gap-4 p-8 rounded-[2.5rem] border-2 transition-all shadow-2xl relative overflow-hidden group/method",
                        method === item.id 
                          ? `border-indigo-500 bg-indigo-500/10 shadow-indigo-500/20` 
                          : "border-white/5 bg-white/5 hover:border-white/10"
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/method:opacity-100 transition-opacity" />
                      <img src={item.logo} alt={item.label} className="w-16 h-16 object-contain relative z-10 drop-shadow-lg" referrerPolicy="no-referrer" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest relative z-10">{item.label}</span>
                      {method === item.id && (
                        <motion.div 
                          layoutId="method-active"
                          className="absolute -bottom-1 w-12 h-1 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.8)]"
                        />
                      )}
                    </motion.button>
                  ))}
                </div>

                <div className="p-10 glass border border-white/10 rounded-[3rem] relative overflow-hidden group/number shadow-inner">
                  <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-500/10 blur-[60px] transition-all group-hover/number:scale-150"></div>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mb-4 relative z-10 opacity-60">সেন্ড মানি করুন এই নম্বরে:</p>
                  <div className="flex items-center justify-between relative z-10">
                    <p className="text-5xl font-black text-white tracking-tighter drop-shadow-md">{getMethodNumber()}</p>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-indigo-400">
                      <Smartphone size={32} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">টাকার পরিমাণ</label>
                    <div className="relative group/input">
                      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur opacity-0 group-hover/input:opacity-100 transition-opacity" />
                      <span className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-indigo-400 text-3xl relative z-10">৳</span>
                      <input
                        type="number"
                        required
                        className="w-full pl-16 pr-8 py-6 glass border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none font-black text-3xl text-white placeholder:text-slate-800 relative z-10 transition-all"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">ট্রানজেকশন আইডি (TxID)</label>
                    <div className="relative group/input">
                      <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-3xl blur opacity-0 group-hover/input:opacity-100 transition-opacity" />
                      <input
                        type="text"
                        required
                        className="w-full px-8 py-6 glass border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none font-black text-xl text-white placeholder:text-slate-800 uppercase tracking-[0.2em] relative z-10 transition-all"
                        value={txId}
                        onChange={(e) => setTxId(e.target.value)}
                        placeholder="ABC123XYZ"
                      />
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02, y: -5, rotateX: -5 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white py-8 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-sm shadow-[0_30px_60px_rgba(79,70,229,0.4)] flex items-center justify-center gap-6 disabled:opacity-50 relative overflow-hidden group/submit"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/submit:opacity-100 transition-opacity" />
                  {loading ? (
                    <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><CreditCard size={32} className="group-hover:scale-110 transition-transform" /> রিকোয়েস্ট পাঠান</>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
