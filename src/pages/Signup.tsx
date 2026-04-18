import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { SubscriptionType } from '../types';
import { Volume2, VolumeX, UserPlus, Info, CheckCircle, ShieldCheck, Heart, Users, BookOpen, Scale, Award, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  
  // Detect if we are completing a profile even if state is lost on refresh
  const isCompletingProfile = location.state?.isCompletingProfile || (auth.currentUser && !profile?.isProfileComplete);

  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    motherName: '',
    dob: '',
    religion: 'Islam',
    profession: '',
    address: '',
    bloodGroup: 'O+',
    maritalStatus: 'Single',
    nid: '',
    subscriptionAmount: 100,
    subscriptionType: 'monthly' as SubscriptionType,
    mobileNo: '',
    fbId: '',
    email: '',
    password: '',
    confirmPassword: '',
    joinDate: new Date().toISOString().split('T')[0],
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const [agreedToPledge, setAgreedToPledge] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (isCompletingProfile && auth.currentUser) {
      setFormData(prev => ({
        ...prev,
        name: auth.currentUser?.displayName || '',
        email: auth.currentUser?.email || '',
      }));
    }
  }, [isCompletingProfile]);

  const speak = (text: string) => {
    if (!isTtsEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'bn-BD';
    window.speechSynthesis.speak(utterance);
  };

  const handleFocus = (field: string) => {
    const messages: { [key: string]: string } = {
      name: 'আপনার পূর্ণ নাম লিখুন।',
      fatherName: 'আপনার পিতার নাম লিখুন।',
      motherName: 'আপনার মাতার নাম লিখুন।',
      dob: 'আপনার জন্ম তারিখ সিলেক্ট করুন।',
      religion: 'আপনার ধর্ম নির্বাচন করুন।',
      profession: 'আপনার পেশা লিখুন।',
      address: 'আপনার বর্তমান ঠিকানা লিখুন।',
      bloodGroup: 'আপনার রক্তের গ্রুপ নির্বাচন করুন।',
      maritalStatus: 'আপনার বৈবাহিক অবস্থা নির্বাচন করুন।',
      nid: 'আপনার জাতীয় পরিচয় পত্র নম্বর দিন (ঐচ্ছিক)।',
      subscriptionAmount: 'আপনার মাসিক বা বাৎসরিক চাঁদার পরিমান লিখুন।',
      subscriptionType: 'চাঁদার ধরণ নির্বাচন করুন।',
      mobileNo: 'আপনার সচল মোবাইল নম্বরটি দিন।',
      fbId: 'আপনার ফেসবুক আইডি লিংক বা নাম দিন (ঐচ্ছিক)।',
      joinDate: 'সংগঠনে সদস্য হওয়ার তারিখ দিন।',
      email: 'আপনার ইমেইল এড্রেসটি দিন যা লগইন করতে ব্যবহার করবেন।',
      password: 'কমপক্ষে ছয় অক্ষরের একটি শক্তিশালী পাসওয়ার্ড দিন।',
      confirmPassword: 'পাসওয়ার্ডটি পুনরায় টাইপ করুন।',
      pledge: 'অঙ্গীকারনামাটি পড়ুন এবং সম্মতি দিন।'
    };
    if (messages[field]) speak(messages[field]);
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!agreedToPledge) {
      setError('দয়া করে অঙ্গীকারনামায় সম্মতি দিন।');
      speak('দয়া করে অঙ্গীকারনামায় সম্মতি দিন।');
      return;
    }
    if (!isCompletingProfile && formData.password !== formData.confirmPassword) {
      setError('পাসওয়ার্ড মিলছে না।');
      speak('পাসওয়ার্ড মিলছে না।');
      return;
    }
    setLoading(true);
    setError('');

    try {
      let user = auth.currentUser;
      
      if (!isCompletingProfile) {
        // Only try to create a new user if not already authenticated (e.g. via Google or existing login)
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          user = userCredential.user;
          await updateProfile(user, { displayName: formData.name });
        } catch (createErr: any) {
          // If the profile is logically inconsistent but they are trying to fix it, this might happen.
          // However, we strictly catch 'email-already-in-use' below.
          throw createErr;
        }
      }

      if (user) {
        const docRef = doc(db, 'users', user.uid);
        
        // Simplified: If authenticated, we just try to save/update the profile.
        // We only show "Already exists" if they are trying to create a NEW email/password account 
        // that somehow overlaps with an EXISTING profile.
        if (!isCompletingProfile) {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().isProfileComplete) {
            setError('আপনার প্রোফাইল ইতিমধ্যে তৈরি করা হয়েছে। অনুগ্রহ করে লগইন করুন।');
            speak('আপনার প্রোফাইল ইতিমধ্যে তৈরি করা হয়েছে।');
            setLoading(false);
            return;
          }
        }

        await setDoc(docRef, {
          uid: user.uid,
          name: formData.name,
          fatherName: formData.fatherName,
          motherName: formData.motherName,
          dob: formData.dob,
          religion: formData.religion,
          profession: formData.profession,
          address: formData.address,
          bloodGroup: formData.bloodGroup,
          maritalStatus: formData.maritalStatus,
          nid: formData.nid,
          subscriptionAmount: Number(formData.subscriptionAmount),
          subscriptionType: formData.subscriptionType,
          mobileNo: formData.mobileNo,
          fbId: formData.fbId,
          email: formData.email,
          role: 'user',
          status: 'active',
          totalContribution: 0,
          contributionVisibility: true,
          joinDate: formData.joinDate,
          createdAt: serverTimestamp(),
          isProfileComplete: true,
        }, { merge: true });

        setShowWelcome(true);
        speak('অভিনন্দন! রামনগর যুব-কল্যান ফাউন্ডেশনে আপনাকে স্বাগতম।');
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('ইমেইলটি ইতিমধ্যেই ব্যবহৃত হচ্ছে। অনুগ্রহ করে লগইন করুন।');
      } else {
        setError('রেজিস্ট্রেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
      }
      speak('রেজিস্ট্রেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  if (showWelcome) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 transition-colors duration-300">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl text-center max-w-md w-full border border-blue-100 dark:border-slate-700"
        >
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4">অভিনন্দন!</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-8">
            রামনগর যুব-কল্যান ফাউন্ডেশনে আপনাকে স্বাগতম। আপনার সদস্যপদ সফলভাবে নিবন্ধিত হয়েছে।
          </p>
          <div className="animate-pulse text-indigo-600 dark:text-indigo-400 font-bold">
            ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4 relative overflow-hidden bg-slate-900">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-indigo-600/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-purple-600/5 blur-[100px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto glass rounded-3xl overflow-hidden shadow-2xl relative z-10"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 to-purple-800 p-8 md:p-12 text-white flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          <div className="relative z-10 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-black uppercase">সদস্য ভর্তি ফরম</h1>
            <p className="text-indigo-200 font-bold uppercase text-xs mt-2">রামনগর যুব-কল্যান ফাউন্ডেশন</p>
          </div>
          
          <button 
            onClick={() => {
              setIsTtsEnabled(!isTtsEnabled);
              if (!isTtsEnabled) speak('ভয়েস গাইড চালু করা হয়েছে।');
            }}
            className={cn(
              "relative z-10 p-4 rounded-2xl transition-all duration-300 border",
              isTtsEnabled 
                ? "bg-white text-indigo-700 border-white shadow-lg" 
                : "bg-white/10 text-white border-white/10 hover:bg-white/20"
            )}
            title={isTtsEnabled ? "ভয়েস বন্ধ করুন" : "ভয়েস চালু করুন"}
          >
            {isTtsEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
        </div>

        <div className="p-8 md:p-14">
          {/* Goals and Objectives */}
          <div 
            className="mb-16 glass rounded-3xl p-8 md:p-12 border border-white/5 relative overflow-hidden"
          >
            <h2 className="text-2xl font-black text-white mb-10 flex items-center gap-4 uppercase">
              <Flag className="text-indigo-400" size={32} /> লক্ষ্য ও উদ্দেশ্য
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { icon: Users, text: "সামাজিক কর্মকান্ড পরিচালনা করা।" },
                { icon: ShieldCheck, text: "মাদকের বিরুদ্ধে জনসচেতনতা সৃষ্টি করা।" },
                { icon: Heart, text: "যৌতুক ও বাল্য বিবাহ প্রতিরোধ করা।" },
                { icon: Award, text: "ইভটিজিং প্রতিরোধে জনসচেতনতা সৃষ্টি করা।" },
                { icon: Heart, text: "স্বেচ্ছায় রক্তদান কর্মসূচি বাস্তবায়ন করা।" },
                { icon: Users, text: "গরিব ও অসহায়দের সহায়তা করা।" },
                { icon: BookOpen, text: "সাহিত্য, সংস্কৃতি, ক্রীড়া ও বিনোদন উৎসাহিত করা।" },
                { icon: Scale, text: "মানবাধিকার রক্ষা ও ন্যায়বিচার প্রতিষ্ঠা করা।" }
              ].map((goal, i) => (
                <div 
                  key={i} 
                  className="flex items-start gap-4 text-slate-400"
                >
                  <div className="mt-1 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                    <goal.icon size={18} />
                  </div>
                  <span className="text-sm font-bold tracking-tight">{goal.text}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-rose-500/10 text-rose-400 p-6 rounded-2xl mb-12 text-sm font-bold border border-rose-500/20 flex items-center gap-4"
            >
              <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSignup} className="space-y-16">
            {/* Personal Info */}
            <section className="space-y-8">
              <h3 className="text-xl font-black text-white mb-8 flex items-center gap-4 uppercase">
                <div className="w-2 h-8 bg-indigo-500 rounded-full" /> সদস্যের প্রয়োজনীয় তথ্যাদি
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2 space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">সদস্যের নাম *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold placeholder:text-slate-700"
                    value={formData.name || ''}
                    onFocus={() => handleFocus('name')}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">পিতার নাম *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold"
                    value={formData.fatherName || ''}
                    onFocus={() => handleFocus('fatherName')}
                    onChange={(e) => setFormData({...formData, fatherName: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">মাতার নাম *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold"
                    value={formData.motherName || ''}
                    onFocus={() => handleFocus('motherName')}
                    onChange={(e) => setFormData({...formData, motherName: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">জন্ম তারিখ *</label>
                  <input
                    type="date"
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold [color-scheme:dark]"
                    value={formData.dob || ''}
                    onFocus={() => handleFocus('dob')}
                    onChange={(e) => setFormData({...formData, dob: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">ধর্ম *</label>
                  <select
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold appearance-none cursor-pointer"
                    value={formData.religion || 'Islam'}
                    onFocus={() => handleFocus('religion')}
                    onChange={(e) => setFormData({...formData, religion: e.target.value})}
                  >
                    <option value="Islam" className="bg-slate-900">ইসলাম</option>
                    <option value="Hindu" className="bg-slate-900">হিন্দু</option>
                    <option value="Christian" className="bg-slate-900">খ্রিস্টান</option>
                    <option value="Buddhist" className="bg-slate-900">বৌদ্ধ</option>
                    <option value="Other" className="bg-slate-900">অন্যান্য</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">পেশা *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold"
                    value={formData.profession || ''}
                    onFocus={() => handleFocus('profession')}
                    onChange={(e) => setFormData({...formData, profession: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">রক্তের গ্রুপ *</label>
                  <select
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold appearance-none cursor-pointer"
                    value={formData.bloodGroup || 'O+'}
                    onFocus={() => handleFocus('bloodGroup')}
                    onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})}
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg} className="bg-slate-900">{bg}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">বৈবাহিক অবস্থা *</label>
                  <select
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold appearance-none cursor-pointer"
                    value={formData.maritalStatus || 'Single'}
                    onFocus={() => handleFocus('maritalStatus')}
                    onChange={(e) => setFormData({...formData, maritalStatus: e.target.value})}
                  >
                    <option value="Single" className="bg-slate-900">অবিবাহিত</option>
                    <option value="Married" className="bg-slate-900">বিবাহিত</option>
                    <option value="Other" className="bg-slate-900">অন্যান্য</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">জাতীয় পরিচয় পত্র নং (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold"
                    value={formData.nid || ''}
                    onFocus={() => handleFocus('nid')}
                    onChange={(e) => setFormData({...formData, nid: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">ঠিকানা *</label>
                  <textarea
                    required
                    className="w-full px-6 py-6 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-32 resize-none text-white font-bold"
                    value={formData.address || ''}
                    onFocus={() => handleFocus('address')}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>
            </section>

            {/* Subscription Info */}
            <section className="space-y-8">
              <h3 className="text-xl font-black text-white mb-8 flex items-center gap-4 uppercase">
                <div className="w-2 h-8 bg-purple-500 rounded-full" /> চাঁদা ও সদস্যপদ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">চাঁদার পরিমান (৳) *</label>
                  <input
                    type="number"
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold"
                    value={formData.subscriptionAmount ?? 100}
                    onFocus={() => handleFocus('subscriptionAmount')}
                    onChange={(e) => setFormData({...formData, subscriptionAmount: Number(e.target.value)})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">চাঁদার ধরণ *</label>
                  <select
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold appearance-none cursor-pointer"
                    value={formData.subscriptionType || 'monthly'}
                    onFocus={() => handleFocus('subscriptionType')}
                    onChange={(e) => setFormData({...formData, subscriptionType: e.target.value as SubscriptionType})}
                  >
                    <option value="monthly" className="bg-slate-900">মাসিক</option>
                    <option value="yearly" className="bg-slate-900">বাৎসরিক</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">মোবাইল নং *</label>
                  <input
                    type="tel"
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold"
                    value={formData.mobileNo || ''}
                    onFocus={() => handleFocus('mobileNo')}
                    onChange={(e) => setFormData({...formData, mobileNo: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">ফেসবুক আইডি (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold"
                    value={formData.fbId || ''}
                    onFocus={() => handleFocus('fbId')}
                    onChange={(e) => setFormData({...formData, fbId: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">সদস্য হওয়ার তারিখ *</label>
                  <input
                    type="date"
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold [color-scheme:dark]"
                    value={formData.joinDate || ''}
                    onFocus={() => handleFocus('joinDate')}
                    onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
                  />
                </div>
              </div>
            </section>

            {/* Login Info (Only for new registrations) */}
            {!isCompletingProfile && (
              <section className="space-y-8">
                <h3 className="text-xl font-black text-white mb-8 flex items-center gap-4 uppercase">
                  <div className="w-2 h-8 bg-pink-500 rounded-full" /> লগইন তথ্য
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase ml-1">ইমেইল *</label>
                    <input
                      type="email"
                      required
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold"
                      value={formData.email || ''}
                      onFocus={() => handleFocus('email')}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase ml-1">পাসওয়ার্ড *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold"
                      value={formData.password || ''}
                      onFocus={() => handleFocus('password')}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase ml-1">পাসওয়ার্ড নিশ্চিত করুন *</label>
                    <input
                      type="password"
                      required
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold"
                      value={formData.confirmPassword || ''}
                      onFocus={() => handleFocus('confirmPassword')}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Pledge Section */}
            <section className="glass rounded-3xl p-8 md:p-14 text-white border border-white/5 relative overflow-hidden">
              <h3 className="text-2xl font-black mb-10 flex items-center gap-4 uppercase">
                <Award className="text-indigo-400" size={32} /> অঙ্গীকারনামা
              </h3>
              <div className="space-y-6 text-slate-400 text-base md:text-lg leading-relaxed text-justify font-bold transition-all">
                <p>
                  আমি <span className="text-white font-black underline decoration-indigo-500 decoration-4 underline-offset-8 px-2 bg-white/5 rounded-md">{formData.name || '.....'}</span> এই মর্মে অঙ্গীকার করিতেছি যে, রামনগর যুব-কল্যান ফাউন্ডেশনের লক্ষ্য ও উদ্দেশ্যের প্রতি পূর্ণ আস্থা ও বিশ্বাস নিয়ে সদস্য হওয়ার জন্য আবেদন করিতেছি।
                </p>
                <p>
                  আমি আরো অঙ্গীকার করিতেছি যে, রামনগর যুব-কল্যান ফাউন্ডেশনের স্বার্থ পরিপন্থী কোন কাজ করিব না। অত্র সংগঠনের নির্বাহী ও কার্য পরিষদ কর্তৃক যে কোন কর্মসূচি ও কর্মপদ্ধতি বাস্তবায়নের লক্ষ্যে আমি কাজ করিব।
                </p>
                <p>
                  এতদ্বার্থে আমি স্বেচ্ছায়, স্ব-জ্ঞানে অত্র সংগঠনের সদস্য ফরমের সকল নিয়ম কানুন পড়িয়া, শুনিয়া ও বুঝিয়া অন্যের প্ররোচনা ব্যতিরেকে নিম্নে স্বাক্ষর করিলাম।
                </p>
              </div>

              <label className="mt-12 flex items-center gap-6 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={agreedToPledge}
                    onChange={(e) => setAgreedToPledge(e.target.checked)}
                    onFocus={() => handleFocus('pledge')}
                  />
                  <div className="w-8 h-8 border-2 border-white/10 rounded-xl peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all group-hover:border-indigo-400" />
                  <CheckCircle size={20} className="absolute top-1.5 left-1.5 text-white opacity-0 peer-checked:opacity-100 transition-all scale-50 peer-checked:scale-100" />
                </div>
                <span className="text-sm font-bold text-slate-500 group-hover:text-white transition-colors">আমি সকল শর্তাবলীতে সম্মতি দিচ্ছি</span>
              </label>
            </section>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-6 rounded-2xl font-black text-xl shadow-xl transition-all flex items-center justify-center gap-4 uppercase border border-white/10"
            >
              {loading ? (
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><UserPlus size={28} /> {isCompletingProfile ? 'প্রোফাইল সম্পন্ন করুন' : 'রেজিস্ট্রেশন সম্পন্ন করুন'}</>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
