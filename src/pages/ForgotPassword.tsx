import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { motion } from 'motion/react';
import { KeyRound, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে। দয়া করে আপনার ইনবক্স চেক করুন।');
    } catch (err: any) {
      setError('পাসওয়ার্ড রিসেট করতে ব্যর্থ হয়েছে। ইমেইলটি সঠিক কিনা যাচাই করুন।');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 perspective-1000 relative overflow-hidden bg-slate-950">
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, rotateX: -20 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{ type: "spring", duration: 1, bounce: 0.3 }}
        className="w-full max-w-xl glass-card overflow-hidden preserve-3d shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/5 relative z-10"
      >
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-16 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[60px] -mr-32 -mt-32" />
          
          <motion.div 
            initial={{ y: -20, rotateY: 0 }}
            animate={{ y: 0, rotateY: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="w-32 h-32 bg-white/20 backdrop-blur-3xl rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-2xl border border-white/30 preserve-3d"
          >
            <KeyRound size={64} className="text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)]" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter mb-4 uppercase leading-tight">পাসওয়ার্ড ভুলে গেছেন?</h1>
          <p className="text-indigo-100 font-black uppercase tracking-[0.3em] text-[10px] opacity-80">আপনার ইমেইল দিন, আমরা আপনাকে পাসওয়ার্ড রিসেট করার লিংক পাঠিয়ে দেব।</p>
        </div>

        <div className="p-16">
          {message ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500/10 text-emerald-400 p-8 rounded-[2.5rem] mb-10 text-sm font-black border border-emerald-500/20 flex items-start gap-6 shadow-xl shadow-emerald-500/5"
            >
              <CheckCircle className="mt-1 shrink-0 text-emerald-500" size={24} />
              <p className="leading-relaxed">{message}</p>
            </motion.div>
          ) : (
            <form onSubmit={handleReset} className="space-y-10">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-rose-500/10 text-rose-400 p-6 rounded-3xl mb-10 text-xs font-black border border-rose-500/20 text-center uppercase tracking-[0.2em] shadow-lg shadow-rose-500/5"
                >
                  {error}
                </motion.div>
              )}

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">ইমেইল এড্রেস</label>
                <div className="relative group">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-all duration-300" size={24} />
                  <input
                    type="email"
                    required
                    className="w-full pl-16 pr-8 py-6 glass border border-white/10 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 focus:bg-white/10 outline-none transition-all text-white font-black placeholder:text-slate-700 tracking-tight"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-[0_20px_40px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] border border-white/10"
              >
                {loading ? (
                  <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                ) : (
                  <>রিসেট লিংক পাঠান</>
                )}
              </motion.button>
            </form>
          )}

          <div className="mt-16 pt-10 border-t border-white/5 text-center">
            <Link to="/login" className="text-indigo-400 font-black hover:text-indigo-300 transition-all inline-flex items-center gap-3 uppercase tracking-[0.2em] text-[10px] border-b border-indigo-400/30 pb-1">
              <ArrowLeft size={20} /> লগইন পেজে ফিরে যান
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
