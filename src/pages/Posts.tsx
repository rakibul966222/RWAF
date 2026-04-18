import React, { useState, useEffect, FormEvent } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Post } from '../types';
import { MessageSquare, ThumbsUp, Heart, Laugh, Send, Link as LinkIcon, Image as ImageIcon, Sparkles, Zap, Activity, Clock, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function Posts() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [fbLink, setFbLink] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    });
  }, []);

  const handleAddComment = async (postId: string) => {
    if (!user || !profile || !commentText[postId]) return;
    const postRef = doc(db, 'posts', postId);
    const newComment = {
      id: Math.random().toString(36).substring(7),
      userId: user.uid,
      userName: profile.name,
      content: commentText[postId],
      createdAt: new Date().toISOString(),
    };

    await updateDoc(postRef, {
      comments: arrayUnion(newComment)
    });
    setCommentText({ ...commentText, [postId]: '' });
  };

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile || profile.role !== 'admin') return;
    setIsPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: profile.name,
        content: newPost,
        fbLink,
        thumbnail,
        reacts: {},
        comments: [],
        createdAt: new Date().toISOString(),
      });
      setNewPost('');
      setFbLink('');
      setThumbnail('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleReact = async (postId: string, emoji: string) => {
    if (!user) return;
    const postRef = doc(db, 'posts', postId);
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const newReacts = { ...post.reacts };
    if (newReacts[user.uid] === emoji) {
      delete newReacts[user.uid];
    } else {
      newReacts[user.uid] = emoji;
    }

    await updateDoc(postRef, { reacts: newReacts });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 perspective-1000">
      <motion.header 
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-12 relative overflow-hidden group shadow-[0_40px_80px_rgba(0,0,0,0.4)] border border-white/10"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[120px] -mr-48 -mt-48 transition-all group-hover:bg-indigo-600/20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 blur-[100px] -ml-32 -mb-32" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <span className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 font-black uppercase tracking-[0.3em] text-[10px] flex items-center gap-2">
                <Activity size={12} /> লাইভ আপডেট
              </span>
            </div>
            <h1 className="text-5xl font-black text-gradient uppercase tracking-tighter leading-none">ফাউন্ডেশন পোস্ট</h1>
            <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] opacity-80">অ্যাডমিনদের গুরুত্বপূর্ণ আপডেট ও ঘোষণা</p>
          </div>
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 glass border border-white/20 rounded-[2rem] flex items-center justify-center text-indigo-400 shadow-2xl shadow-indigo-500/20"
          >
            <Sparkles size={40} />
          </motion.div>
        </div>
      </motion.header>

      {/* Create Post (Admin Only) */}
      {profile?.role === 'admin' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 border border-white/10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -ml-32 -mt-32" />
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
              {profile.name[0]}
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">নতুন পোস্ট তৈরি করুন</h3>
          </div>
          <form onSubmit={handleCreatePost} className="space-y-8 relative z-10">
            <textarea
              required
              placeholder="নতুন কিছু লিখুন..."
              className="w-full px-8 py-6 glass border border-white/10 rounded-[2rem] outline-none focus:ring-2 focus:ring-indigo-500 h-48 resize-none text-white font-black placeholder:text-slate-800 transition-all text-lg"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative group">
                <LinkIcon size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="url" 
                  placeholder="ফেসবুক লিংক (ঐচ্ছিক)"
                  className="w-full pl-16 pr-8 py-5 glass border border-white/10 rounded-[2rem] text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-white font-black placeholder:text-slate-800 transition-all"
                  value={fbLink}
                  onChange={(e) => setFbLink(e.target.value)}
                />
              </div>
              <div className="relative group">
                <ImageIcon size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="url" 
                  placeholder="থাম্বনেইল ইমেজ লিংক"
                  className="w-full pl-16 pr-8 py-5 glass border border-white/10 rounded-[2rem] text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-white font-black placeholder:text-slate-800 transition-all"
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                />
              </div>
            </div>
            <motion.button 
              whileHover={{ scale: 1.02, y: -5, boxShadow: "0 20px 40px rgba(79,70,229,0.3)" }}
              whileTap={{ scale: 0.98 }}
              disabled={isPosting}
              className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-sm shadow-2xl flex items-center justify-center gap-4 disabled:opacity-50 border border-white/10"
            >
              {isPosting ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : <><Send size={24} /> পোস্ট পাবলিশ করুন</>}
            </motion.button>
          </form>
        </motion.div>
      )}

      {/* Posts List */}
      <div className="space-y-12">
        {posts.map((post, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 50, rotateX: -5 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: idx * 0.1 }}
            key={post.id} 
            className="glass-card relative overflow-hidden group border border-white/10 preserve-3d shadow-[0_30px_60px_rgba(0,0,0,0.3)]"
          >
            <div className="p-10 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-6">
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-16 h-16 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-[1.5rem] flex items-center justify-center text-indigo-400 font-black text-2xl border border-indigo-500/20 shadow-xl"
                >
                  {post.authorName[0]}
                </motion.div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                      {post.authorName}
                    </h2>
                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 font-black text-[8px] uppercase tracking-widest flex items-center gap-1">
                      <Shield size={10} /> Admin
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock size={12} />
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      {format(new Date(post.createdAt), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  </div>
                </div>
              </div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
              />
            </div>

            <div className="px-10 pb-10 relative z-10">
              <p className="text-slate-300 font-bold leading-relaxed whitespace-pre-wrap mb-10 text-xl tracking-tight">{post.content}</p>
              
              {post.thumbnail && (
                <motion.div 
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-[2.5rem] overflow-hidden mb-10 border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative group/img"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-500" />
                  <img 
                    src={post.thumbnail} 
                    alt="Post thumbnail" 
                    className="w-full h-auto max-h-[600px] object-cover transition-transform duration-700 group-hover/img:scale-110"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              )}

              {post.fbLink && (
                <motion.a 
                  whileHover={{ x: 10, scale: 1.05 }}
                  href={post.fbLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-4 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] hover:text-indigo-300 transition-all mb-10 bg-indigo-500/5 px-6 py-3 rounded-full border border-indigo-500/10"
                >
                  <LinkIcon size={16} /> ফেসবুক পোস্ট দেখুন
                </motion.a>
              )}

              <div className="flex items-center justify-between pt-10 border-t border-white/5">
                <div className="flex items-center gap-4">
                  {[
                    { emoji: '👍', icon: ThumbsUp, color: 'text-blue-400', label: 'Like' },
                    { emoji: '❤️', icon: Heart, color: 'text-rose-400', label: 'Love' },
                    { emoji: '😮', icon: Laugh, color: 'text-amber-400', label: 'Wow' }
                  ].map((r) => {
                    const count = Object.values(post.reacts || {}).filter(e => e === r.emoji).length;
                    const isActive = user && post.reacts?.[user.uid] === r.emoji;
                    return (
                      <motion.button
                        key={r.emoji}
                        whileHover={{ scale: 1.15, y: -5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleReact(post.id, r.emoji)}
                        className={cn(
                          "flex items-center gap-3 px-5 py-3 rounded-[1.5rem] transition-all border shadow-xl",
                          isActive 
                            ? "bg-white/10 border-white/20 shadow-indigo-500/10" 
                            : "bg-white/5 border-transparent hover:border-white/10"
                        )}
                      >
                        <span className="text-2xl drop-shadow-lg">{r.emoji}</span>
                        {count > 0 && <span className="text-xs font-black text-white tracking-widest">{count}</span>}
                      </motion.button>
                    );
                  })}
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 5, y: -5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowComments({ ...showComments, [post.id]: !showComments[post.id] })}
                  className={cn(
                    "flex items-center gap-4 transition-all px-6 py-3 rounded-[1.5rem] border shadow-xl",
                    showComments[post.id] 
                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-indigo-500/10" 
                      : "text-slate-500 border-transparent hover:bg-white/5 hover:border-white/10"
                  )}
                >
                  <MessageSquare size={24} />
                  <span className="text-sm font-black tracking-[0.2em]">{post.comments?.length || 0}</span>
                </motion.button>
              </div>

              {/* Comments Section */}
              <AnimatePresence>
                {showComments[post.id] && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-10 pt-10 border-t border-white/5 space-y-10">
                      <div className="space-y-6 max-h-[400px] overflow-y-auto no-scrollbar pr-4">
                        {post.comments?.map((comment, cIdx) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: cIdx * 0.05 }}
                            key={comment.id} 
                            className="bg-white/5 p-8 rounded-[2rem] border border-white/5 group hover:border-white/10 transition-all shadow-lg"
                          >
                            <div className="flex justify-between items-center mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 font-black text-xs border border-indigo-500/20">
                                  {comment.userName[0]}
                                </div>
                                <p className="text-xs font-black text-white uppercase tracking-widest">{comment.userName}</p>
                              </div>
                              <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">{format(new Date(comment.createdAt), 'dd MMM, hh:mm a')}</p>
                            </div>
                            <p className="text-sm text-slate-400 font-bold leading-relaxed pl-11">{comment.content}</p>
                          </motion.div>
                        ))}
                        {(!post.comments || post.comments.length === 0) && (
                          <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                            <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.5em]">কোন কমেন্ট নেই। প্রথম কমেন্ট করুন!</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-4 items-center">
                        <div className="flex-1 relative group">
                          <input 
                            type="text" 
                            placeholder="আপনার মতামত লিখুন..."
                            className="w-full px-8 py-5 glass border border-white/10 rounded-[2rem] text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-white font-black placeholder:text-slate-800 transition-all shadow-inner"
                            value={commentText[post.id] || ''}
                            onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                            <Zap size={14} className="text-indigo-400 animate-pulse" />
                          </div>
                        </div>
                        <motion.button 
                          whileHover={{ scale: 1.1, rotate: 10, boxShadow: "0 15px 30px rgba(79,70,229,0.3)" }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleAddComment(post.id)}
                          className="p-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-[1.5rem] shadow-2xl border border-white/10"
                        >
                          <Send size={24} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
