/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { auth, db, messaging, firebaseConfig } from './firebase';
import { CheckCircle2, XCircle, Bell } from 'lucide-react';
import { cn } from './lib/utils';
import { UserProfile } from './types';
import { motion, AnimatePresence } from 'motion/react';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import FundManagement from './pages/FundManagement';
import Voting from './pages/Voting';
import Posts from './pages/Posts';
import Profile from './pages/Profile';
import Transactions from './pages/Transactions';
import ForgotPassword from './pages/ForgotPassword';
import Navbar from './components/Navbar';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true,
  darkMode: false,
  setDarkMode: () => {},
  showToast: () => {},
  showConfirm: () => {}
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const location = useLocation();

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [confirm, setConfirm] = useState<{ message: string, onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirm({ message, onConfirm });
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'notices'), 
        where('active', '==', true), 
        orderBy('createdAt', 'desc'), 
        limit(1)
      );
      const unsubscribeNotices = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const notice = snap.docs[0].data();
          const lastNoticeId = localStorage.getItem('lastNoticeId');
          if (lastNoticeId !== snap.docs[0].id) {
            if (Notification.permission === "granted") {
              new Notification("নতুন নোটিশ: " + notice.title, {
                body: notice.content.substring(0, 100) + "...",
                icon: "https://cdn-icons-png.flaticon.com/512/3119/3119338.png"
              });
            }
            localStorage.setItem('lastNoticeId', snap.docs[0].id);
          }
        }
      });
      return () => unsubscribeNotices();
    }
  }, [user]);

  useEffect(() => {
    if (user && messaging) {
      const setupFCM = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const token = await getToken(messaging, {
              vapidKey: firebaseConfig.vapidKey
            });
            
            if (token) {
              console.log('FCM Token:', token);
              // Subscribe to topic via backend
              await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
              });
            }
          }
        } catch (error) {
          console.error('FCM Setup Error:', error);
        }
      };

      setupFCM();

      const unsubscribeMessage = onMessage(messaging, (payload) => {
        console.log('Foreground Message:', payload);
        if (payload.notification) {
          new Notification(payload.notification.title || 'New Notification', {
            body: payload.notification.body,
            icon: "https://cdn-icons-png.flaticon.com/512/3119/3119338.png"
          });
        }
      });

      return () => unsubscribeMessage();
    }
  }, [user]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Profile fetch error:", error);
        setLoading(false);
      });
      return () => unsubscribeProfile();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(location.pathname);
  const needsProfileCompletion = user && (!profile || !profile.isProfileComplete);

  if (needsProfileCompletion && !isAuthPage) {
    return <Navigate to="/signup" state={{ isCompletingProfile: true }} />;
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, darkMode, setDarkMode, showToast, showConfirm }}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className={cn(
                "fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl border backdrop-blur-xl flex items-center gap-4",
                toast.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                toast.type === 'error' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
              )}
            >
              {toast.type === 'success' && <CheckCircle2 size={20} />}
              {toast.type === 'error' && <XCircle size={20} />}
              {toast.type === 'info' && <Bell size={20} />}
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {confirm && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirm(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-md glass p-8 border border-white/10 shadow-2xl text-center rounded-3xl"
              >
                <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                  <Bell size={32} />
                </div>
                <h3 className="text-xl font-black text-white mb-3 uppercase tracking-tight">নিশ্চিত করুন</h3>
                <p className="text-slate-400 font-bold mb-8 leading-relaxed text-sm">{confirm.message}</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setConfirm(null)}
                    className="flex-1 px-6 py-4 rounded-xl border border-white/10 text-slate-500 font-bold uppercase text-xs hover:bg-white/5 transition-all text-white"
                  >
                    বাতিল
                  </button>
                  <button 
                    onClick={() => {
                      confirm.onConfirm();
                      setConfirm(null);
                    }}
                    className="flex-1 px-6 py-4 rounded-xl bg-indigo-600 text-white font-bold uppercase text-xs shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    হ্যাঁ, নিশ্চিত
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {user && profile?.isProfileComplete && <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />}
        <main className={user && profile?.isProfileComplete ? "pt-24 pb-24 px-4 max-w-7xl mx-auto" : ""}>
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/signup" element={(!user || !profile?.isProfileComplete) ? <Signup /> : <Navigate to="/" />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            <Route path="/" element={user && profile?.isProfileComplete ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/fund" element={user && profile?.isProfileComplete ? <FundManagement /> : <Navigate to="/login" />} />
            <Route path="/voting" element={user && profile?.isProfileComplete ? <Voting /> : <Navigate to="/login" />} />
            <Route path="/posts" element={user && profile?.isProfileComplete ? <Posts /> : <Navigate to="/login" />} />
            <Route path="/transactions" element={user && profile?.isProfileComplete ? <Transactions /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user && profile?.isProfileComplete ? <Profile /> : <Navigate to="/login" />} />
            
            <Route 
              path="/admin/*" 
              element={profile?.role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} 
            />
          </Routes>
        </main>
      </div>
    </AuthContext.Provider>
  );
}

