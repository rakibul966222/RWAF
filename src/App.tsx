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
import { UserProfile } from './types';

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
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true,
  darkMode: false,
  setDarkMode: () => {}
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const location = useLocation();

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
    <AuthContext.Provider value={{ user, profile, loading, darkMode, setDarkMode }}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
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

