import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { AppSettings, FundTransaction, UserProfile, AdminNotice } from '../types';
import { Wallet, TrendingUp, TrendingDown, Users, Bell, ChevronRight, BarChart3, PieChart as PieChartIcon, Megaphone, Plus } from 'lucide-react';
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
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">স্বাগতম, {profile?.name}!</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">রামনগর যুব-কল্যান ফাউন্ডেশন ড্যাশবোর্ড</p>
        </div>
        <div className="relative">
          <button className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors">
            <Bell size={20} />
          </button>
          {notices.some(n => n.type === 'urgent') && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-ping" />
          )}
        </div>
      </header>

      {/* Notices Section */}
      <AnimatePresence>
        {notices.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {notices.map(notice => (
              <div key={notice.id} className={cn(
                "p-4 rounded-2xl border flex items-start gap-3 shadow-sm",
                notice.type === 'urgent' ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30" : 
                notice.type === 'warning' ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-900/30" : "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30"
              )}>
                <div className={cn(
                  "p-2 rounded-xl",
                  notice.type === 'urgent' ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" : 
                  notice.type === 'warning' ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400" : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                )}>
                  <Megaphone size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{notice.title}</h4>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                      {format(new Date(notice.createdAt), 'hh:mm a')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{notice.content}</p>
                </div>
              </div>
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
            transition: { staggerChildren: 0.1 }
          }
        }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">মোট ওয়েব ফান্ড</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">৳{settings?.totalFund ?? 0}</h3>
            </div>
          </div>
        </motion.div>

        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">মোট খরচ</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">৳{settings?.totalExpense ?? 0}</h3>
            </div>
          </div>
        </motion.div>

        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">বর্তমান ব্যালেন্স</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">৳{(settings?.totalFund ?? 0) - (settings?.totalExpense ?? 0)}</h3>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/fund" className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none flex flex-col items-center gap-2 hover:bg-blue-700 transition-all group">
          <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
            <Plus size={20} />
          </div>
          <span className="text-xs font-bold">টাকা জমা</span>
        </Link>
        <Link to="/voting" className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none flex flex-col items-center gap-2 hover:bg-indigo-700 transition-all group">
          <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
            <BarChart3 size={20} />
          </div>
          <span className="text-xs font-bold">ভোট দিন</span>
        </Link>
        <Link to="/posts" className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none flex flex-col items-center gap-2 hover:bg-emerald-700 transition-all group">
          <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
            <Megaphone size={20} />
          </div>
          <span className="text-xs font-bold">পোস্ট করুন</span>
        </Link>
        <Link to="/profile" className="bg-slate-800 text-white p-4 rounded-2xl shadow-lg shadow-slate-200 dark:shadow-none flex flex-col items-center gap-2 hover:bg-slate-900 transition-all group">
          <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
            <Users size={20} />
          </div>
          <span className="text-xs font-bold">প্রোফাইল</span>
        </Link>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-slate-800 dark:text-slate-100">আয়-ব্যয় গ্রাফ</h2>
            </div>
          </div>
          <div className="h-64">
            {chartData ? <Line data={chartData} options={chartOptions} /> : <div className="h-full bg-slate-50 dark:bg-slate-700/50 animate-pulse rounded-xl" />}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-slate-800 dark:text-slate-100">ব্যয় বিভাজন</h2>
          </div>
          <div className="h-64 flex items-center justify-center">
            {pieData ? (
              <Pie 
                data={pieData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom', labels: { color: darkMode ? '#94a3b8' : '#64748b', boxWidth: 10, font: { size: 10 } } } } 
                }} 
              />
            ) : (
              <div className="w-32 h-32 rounded-full border-8 border-slate-50 dark:border-slate-700 border-t-blue-500 animate-spin" />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
            <h2 className="font-bold text-slate-800 dark:text-slate-100">সাম্প্রতিক লেনদেন</h2>
            <Link to="/transactions" className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline flex items-center gap-1">
              সব দেখুন <ChevronRight size={16} />
            </Link>
          </div>
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
            }}
            className="divide-y divide-slate-50 dark:divide-slate-700"
          >
            {recentTransactions.length === 0 ? (
              <p className="p-6 text-center text-slate-400 text-sm">কোন লেনদেন পাওয়া যায়নি।</p>
            ) : (
              recentTransactions.map((t) => (
                <motion.div 
                  key={t.id} 
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    visible: { opacity: 1, x: 0 }
                  }}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      t.type === 'income' ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    )}>
                      {t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{t.userName}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{t.category} • {format(new Date(t.date), 'dd MMM yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-bold",
                      t.type === 'income' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {t.type === 'income' ? '+' : '-'}৳{t.amount}
                    </p>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium",
                      t.status === 'approved' ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" : 
                      t.status === 'pending' ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                    )}>
                      {t.status === 'approved' ? 'গৃহীত' : t.status === 'pending' ? 'পেন্ডিং' : 'বাতিল'}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        </div>

        {/* Top Contributors */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
            <h2 className="font-bold text-slate-800 dark:text-slate-100">শীর্ষ দাতা</h2>
            <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs">
              <Users size={14} /> মোট সদস্য: {users.length}
            </div>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {users.map((u, idx) => (
              <div key={u.uid} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1">
                      {u.name} {u.role === 'admin' && <span title="অ্যাডমিন">👑</span>}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {profile?.role === 'admin' || u.uid === profile?.uid ? u.address : 'ঠিকানা সংরক্ষিত'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600 dark:text-blue-400">
                    {u.contributionVisibility ? `৳${u.totalContribution}` : '৳••••'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

