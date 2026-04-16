import React, { useEffect, useState } from 'react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Users } from 'lucide-react';

interface Peer {
  uid: string;
  displayName: string;
  department: string;
  photoURL?: string;
}

export default function PeerDiscovery() {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPeers();
  }, []);

  const fetchPeers = async () => {
    try {
      const q = query(collection(db, 'users'), limit(10));
      const snap = await getDocs(q);
      setPeers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as Peer)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Users className="w-5 h-5 text-indigo-500" />
        Connect with Peers
      </h3>
      <div className="flex -space-x-3 overflow-hidden p-1">
        {peers.map(p => (
          <div 
            key={p.uid} 
            className="inline-block h-10 w-10 rounded-xl ring-4 ring-white dark:ring-gray-800 bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 cursor-pointer hover:scale-110 hover:z-10 transition-all shadow-sm"
            title={`${p.displayName} • ${p.department}`}
          >
            {p.photoURL ? (
              <img src={p.photoURL} alt="" className="h-full w-full object-cover rounded-xl" />
            ) : (
              p.displayName.charAt(0)
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 font-medium">Join over 1,200 students learning today.</p>
    </div>
  );
}
