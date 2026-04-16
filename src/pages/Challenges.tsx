import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Swords, Plus, Users, Trophy, Clock } from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  courseId: string;
  topic: string;
  entryFee: number;
  prizePool: number;
  status: 'open' | 'active' | 'completed';
  participants: string[];
  quizId?: string;
  creatorId: string;
  createdAt: any;
}

interface Course {
  id: string;
  code: string;
  title: string;
}

export default function Challenges() {
  const { user, profile } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChallenge, setNewChallenge] = useState({ title: '', courseId: '', topic: '', entryFee: 500 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [challengesSnap, coursesSnap] = await Promise.all([
        getDocs(query(collection(db, 'challenges'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'courses')))
      ]);

      setChallenges(challengesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Challenge)));
      setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'challenges');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'challenges'), {
        ...newChallenge,
        entryFee: Number(newChallenge.entryFee),
        prizePool: 0,
        status: 'open',
        participants: [],
        creatorId: user.uid,
        createdAt: serverTimestamp()
      });
      setShowCreateModal(false);
      setNewChallenge({ title: '', courseId: '', topic: '', entryFee: 500 });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'challenges');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Swords className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Challenge Arena
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Compete with peers, test your knowledge, and win prizes.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Create Challenge
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges.map(challenge => (
          <Link
            key={challenge.id}
            to={`/challenges/${challenge.id}`}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                challenge.status === 'open' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                challenge.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                {challenge.status.toUpperCase()}
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">₦{challenge.prizePool.toLocaleString()} Pool</span>
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{challenge.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{courses.find(c => c.id === challenge.courseId)?.code} - {challenge.topic}</p>
            
            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {challenge.participants.length} Joined
              </div>
              <div className="flex items-center gap-1 font-medium text-gray-900 dark:text-white">
                Entry: ₦{challenge.entryFee.toLocaleString()}
              </div>
            </div>
          </Link>
        ))}
        
        {challenges.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed">
            <Swords className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No active challenges</h3>
            <p className="text-gray-500 dark:text-gray-400">Be the first to create one and invite your peers!</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create Challenge</h2>
            <form onSubmit={handleCreateChallenge} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Challenge Title</label>
                <input
                  type="text"
                  required
                  value={newChallenge.title}
                  onChange={e => setNewChallenge({...newChallenge, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g. Midterm Prep Showdown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select
                  required
                  value={newChallenge.courseId}
                  onChange={e => setNewChallenge({...newChallenge, courseId: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select a course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <input
                  type="text"
                  required
                  value={newChallenge.topic}
                  onChange={e => setNewChallenge({...newChallenge, topic: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g. Data Structures"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entry Fee (₦500 - ₦5000)</label>
                <input
                  type="number"
                  required
                  min="500"
                  max="5000"
                  step="100"
                  value={newChallenge.entryFee}
                  onChange={e => setNewChallenge({...newChallenge, entryFee: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
