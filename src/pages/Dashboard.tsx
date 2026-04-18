import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { AppSettings, FundTransaction, UserProfile, AdminNotice } from '../types';
import { Wallet, TrendingUp, TrendingDown, Users, Bell, ChevronRight, BarChart3, PieChart as PieChartIcon, Megaphone, Plus, Shield, History as HistoryIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const { profile, darkMode } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<FundTransaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [pieData, setPieData] = useState<any>(null);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (docSnap) => {
      if (docSnap.exists()) setSettings(docSnap.data() as AppSettings);
    });

    const qTrans = query(collection(db, 'transactions'), where('status', '==', 'approved'));
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      const trans = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as FundTransaction))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);
      setRecentTransactions(trans);
    });

    const qUsers = query(collection(db, 'users'), orderBy('totalContribution', 'desc'), limit(5));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      setUsers(snap.docs.map(d => d.data() as UserProfile));
    });

    const qNotices = query(collection(db, 'notices'), where('active', '==', true));
    const unsubNotices = onSnapshot(qNotices, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminNotice));
      setNotices(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3));
    });

    // Process Chart Data
    const qAllTrans = query(collection(db, 'transactions'), where('status', '==', 'approved'));
    const unsubAllTrans = onSnapshot(qAllTrans, (snap) => {
      const allTrans = snap.docs
        .map(d => d.data() as FundTransaction)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Monthly data for last 6 months
      const months = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), 'MMM'));
      const incomeData = new Array(6).fill(0);
      const expenseData = new Array(6).fill(0);

      allTrans.forEach(t => {
        const tDate = new Date(t.date);
        for (let i = 0; i < 6; i++) {
          const mDate = subMonths(new Date(), 5 - i);
          if (tDate.getMonth() === mDate.getMonth() && tDate.getFullYear() === mDate.getFullYear()) {
            if (t.type === 'income') incomeData[i] += t.amount;
            else expenseData[i] += t.amount;
          }
        }
      });

      setChartData({
        labels: months,
        datasets: [
          {
            label: 'আয়',
            data: incomeData,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'ব্যয়',
            data: expenseData,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.4,
          }
        ]
      });

      // Pie chart for categories
      const categories: { [key: string]: number } = {};
      allTrans.filter(t => t.type === 'expense').forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });

      setPieData({
        labels: Object.keys(categories),
        datasets: [{
          data: Object.values(categories),
          backgroundColor: [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#ec4899'
          ]
        }]
      });
    });

    return () => {
      unsubSettings();
      unsubTrans();
      unsubUsers();
      unsubNotices();
      unsubAllTrans();
    };
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top' as const, 
        labels: { 
          color: darkMode ? '#f1f5f9' : '#1e293b',
          font: { family: 'Inter', weight: 'bold' as const } 
        } 
      },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      y: { 
        beginAtZero: true, 
        grid: { color: darkMode ? '#334155' : '#f1f5f9' },
        ticks: { color: darkMode ? '#94a3b8' : '#64748b' }
      },
      x: { 
        grid: { display: false },
        ticks: { color: darkMode ? '#94a3b8' : '#64748b' }
      },
    },
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
            স্বাগতম, <span className="text-gradient drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">{profile?.name}</span>!
          </motion.h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] mt-4 opacity-80 flex items-center gap-3">
            <span className="w-8 h-[1px] bg-indigo-500/50" />
            রামনগর যুব-কল্যান ফাউন্ডেশন ড্যাশবোর্ড
          </p>
        </div>
        <div className="relative group perspective-1000">
          <motion.button 
            whileHover={{ scale: 1.1, rotateY: 15, rotateX: -10 }}
            whileTap={{ scale: 0.9 }}
            className="p-6 glass rounded-[2.5rem] text-slate-400 hover:text-indigo-400 transition-all border border-white/5 hover:border-indigo-500/30 shadow-[0_20px_40px_rgba(0,0,0,0.3)] relative overflow-hidden group/btn"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
            <Bell size={32} className="relative z-10" />
          </motion.button>
          {notices.some(n => n.type === 'urgent') && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 border-4 border-slate-950 rounded-full animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.8)] z-20" />
          )}
        </div>
      </header>

      {/* Notices Section */}
      <AnimatePresence>
        {notices.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {notices.map((notice, idx) => (
              <motion.div 
                key={notice.id} 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -10, scale: 1.02, rotateX: 2, rotateY: -2 }}
                className={cn(
                  "p-8 rounded-[3rem] border flex items-start gap-6 shadow-[0_30px_60px_rgba(0,0,0,0.2)] backdrop-blur-3xl relative overflow-hidden group preserve-3d",
                  notice.type === 'urgent' ? "bg-rose-500/5 border-rose-500/20" : 
                  notice.type === 'warning' ? "bg-amber-500/5 border-amber-500/20" : "bg-indigo-500/5 border-indigo-500/20"
                )}
              >
                <div className={cn(
                  "absolute -top-10 -right-10 w-40 h-40 blur-[60px] opacity-20 transition-all group-hover:scale-150 group-hover:opacity-40",
                  notice.type === 'urgent' ? "bg-rose-500" : notice.type === 'warning' ? "bg-amber-500" : "bg-indigo-500"
                )} />
                <div className={cn(
                  "p-5 rounded-2xl relative z-10 shadow-2xl border border-white/5",
                  notice.type === 'urgent' ? "bg-rose-500/20 text-rose-400" : 
                  notice.type === 'warning' ? "bg-amber-500/20 text-amber-400" : "bg-indigo-500/20 text-indigo-400"
                )}>
                  <Megaphone size={28} />
                </div>
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-black text-white text-lg truncate uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{notice.title}</h4>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] shrink-0 ml-4 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                      {format(new Date(notice.createdAt), 'hh:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed line-clamp-2 font-bold group-hover:text-slate-300 transition-colors">{notice.content}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
          }
        }}
        className="grid grid-cols-1 md:grid-cols-3 gap-10"
      >
        {[
          { icon: Wallet, label: 'মোট ফান্ড', value: settings?.totalFund ?? 0, color: 'indigo', gradient: 'from-indigo-500 to-blue-600' },
          { icon: TrendingDown, label: 'মোট খরচ', value: settings?.totalExpense ?? 0, color: 'rose', gradient: 'from-rose-500 to-pink-600' },
          { icon: TrendingUp, label: 'বর্তমান ব্যালেন্স', value: (settings?.totalFund ?? 0) - (settings?.totalExpense ?? 0), color: 'emerald', gradient: 'from-emerald-500 to-teal-600' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            variants={{
              hidden: { opacity: 0, y: 50, rotateX: -20, scale: 0.9 },
              visible: { opacity: 1, y: 0, rotateX: 0, scale: 1 }
            }}
            whileHover={{ y: -15, rotateY: 8, scale: 1.03, rotateX: -5 }}
            className="glass-card p-12 border border-white/5 relative overflow-hidden group preserve-3d shadow-[0_40px_80px_rgba(0,0,0,0.3)]"
          >
            <div className={cn(
              "absolute -top-20 -right-20 w-64 h-64 blur-[100px] opacity-10 transition-all group-hover:scale-150 group-hover:opacity-20",
              stat.color === 'indigo' ? "bg-indigo-500" : stat.color === 'rose' ? "bg-rose-500" : "bg-emerald-500"
            )} />
            <div className="flex flex-col gap-8 relative z-10">
              <div className={cn(
                "w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl border border-white/10 group-hover:rotate-12 transition-transform",
                stat.color === 'indigo' ? "bg-indigo-500/20 text-indigo-400" : stat.color === 'rose' ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
              )}>
                <stat.icon size={40} />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-3 opacity-60">{stat.label}</p>
                <h3 className={cn("text-5xl font-black tracking-tighter text-white")}>
                  ৳{stat.value.toLocaleString()}
                </h3>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r opacity-30 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-from), var(--tw-gradient-to))` }} />
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {[
          { to: "/fund", icon: Plus, label: "টাকা জমা", color: "from-indigo-600 via-indigo-500 to-blue-600", shadow: "shadow-indigo-500/20" },
          { to: "/voting", icon: BarChart3, label: "ভোট দিন", color: "from-purple-600 via-purple-500 to-indigo-600", shadow: "shadow-purple-500/20" },
          { to: "/posts", icon: Megaphone, label: "পোস্ট করুন", color: "from-rose-600 via-rose-500 to-purple-600", shadow: "shadow-rose-500/20" },
          { to: "/profile", icon: Users, label: "প্রোফাইল", color: "from-slate-800 via-slate-900 to-slate-950", shadow: "shadow-black/40" }
        ].map((action, i) => (
          <motion.div
            key={action.to}
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
          >
            <Link to={action.to} className={cn(
              "relative h-48 rounded-[3.5rem] overflow-hidden flex flex-col items-center justify-center gap-5 transition-all hover:scale-105 active:scale-95 group border border-white/10",
              "bg-gradient-to-br", action.color, action.shadow
            )}>
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 blur-2xl rounded-full group-hover:scale-150 transition-transform" />
              <div className="p-5 bg-white/10 rounded-2xl group-hover:rotate-12 group-hover:scale-110 transition-all relative z-10 shadow-2xl border border-white/20 backdrop-blur-md">
                <action.icon size={32} className="text-white" />
              </div>
              <span className="text-[10px] font-black text-white tracking-[0.3em] uppercase relative z-10 drop-shadow-md">{action.label}</span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2 glass-card p-12 border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.3)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-12 relative z-10">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20 shadow-inner">
                <BarChart3 size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">আয়-ব্যয় গ্রাফ</h2>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">বিগত ৬ মাসের আর্থিক চিত্র</p>
              </div>
            </div>
          </div>
          <div className="h-[400px] relative z-10">
            {chartData ? <Line data={chartData} options={chartOptions} /> : <div className="h-full bg-white/5 animate-pulse rounded-[3rem]" />}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-12 border border-white/5 flex flex-col shadow-[0_40px_80px_rgba(0,0,0,0.3)] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-purple-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="flex items-center gap-6 mb-12 relative z-10">
            <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400 border border-purple-500/20 shadow-inner">
              <PieChartIcon size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">ব্যয় বিভাজন</h2>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">খাত ভিত্তিক খরচ</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[350px] relative z-10">
            {pieData ? (
              <Pie 
                data={pieData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { 
                      position: 'bottom', 
                      labels: { 
                        color: '#94a3b8', 
                        boxWidth: 12, 
                        padding: 30,
                        usePointStyle: true,
                        font: { size: 11, weight: 'bold', family: 'Inter' } 
                      } 
                    } 
                  } 
                }} 
              />
            ) : (
              <div className="w-56 h-56 rounded-full border-[18px] border-white/5 border-t-indigo-500 animate-spin shadow-[0_0_50px_rgba(79,70,229,0.3)]" />
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Recent Transactions */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card overflow-hidden flex flex-col border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.3)]"
        >
          <div className="p-12 border-b border-white/5 flex justify-between items-center bg-white/5">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20 shadow-inner">
                <HistoryIcon size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">সাম্প্রতিক লেনদেন</h2>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">সর্বশেষ ১০টি ট্রানজেকশন</p>
              </div>
            </div>
            <Link to="/transactions" className="group/link flex items-center gap-3 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:text-indigo-300 transition-all">
              সব দেখুন 
              <div className="p-2 bg-indigo-500/10 rounded-xl group-hover/link:translate-x-2 transition-transform">
                <ChevronRight size={20} />
              </div>
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentTransactions.length === 0 ? (
              <div className="p-24 text-center">
                <p className="text-slate-500 font-black uppercase tracking-[0.4em] opacity-40">কোন লেনদেন পাওয়া যায়নি।</p>
              </div>
            ) : (
              recentTransactions.map((t, i) => (
                <motion.div 
                  key={t.id} 
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + i * 0.05 }}
                  className="p-10 flex items-center justify-between hover:bg-white/5 transition-all group cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 w-1 h-full bg-indigo-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                  <div className="flex items-center gap-8 relative z-10">
                    <div className={cn(
                      "p-5 rounded-2xl transition-all group-hover:scale-110 group-hover:rotate-12 shadow-2xl border",
                      t.type === 'income' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                      {t.type === 'income' ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
                    </div>
                    <div>
                      <p className="font-black text-white text-xl uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{t.userName}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">{t.category}</span>
                        <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{format(new Date(t.date), 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right relative z-10">
                    <p className={cn(
                      "text-3xl font-black tracking-tighter",
                      t.type === 'income' ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {t.type === 'income' ? '+' : '-'}৳{t.amount.toLocaleString()}
                    </p>
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

        {/* Top Contributors */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card overflow-hidden flex flex-col border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.3)]"
        >
          <div className="p-12 border-b border-white/5 flex justify-between items-center bg-white/5">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20 shadow-inner">
                <Users size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">শীর্ষ দাতা</h2>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">সর্বোচ্চ অবদানকারী সদস্যগণ</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
              <Shield size={18} /> {users.length} সদস্য
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {users.map((u, idx) => (
              <motion.div 
                key={u.uid} 
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + idx * 0.05 }}
                className="p-10 flex items-center justify-between hover:bg-white/5 transition-all group relative overflow-hidden"
              >
                <div className="absolute right-0 top-0 w-1 h-full bg-amber-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom" />
                <div className="flex items-center gap-8 relative z-10">
                  <div className={cn(
                    "w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-xl transition-all border shadow-2xl preserve-3d",
                    idx === 0 ? "bg-gradient-to-br from-amber-400 to-orange-600 text-white border-amber-300 scale-110 shadow-amber-500/30 rotate-12" : 
                    idx === 1 ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white border-slate-200" :
                    idx === 2 ? "bg-gradient-to-br from-orange-500 to-red-700 text-white border-orange-400" : "bg-white/5 text-slate-500 border-white/10"
                  )}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-black text-white text-xl uppercase tracking-tight flex items-center gap-3 group-hover:text-amber-400 transition-colors">
                      {u.name} {u.role === 'admin' && <Shield size={18} className="text-indigo-400" />}
                    </p>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500/30" />
                      {profile?.role === 'admin' || u.uid === profile?.uid ? u.address : 'ঠিকানা সংরক্ষিত'}
                    </p>
                  </div>
                </div>
                <div className="text-right relative z-10">
                  <p className="text-3xl font-black text-white tracking-tighter group-hover:text-amber-400 transition-colors">
                    {u.contributionVisibility ? `৳${u.totalContribution.toLocaleString()}` : '৳••••'}
                  </p>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-2">মোট অবদান</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

