import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { UserCircle, Save, Loader2, AlertCircle, CheckCircle2, Upload, Wallet } from 'lucide-react';

import axios from 'axios';

export default function Profile() {
  const { user, profile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [level, setLevel] = useState<number>(100);
  const [photoURL, setPhotoURL] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(1000);
  const [toppingUp, setToppingUp] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setFaculty(profile.faculty || '');
      setDepartment(profile.department || '');
      setLevel(profile.level || 100);
      setPhotoURL(profile.photoURL || '');
    }
  }, [profile]);

  // Check for Paystack callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    
    if (reference && user) {
      const verifyPayment = async () => {
        setToppingUp(true);
        try {
          const response = await axios.get(`/api/paystack/verify/${reference}`);
          if (response.data.status === 'success') {
            setSuccess(true);
            // Remove the reference from URL without refreshing
            window.history.replaceState({}, document.title, window.location.pathname);
            // The server already updated the balance, but we might want to refresh the profile
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            setError(`Payment verification failed: ${response.data.message}`);
          }
        } catch (err) {
          console.error(err);
          setError('An error occurred while verifying your payment.');
        } finally {
          setToppingUp(false);
        }
      };
      verifyPayment();
    }
  }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const storageRef = ref(storage, `profile_pictures/${user.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
    } catch (err) {
      console.error(err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      // Update Firebase Auth Profile
      await updateProfile(user, {
        displayName: displayName,
        photoURL: photoURL || null
      });

      // Update Firestore Profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName,
        faculty,
        department,
        level: Number(level),
        photoURL
      });

      setSuccess(true);
      
      // Force a reload to update context and UI globally
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    setToppingUp(true);
    setError('');
    
    try {
      const response = await axios.post('/api/paystack/initialize', {
        email: user.email,
        amount: topUpAmount,
        metadata: {
          userId: user.uid
        }
      });
      
      if (response.data.status && response.data.data.authorization_url) {
        // Redirect to Paystack
        window.location.href = response.data.data.authorization_url;
      } else {
        throw new Error('Failed to initialize transaction');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to initialize payment. Please check your configuration.');
    } finally {
      setToppingUp(false);
    }
  };

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-8"></div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <UserCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          My Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your personal information and academic details.</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Profile updated successfully! Refreshing...
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-3xl overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg">
                  {photoURL ? (
                    <img src={photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    displayName.charAt(0).toUpperCase() || 'S'
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile.displayName}</h2>
                <p className="text-gray-500 dark:text-gray-400">{profile.email}</p>
                <span className="inline-block mt-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium px-2.5 py-0.5 rounded-full capitalize">
                  {profile.role}
                </span>
              </div>
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-4 flex items-center gap-4 min-w-[200px]">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Wallet Balance</p>
                <p className="text-xl font-bold text-indigo-900 dark:text-indigo-100">₦{profile.walletBalance?.toLocaleString() || 0}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTopUp(true)}
                className="ml-auto text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Top Up
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Faculty</label>
                <input
                  type="text"
                  value={faculty}
                  onChange={e => setFaculty(e.target.value)}
                  placeholder="e.g. Science"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Level</label>
                <select
                  value={level}
                  onChange={e => setLevel(Number(e.target.value))}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                >
                  {[100, 200, 300, 400, 500, 600].map(l => (
                    <option key={l} value={l}>{l} Level</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                type="submit"
                disabled={saving || uploading}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Top Up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <Wallet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Top Up Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Select an amount to add to your wallet. You will be redirected to Paystack to complete the payment.
            </p>
            
            <form onSubmit={handleTopUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₦)</label>
                <select
                  value={topUpAmount}
                  onChange={e => setTopUpAmount(Number(e.target.value))}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                >
                  <option value={500}>₦500</option>
                  <option value={1000}>₦1,000</option>
                  <option value={2000}>₦2,000</option>
                  <option value={5000}>₦5,000</option>
                  <option value={10000}>₦10,000</option>
                </select>
              </div>
              
              <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 p-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>Ensure you have configured your Paystack API keys in the settings.</p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTopUp(false)}
                  disabled={toppingUp}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={toppingUp}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {toppingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {toppingUp ? 'Processing...' : `Pay ₦${topUpAmount.toLocaleString()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
