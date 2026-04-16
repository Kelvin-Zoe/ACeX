import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalScore: number;
  quizzesTaken: number;
}

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // In a real app, we would aggregate this via Cloud Functions or a scheduled job.
      // For MVP, we'll fetch recent attempts and aggregate client-side (not scalable, but works for demo).
      const attemptsQ = query(collection(db, 'quizAttempts'), orderBy('completedAt', 'desc'), limit(100));
      const attemptsSnap = await getDocs(attemptsQ);
      
      const userScores: Record<string, { score: number, count: number }> = {};
      attemptsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (!userScores[data.userId]) {
          userScores[data.userId] = { score: 0, count: 0 };
        }
        userScores[data.userId].score += data.score;
        userScores[data.userId].count += 1;
      });

      // Now fetch user details for these IDs
      const leaderData: LeaderboardEntry[] = [];
      for (const userId of Object.keys(userScores)) {
        // We'd normally batch this or keep denormalized data
        const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', userId)));
        if (!userDoc.empty) {
          leaderData.push({
            userId,
            displayName: userDoc.docs[0].data().displayName,
            totalScore: userScores[userId].score,
            quizzesTaken: userScores[userId].count
          });
        }
      }

      leaderData.sort((a, b) => b.totalScore - a.totalScore);
      setLeaders(leaderData.slice(0, 10));
    } catch (error) {
      console.error(error);
      // handleFirestoreError(error, OperationType.LIST, 'quizAttempts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-48"></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="h-12 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"></div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-50 dark:bg-gray-800 flex items-center px-4 gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 mb-4">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Global Leaderboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Top students based on quiz performance</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <div className="col-span-2 text-center">Rank</div>
          <div className="col-span-6">Student</div>
          <div className="col-span-2 text-center">Quizzes</div>
          <div className="col-span-2 text-right pr-4">Score</div>
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {leaders.map((leader, idx) => (
            <div key={leader.userId} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="col-span-2 flex justify-center">
                {idx === 0 ? <Medal className="w-6 h-6 text-yellow-500" /> :
                 idx === 1 ? <Medal className="w-6 h-6 text-gray-400" /> :
                 idx === 2 ? <Medal className="w-6 h-6 text-amber-600" /> :
                 <span className="text-lg font-bold text-gray-400 dark:text-gray-500">#{idx + 1}</span>}
              </div>
              <div className="col-span-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
                  {leader.displayName.charAt(0)}
                </div>
                <span className="font-medium text-gray-900 dark:text-white">{leader.displayName}</span>
              </div>
              <div className="col-span-2 text-center text-gray-600 dark:text-gray-400">
                {leader.quizzesTaken}
              </div>
              <div className="col-span-2 text-right pr-4 font-bold text-blue-600 dark:text-blue-400">
                {leader.totalScore}
              </div>
            </div>
          ))}
          {leaders.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No data available yet. Start taking quizzes to appear here!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
