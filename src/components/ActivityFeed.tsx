import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { FileText, Trophy, Swords, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'material' | 'quiz_attempt' | 'challenge';
  title: string;
  userName: string;
  timestamp: any;
  courseCode?: string;
  extraInfo?: string;
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const [materialsSnap, attemptsSnap, challengesSnap] = await Promise.all([
        getDocs(query(collection(db, 'materials'), orderBy('createdAt', 'desc'), limit(5))),
        getDocs(query(collection(db, 'quizAttempts'), orderBy('completedAt', 'desc'), limit(5))),
        getDocs(query(collection(db, 'challenges'), orderBy('createdAt', 'desc'), limit(5)))
      ]);

      const items: Activity[] = [];

      materialsSnap.docs.forEach(doc => {
        const data = doc.data();
        items.push({
          id: doc.id,
          type: 'material',
          title: data.title,
          userName: 'A user', // Ideally fetch from users collection if needed
          timestamp: data.createdAt,
          courseCode: data.courseCode, // We might need to fetch course code if only ID is present
        });
      });

      attemptsSnap.docs.forEach(doc => {
        const data = doc.data();
        items.push({
          id: doc.id,
          type: 'quiz_attempt',
          title: `Scored ${data.score}/${data.totalQuestions} in a quiz`,
          userName: 'A user',
          timestamp: data.completedAt,
        });
      });

      challengesSnap.docs.forEach(doc => {
        const data = doc.data();
        items.push({
          id: doc.id,
          type: 'challenge',
          title: data.title,
          userName: 'A user',
          timestamp: data.createdAt,
          extraInfo: `₦${data.entryFee} entry`
        });
      });

      // Sort combined activities by timestamp
      items.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setActivities(items.slice(0, 10));
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Clock className="w-5 h-5 text-indigo-500" />
        Recent Activity
      </h3>
      <div className="space-y-3">
        {activities.map(activity => (
          <div key={activity.id} className="flex gap-3 text-sm">
            <div className={`p-2 rounded-lg h-fit ${
              activity.type === 'material' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' :
              activity.type === 'quiz_attempt' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600' :
              'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
            }`}>
              {activity.type === 'material' && <FileText className="w-4 h-4" />}
              {activity.type === 'quiz_attempt' && <Trophy className="w-4 h-4" />}
              {activity.type === 'challenge' && <Swords className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 dark:text-gray-200 leading-tight">
                <span className="font-medium">{activity.userName}</span>{' '}
                {activity.type === 'material' ? 'uploaded' : activity.type === 'challenge' ? 'created' : ''}{' '}
                <span className="font-semibold">{activity.title}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                {activity.timestamp ? formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true }) : 'just now'}
                {activity.extraInfo && ` • ${activity.extraInfo}`}
              </p>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <p className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">No recent activity.</p>
        )}
      </div>
    </div>
  );
}
