import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { LogIn, Shield, Mail, Lock, Chrome, ArrowRight, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      setError('লগইন ব্যর্থ হয়েছে। ইমেইল বা পাসওয়ার্ড ভুল হতে পারে।');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        navigate('/signup', { state: { isCompletingProfile: true } });
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError('গুগল লগইন ব্যর্থ হয়েছে।');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-950">
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl glass overflow-hidden shadow-2xl border border-white/5 relative z-10 rounded-3xl"
      >
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-12 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5" />
          
          <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl border border-white/20">
            <Shield size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-black mb-2 uppercase">স্বাগতম</h1>
          <p className="text-indigo-100 font-bold uppercase text-xs mt-2 opacity-80">রামনগর যুব-কল্যান ফাউন্ডেশন</p>
        </div>

        <div className="p-10">
          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-rose-500/10 text-rose-400 p-4 rounded-2xl mb-8 text-xs font-bold border border-rose-500/20 text-center uppercase"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase ml-2">ইমেইল এড্রেস</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type="email"
                  required
                  className="w-full pl-14 pr-6 py-5 glass border border-white/10 rounded-2xl focus:border-indigo-500/50 outline-none transition-all text-white font-bold placeholder:text-slate-700"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center ml-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">পাসওয়ার্ড</label>
                <Link to="/forgot-password" title="পাসওয়ার্ড ভুলে গেছেন?" className="text-xs font-bold text-indigo-400 uppercase hover:text-indigo-300 transition-colors">
                  ভুলে গেছেন?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type="password"
                  required
                  className="w-full pl-14 pr-6 py-5 glass border border-white/10 rounded-2xl focus:border-indigo-500/50 outline-none transition-all text-white font-bold placeholder:text-slate-700"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-3 uppercase border border-white/10"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><LogIn size={24} /> লগইন করুন</>
              )}
            </motion.button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-6 bg-slate-950 text-slate-600 font-bold uppercase">অথবা</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full glass border border-white/10 text-white py-5 rounded-2xl font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-4 uppercase text-xs"
          >
            <Chrome size={24} className="text-rose-500" /> গুগল দিয়ে লগইন
          </motion.button>

          <p className="mt-12 text-center text-slate-500 font-bold text-xs">
            অ্যাকাউন্ট নেই? {' '}
            <Link to="/signup" className="text-indigo-400 font-bold hover:text-indigo-300 transition-all inline-flex items-center gap-2 uppercase text-xs ml-2">
              রেজিস্ট্রেশন করুন <ArrowRight size={16} />
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
