import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { FundTransaction } from '../types';
import { TrendingUp, TrendingDown, Search, Filter, Calendar, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Transactions() {
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), where('status', '==', 'approved'));

    return onSnapshot(q, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as FundTransaction));
      
      if (filter !== 'all') {
        data = data.filter(t => t.type === filter);
      }

      setTransactions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    });
  }, [filter]);

  const filteredTransactions = transactions.filter(t => 
    t.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 perspective-1000">
      <header>
        <h1 className="text-4xl font-black text-white tracking-tight uppercase">লেনদেন ইতিহাস</h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-3 opacity-80">ফাউন্ডেশনের সকল আয় ও ব্যয়ের বিস্তারিত তালিকা</p>
      </header>

      <div className="glass-card p-8 border border-white/5 flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative group">
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="text" 
            placeholder="খুঁজুন (নাম, ক্যাটাগরি...)"
            className="w-full pl-14 pr-6 py-4 glass border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder:text-slate-700 font-bold tracking-tight transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          {[
            { id: 'all', label: 'সব' },
            { id: 'income', label: 'আয়' },
            { id: 'expense', label: 'ব্যয়' },
          ].map((btn) => (
            <motion.button
              key={btn.id}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(btn.id as any)}
              className={cn(
                "px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                filter === btn.id 
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-[0_10px_20px_rgba(79,70,229,0.3)]" 
                  : "glass border-white/5 text-slate-500 hover:text-white hover:border-white/20"
              )}
            >
              {btn.label}
            </motion.button>
          ))}
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden border border-white/5"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/5 text-slate-500 text-[10px] uppercase font-black tracking-[0.2em]">
              <tr>
                <th className="px-10 py-6">লেনদেন</th>
                <th className="px-10 py-6">ক্যাটাগরি</th>
                <th className="px-10 py-6">তারিখ</th>
                <th className="px-10 py-6">পরিমান</th>
                <th className="px-10 py-6">বিস্তারিত</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-10 py-24 text-center">
                    <div className="w-12 h-12 border-[6px] border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6 shadow-[0_0_20px_rgba(79,70,229,0.2)]" />
                    <p className="text-slate-500 font-black uppercase tracking-[0.3em]">লোড হচ্ছে...</p>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-24 text-center text-slate-500 font-black uppercase tracking-[0.3em]">কোন লেনদেন পাওয়া যায়নি।</td>
                </tr>
              ) : (
                filteredTransactions.map((t, i) => (
                  <motion.tr 
                    layout 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    key={t.id} 
                    className="hover:bg-white/5 transition-all group"
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "p-4 rounded-2xl transition-all group-hover:scale-110 group-hover:rotate-6 shadow-lg",
                          t.type === 'income' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        )}>
                          {t.type === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                        </div>
                        <div>
                          <p className="font-black text-white text-lg uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{t.userName}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-2">{t.type === 'income' ? 'আয়' : 'ব্যয়'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className="px-4 py-2 glass border border-white/10 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:border-indigo-500/30 group-hover:text-indigo-400 transition-all">
                        {t.category}
                      </span>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-3 text-slate-500 text-xs font-bold uppercase tracking-widest">
                        <Calendar size={14} className="text-indigo-500" />
                        {format(new Date(t.date), 'dd MMM yyyy')}
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <p className={cn(
                        "text-2xl font-black tracking-tight",
                        t.type === 'income' ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {t.type === 'income' ? '+' : '-'}৳{t.amount}
                      </p>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        {t.fbLink && (
                          <motion.a 
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            href={t.fbLink} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="p-3 glass border border-white/10 text-indigo-400 hover:text-indigo-300 hover:border-indigo-500/30 rounded-xl transition-all shadow-lg"
                          >
                            <ExternalLink size={18} />
                          </motion.a>
                        )}
                        <span className="text-xs text-slate-500 font-bold max-w-[200px] truncate opacity-60 group-hover:opacity-100 transition-opacity">{t.description}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
