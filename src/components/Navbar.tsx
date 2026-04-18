import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Wallet, Vote, MessageSquare, User, Shield, LogOut, Sun, Moon, History as HistoryIcon, Menu, X } from 'lucide-react';
import { auth } from '../firebase';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

export default function Navbar({ darkMode, setDarkMode }: { darkMode: boolean, setDarkMode: (v: boolean) => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: Home, label: 'হোম' },
    { path: '/fund', icon: Wallet, label: 'ফান্ড' },
    { path: '/voting', icon: Vote, label: 'ভোট' },
    { path: '/posts', icon: MessageSquare, label: 'পোস্ট' },
    { path: '/transactions', icon: HistoryIcon, label: 'লেনদেন' },
    { path: '/profile', icon: User, label: 'প্রোফাইল' },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ path: '/admin', icon: Shield, label: 'অ্যাডমিন' });
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl glass h-20 rounded-[2.5rem] z-50 hidden md:flex items-center px-8 gap-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        
        <Link to="/" className="flex items-center gap-3 group perspective-1000 relative z-10">
          <motion.div 
            whileHover={{ rotateY: 180, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 preserve-3d"
          >
            <Shield size={28} />
          </motion.div>
          <span className="font-black text-white text-xl tracking-tight hidden lg:block text-gradient uppercase">রামনগর যুব-কল্যান</span>
        </Link>

        <div className="flex items-center gap-1 bg-white/5 p-1.5 rounded-[1.8rem] border border-white/5 relative z-10">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 overflow-hidden group",
                  active ? "text-white" : "text-slate-400 hover:text-white"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 bg-gradient-to-r from-indigo-600/40 to-purple-600/40 border border-white/10 rounded-2xl z-0 shadow-inner"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon size={16} className={cn("relative z-10 transition-transform group-hover:scale-110 group-hover:rotate-12", active && "text-indigo-400")} />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-4 relative z-10">
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 glass text-slate-300 rounded-2xl hover:text-white transition-all border border-white/5 hover:border-indigo-500/30 shadow-xl"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>
          
          <div className="h-8 w-[1px] bg-white/10 mx-1" />

          <motion.button
            whileHover={{ scale: 1.05, x: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="flex items-center gap-3 px-6 py-3 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest border border-rose-500/20 shadow-lg shadow-rose-500/10"
          >
            <LogOut size={18} />
            লগআউট
          </motion.button>
        </div>
      </nav>

      {/* Mobile Bottom Navbar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] glass h-20 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 flex md:hidden items-center justify-around px-4 border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />
        {navItems.slice(0, 4).map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center gap-1.5 p-3 transition-all group",
                active ? "text-indigo-400" : "text-slate-500"
              )}
            >
              {active && (
                <motion.div
                  layoutId="nav-active-mobile"
                  className="absolute -top-2 w-10 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.8)]"
                />
              )}
              <item.icon size={22} className={cn("group-active:scale-90 transition-transform", active && "drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]")} />
              <span className="text-[9px] font-black tracking-widest uppercase">{item.label}</span>
            </Link>
          );
        })}
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1.5 p-3 text-slate-500 group"
        >
          <div className="p-2 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors">
            <Menu size={22} />
          </div>
          <span className="text-[9px] font-black tracking-widest uppercase">মেনু</span>
        </motion.button>
      </nav>

      {/* Mobile Full Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[60] flex items-end p-4 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ y: "100%", scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: "100%", scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="glass-card w-full rounded-[3rem] p-8 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-white/10 relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] -mr-32 -mt-32" />
              
              <div className="flex justify-between items-center mb-10 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <Shield size={32} />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-xl uppercase tracking-tight">মেনু অপশন</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">আপনার প্রয়োজনীয় অপশন বেছে নিন</p>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-3 glass rounded-2xl text-slate-400 hover:text-white border border-white/5"
                >
                  <X size={24} />
                </motion.button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-10 relative z-10">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 rounded-[2rem] border transition-all group perspective-1000",
                      isActive(item.path) 
                        ? "bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border-indigo-500/30 text-white shadow-lg shadow-indigo-500/10" 
                        : "glass border-white/5 text-slate-400 hover:text-white hover:border-white/10"
                    )}
                  >
                    <item.icon size={24} className="group-hover:scale-110 group-hover:rotate-12 transition-transform" />
                    <span className="font-black text-[10px] uppercase tracking-widest">{item.label}</span>
                  </Link>
                ))}
              </div>

              <div className="space-y-4 relative z-10">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setDarkMode(!darkMode);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-6 glass rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] text-white border border-white/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/5 rounded-xl">
                      {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-400" />}
                    </div>
                    <span>{darkMode ? 'লাইট মুড' : 'ডার্ক মুড'}</span>
                  </div>
                  <div className={cn(
                    "w-12 h-7 rounded-full relative transition-colors p-1",
                    darkMode ? "bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)]" : "bg-slate-700"
                  )}>
                    <motion.div 
                      animate={{ x: darkMode ? 20 : 0 }}
                      className="w-5 h-5 bg-white rounded-full shadow-md" 
                    />
                  </div>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 p-6 bg-rose-500/10 text-rose-400 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] border border-rose-500/20 shadow-lg shadow-rose-500/5"
                >
                  <div className="p-2 bg-rose-500/20 rounded-xl">
                    <LogOut size={20} />
                  </div>
                  <span>লগআউট করুন</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
