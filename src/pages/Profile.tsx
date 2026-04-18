import React, { useState, FormEvent } from 'react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { User, MapPin, Calendar, Mail, Phone, Facebook, Shield, Edit3, Eye, EyeOff, Sparkles, Zap, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Profile() {
  const { user, profile, showToast } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: profile?.name || '',
    address: profile?.address || '',
    dob: profile?.dob || '',
  });
  const [loading, setLoading] = useState(false);

  if (!profile) return null;

  const handleUpdateVisibility = async () => {
    await updateDoc(doc(db, 'users', profile.uid), {
      contributionVisibility: !profile.contributionVisibility
    });
  };

  const handleSubmitRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'profile_requests'), {
        userId: user.uid,
        userName: profile.name,
        newData: editData,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      showToast('আপনার প্রোফাইল পরিবর্তনের অনুরোধ অ্যাডমিনের কাছে পাঠানো হয়েছে। অনুমোদিত হলে প্রোফাইল আপডেট হবে।');
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      showToast('অনুরোধ পাঠাতে ব্যর্থ হয়েছে।', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20 perspective-1000">
      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: 50, rotateX: -10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="glass-card relative overflow-hidden group border border-white/10 preserve-3d shadow-[0_40px_80px_rgba(0,0,0,0.4)]"
      >
        <div className="h-64 bg-gradient-to-br from-indigo-900 via-purple-900 to-rose-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
          
          {/* Animated particles background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -100],
                  opacity: [0, 0.5, 0],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: Math.random() * 5 + 5,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                }}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  bottom: `${Math.random() * 100}%`,
                }}
              />
            ))}
          </div>

          <div className="absolute top-10 right-10 flex gap-4">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 10 }}
              className="p-3 glass border border-white/20 rounded-2xl text-indigo-400 shadow-2xl"
            >
              <Sparkles size={20} />
            </motion.div>
          </div>
        </div>

        <div className="px-12 pb-12 relative">
          <div className="relative -mt-32 mb-10 flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="flex flex-col md:flex-row items-end gap-8">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 2, z: 50 }}
                className="w-48 h-48 glass p-3 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] border border-white/30 relative z-20 preserve-3d"
              >
                <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-600 rounded-[2.5rem] flex items-center justify-center text-6xl font-black text-white shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 blur-2xl opacity-50"></div>
                  <span className="relative z-10 drop-shadow-2xl">{profile.name[0]}</span>
                </div>
                <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center border-4 border-slate-950 shadow-xl">
                  <Zap size={20} className="text-white fill-white" />
                </div>
              </motion.div>

              <div className="space-y-2 pb-4">
                <div className="flex items-center gap-4">
                  <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">
                    {profile.name}
                  </h1>
                  {profile.role === 'admin' && (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30"
                    >
                      <Shield size={24} className="text-indigo-400" />
                    </motion.div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 font-black uppercase tracking-[0.2em] text-[10px]">
                    {profile.profession || 'সদস্য'}
                  </span>
                  <span className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                    <Activity size={12} /> একটিভ মেম্বার
                  </span>
                </div>
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.05, y: -5, boxShadow: "0 20px 40px rgba(79,70,229,0.3)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsEditing(!isEditing)}
              className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-4 shadow-2xl border border-white/10"
            >
              <Edit3 size={18} /> প্রোফাইল এডিট
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {[
              { icon: MapPin, label: 'ঠিকানা', value: profile.address, color: 'text-rose-400' },
              { icon: Calendar, label: 'জন্ম তারিখ', value: profile.dob, color: 'text-amber-400' },
              { icon: Mail, label: 'ইমেইল', value: profile.email, color: 'text-indigo-400' },
              { icon: Phone, label: 'মোবাইল', value: profile.mobileNo, color: 'text-emerald-400' },
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 glass border border-white/5 rounded-[2rem] group hover:border-white/20 transition-all hover:bg-white/5"
              >
                <div className={cn("p-4 bg-white/5 rounded-2xl mb-4 w-fit group-hover:scale-110 transition-transform", item.color)}>
                  <item.icon size={24} />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{item.label}</p>
                <p className="text-sm text-white font-black truncate">{item.value || 'N/A'}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-2 glass-card p-12 border border-white/10 flex flex-col md:flex-row justify-between items-center gap-10 relative overflow-hidden group shadow-2xl"
        >
          <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 blur-[120px] -ml-48 -mt-48 pointer-events-none"></div>
          <div className="relative z-10 space-y-4">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">আপনার মোট কন্ট্রিবিউশন</p>
            <div className="flex items-baseline gap-4">
              <span className="text-7xl font-black text-gradient drop-shadow-2xl">৳{profile.totalContribution}</span>
              <span className="text-emerald-500 font-black text-sm uppercase tracking-widest">+১২% এই মাসে</span>
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleUpdateVisibility}
            className={cn(
              "relative z-10 flex items-center gap-4 px-10 py-5 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] transition-all border shadow-2xl",
              profile.contributionVisibility 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10" 
                : "bg-white/5 text-slate-500 border-white/10"
            )}
          >
            {profile.contributionVisibility ? <><Eye size={20} /> পাবলিকলি দৃশ্যমান</> : <><EyeOff size={20} /> ব্যক্তিগত</>}
          </motion.button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-12 border border-white/10 flex flex-col justify-center items-center text-center relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
          <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/20">
            <Zap size={32} />
          </div>
          <h3 className="text-3xl font-black text-white mb-2">লেভেল ৫</h3>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">ফাউন্ডেশন মেম্বারশিপ</p>
        </motion.div>
      </div>

      {/* Edit Form */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="glass-card p-16 border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative z-30"
          >
            <div className="flex justify-between items-center mb-12">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter">প্রোফাইল পরিবর্তনের অনুরোধ</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-white transition-colors">
                <Zap size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitRequest} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">আপনার নাম</label>
                  <input 
                    type="text" 
                    className="w-full px-8 py-6 glass border border-white/10 rounded-[2rem] outline-none focus:ring-2 focus:ring-indigo-500 text-white font-black placeholder:text-slate-800 transition-all"
                    value={editData.name || ''}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">বর্তমান ঠিকানা</label>
                  <input 
                    type="text" 
                    className="w-full px-8 py-6 glass border border-white/10 rounded-[2rem] outline-none focus:ring-2 focus:ring-indigo-500 text-white font-black placeholder:text-slate-800 transition-all"
                    value={editData.address || ''}
                    onChange={(e) => setEditData({...editData, address: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2 space-y-4">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">জন্ম তারিখ</label>
                  <input 
                    type="date" 
                    className="w-full px-8 py-6 glass border border-white/10 rounded-[2rem] outline-none focus:ring-2 focus:ring-indigo-500 text-white font-black transition-all [color-scheme:dark]"
                    value={editData.dob || ''}
                    onChange={(e) => setEditData({...editData, dob: e.target.value})}
                  />
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.02, y: -5, boxShadow: "0 20px 40px rgba(79,70,229,0.3)" }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-sm shadow-2xl disabled:opacity-50 border border-white/10"
              >
                {loading ? (
                  <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : 'অনুরোধ সাবমিট করুন'}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Contact */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass-card p-16 border border-white/10 relative overflow-hidden group shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 blur-[120px] -mr-48 -mt-48 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-16">
          <div className="space-y-2">
            <h3 className="text-4xl font-black text-white uppercase tracking-tighter">অ্যাডমিন সাপোর্ট</h3>
            <p className="text-slate-500 text-sm font-black uppercase tracking-widest">যেকোনো প্রয়োজনে আমাদের সাথে যোগাযোগ করুন</p>
          </div>
          <div className="w-20 h-20 bg-rose-500/10 rounded-[2rem] flex items-center justify-center text-rose-400 border border-rose-500/20">
            <Phone size={32} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {[
            { icon: Mail, label: 'ইমেইল সাপোর্ট', value: 'mr4425390@gmail.com', link: 'mailto:mr4425390@gmail.com', color: 'text-indigo-400' },
            { icon: Phone, label: 'সরাসরি কল', value: '01941429881', link: 'tel:01941429881', color: 'text-emerald-400' },
            { icon: Facebook, label: 'ফেসবুক পেজ', value: 'Rakibul Islam', link: 'https://www.facebook.com/rakibul.islam.140316', color: 'text-blue-400' },
          ].map((item, idx) => (
            <motion.a 
              key={idx}
              href={item.link}
              target="_blank"
              rel="noreferrer"
              whileHover={{ y: -10, scale: 1.02 }}
              className="p-8 glass border border-white/5 rounded-[2.5rem] group/item hover:border-white/20 transition-all shadow-xl hover:bg-white/5"
            >
              <div className={cn("p-5 bg-white/5 rounded-2xl mb-6 w-fit group-hover/item:scale-110 transition-transform shadow-inner", item.color)}>
                <item.icon size={28} />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">{item.label}</p>
              <p className="text-sm text-white font-black truncate">{item.value}</p>
            </motion.a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
