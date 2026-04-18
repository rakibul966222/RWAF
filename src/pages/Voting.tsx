import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Poll } from '../types';
import { Vote as VoteIcon, CheckCircle2, Users, BarChart } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Voting() {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setPolls(snap.docs.map(d => ({ id: d.id, ...d.data() } as Poll)));
    });
  }, []);

  const handleVote = async (pollId: string, optionIdx: number) => {
    if (!user) return;
    const poll = polls.find(p => p.id === pollId);
    if (!poll || poll.votedBy.includes(user.uid)) return;

    const newOptions = [...poll.options];
    newOptions[optionIdx].votes += 1;

    await updateDoc(doc(db, 'polls', pollId), {
      options: newOptions,
      votedBy: arrayUnion(user.uid)
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 perspective-1000">
      <header>
        <h1 className="text-4xl font-black text-white tracking-tight uppercase">ভোট ও মতামত</h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-3 opacity-80">ফাউন্ডেশনের বিভিন্ন সিদ্ধান্তে আপনার মতামত দিন</p>
      </header>

      <div className="space-y-8">
        {polls.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-20 border border-dashed border-white/10 text-center"
          >
            <p className="text-slate-500 font-black uppercase tracking-[0.3em]">বর্তমানে কোন সক্রিয় ভোট নেই।</p>
          </motion.div>
        ) : (
          polls.map((poll, pIdx) => {
            const hasVoted = user ? poll.votedBy.includes(user.uid) : false;
            const totalVotes = poll.votedBy.length;

            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: pIdx * 0.1 }}
                key={poll.id} 
                className="glass-card p-10 border border-white/5 relative overflow-hidden group preserve-3d"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[80px] -mr-32 -mt-32 transition-all group-hover:bg-indigo-600/10" />
                
                <div className="flex items-start gap-6 mb-10 relative z-10">
                  <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 shadow-lg">
                    <VoteIcon size={32} />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-2xl uppercase tracking-tight leading-tight group-hover:text-indigo-400 transition-colors">{poll.question}</h3>
                    <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                      <span className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full"><Users size={14} className="text-indigo-400" /> {totalVotes} জন ভোট দিয়েছেন</span>
                      {hasVoted && <span className="text-emerald-400 flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20"><CheckCircle2 size={14} /> আপনি ভোট দিয়েছেন</span>}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 relative z-10">
                  {poll.options.map((opt, idx) => {
                    const percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                    
                    return (
                      <motion.button
                        key={idx}
                        whileHover={!hasVoted ? { scale: 1.02, x: 5 } : {}}
                        whileTap={!hasVoted ? { scale: 0.98 } : {}}
                        disabled={hasVoted}
                        onClick={() => handleVote(poll.id, idx)}
                        className={cn(
                          "w-full relative h-16 rounded-2xl border transition-all overflow-hidden group/opt",
                          hasVoted 
                            ? "border-white/5 bg-white/5 cursor-default" 
                            : "border-white/10 bg-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5"
                        )}
                      >
                        {/* Progress Bar */}
                        {hasVoted && (
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 z-0"
                          />
                        )}
                        
                        <div className="absolute inset-0 px-6 flex justify-between items-center z-10">
                          <span className={cn(
                            "font-black text-sm uppercase tracking-widest transition-colors",
                            hasVoted ? "text-slate-300" : "text-slate-500 group-hover/opt:text-white"
                          )}>
                            {opt.text}
                          </span>
                          {hasVoted && (
                            <div className="flex items-center gap-3">
                              <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden hidden sm:block">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percent}%` }}
                                  className="h-full bg-indigo-500"
                                />
                              </div>
                              <span className="text-sm font-black text-indigo-400 tracking-tighter">{percent}%</span>
                            </div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {!hasVoted && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6 text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-3 justify-center"
                  >
                    <BarChart size={14} className="text-indigo-500" /> ফলাফল দেখতে ভোট দিন
                  </motion.p>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
