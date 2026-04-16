import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { BookOpen, Trophy, MessageSquare, LogOut, LayoutDashboard, Swords, Wallet, UserCircle, Menu, X, Sun, Moon } from 'lucide-react';

export default function Layout() {
  const { profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/challenges', icon: Swords, label: 'Arena' },
    { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { path: '/chat', icon: MessageSquare, label: 'AI Tutor' },
    { path: '/profile', icon: UserCircle, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row transition-colors duration-200">
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200">
        <Link to="/" className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <BookOpen className="w-6 h-6" />
          <span className="text-lg font-bold">CourseMate</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <BookOpen className="w-8 h-8" />
            <span className="text-xl font-bold">CourseMate</span>
          </Link>
          <button 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {/* Theme Toggle Desktop */}
          <button
            onClick={toggleTheme}
            className="w-full hidden md:flex items-center gap-3 px-4 py-3 mb-4 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-5 h-5" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          {/* Wallet Balance Display */}
          <div className="mb-4 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <Wallet className="w-4 h-4" />
              <span className="text-sm font-medium">Balance</span>
            </div>
            <span className="font-bold text-indigo-900 dark:text-indigo-100">₦{profile?.walletBalance?.toLocaleString() || 0}</span>
          </div>

          <Link to="/profile" className="flex items-center gap-3 mb-4 px-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold overflow-hidden shrink-0">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                profile?.displayName?.charAt(0) || 'S'
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{profile?.displayName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">{profile?.role}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full">
        <div className="p-4 md:p-8 max-w-7xl mx-auto text-gray-900 dark:text-gray-100">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
