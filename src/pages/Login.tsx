import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" />;
  }

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 font-sans text-slate-900 dark:text-white selection:bg-indigo-100 dark:selection:bg-indigo-900/50 selection:text-indigo-900 dark:selection:text-indigo-100 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-between items-center"
      >
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <BookOpen className="w-8 h-8" />
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">CourseMate</span>
        </div>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          Sign In
        </button>
      </motion.nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-32 lg:pb-40 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-8 border border-indigo-100 dark:border-indigo-800/50">
            <Sparkles className="w-4 h-4" />
            <span>Meet Leo, your new AI tutor</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-8">
            The smarter way to <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300">
              ace your university exams
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 leading-relaxed max-w-2xl mx-auto">
            Access organized study materials, take AI-powered quizzes, and collaborate with peers. All in one minimal, focused workspace.
          </p>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 text-red-600 dark:text-red-400 px-6 py-4 rounded-2xl text-sm max-w-md mx-auto"
            >
              {error}
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-5 text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Get Started with Google'}
              {!loading && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-sm text-slate-500 dark:text-slate-500"
          >
            Join thousands of students from your faculty.
          </motion.p>
        </motion.div>

        {/* Floating background shapes for "inviting" feel */}
        <motion.div 
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ 
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-100/50 dark:bg-indigo-900/20 rounded-full blur-3xl -z-10"
        />
        <motion.div 
          animate={{ 
            y: [0, 20, 0],
            rotate: [0, -5, 0]
          }}
          transition={{ 
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-100/50 dark:bg-emerald-900/20 rounded-full blur-3xl -z-10"
        />
      </main>
    </div>
  );
}

