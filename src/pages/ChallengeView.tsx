import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Swords, Users, Trophy, AlertCircle, PlayCircle, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type, Schema } from '@google/genai';

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
}

interface UserProfile {
  uid: string;
  displayName: string;
  walletBalance?: number;
}

export default function ChallengeView() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (challengeId) fetchChallenge();
  }, [challengeId]);

  const fetchChallenge = async () => {
    try {
      const docRef = doc(db, 'challenges', challengeId!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Challenge;
        setChallenge(data);
        
        // Fetch participant profiles
        if (data.participants.length > 0) {
          // Note: in a real app with many participants, you'd want to paginate or use a different approach
          // Firestore 'in' queries are limited to 10 items. For MVP, we'll fetch individually or just top 10.
          const participantDocs = await Promise.all(
            data.participants.slice(0, 10).map(uid => getDoc(doc(db, 'users', uid)))
          );
          setParticipants(participantDocs.map(d => d.data() as UserProfile));
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `challenges/${challengeId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !profile || !challenge) return;
    
    if ((profile.walletBalance || 0) < challenge.entryFee) {
      setError('Insufficient wallet balance to join this challenge.');
      return;
    }

    setJoining(true);
    setError('');
    
    try {
      // 1. Deduct from user wallet
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        walletBalance: (profile.walletBalance || 0) - challenge.entryFee
      });

      // 2. Add to challenge participants and increase prize pool
      const challengeRef = doc(db, 'challenges', challenge.id);
      await updateDoc(challengeRef, {
        participants: arrayUnion(user.uid),
        prizePool: challenge.prizePool + challenge.entryFee
      });

      // Refresh data
      // In a real app, we'd update AuthContext profile state here too.
      // For MVP, we'll just reload the page to get fresh state.
      window.location.reload();
    } catch (error) {
      console.error(error);
      setError('Failed to join challenge. Please try again.');
      setJoining(false);
    }
  };

  const handleStartChallenge = async () => {
    if (!challenge || !user) return;
    setStarting(true);
    
    try {
      // Generate Quiz using High Thinking Mode
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctAnswer", "explanation"]
            }
          }
        },
        required: ["questions"]
      };

      const prompt = `Generate a 5-question multiple choice quiz for a university-level challenge on the topic: "${challenge.topic}". Make it challenging but fair. Return JSON matching the schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          thinkingConfig: {
            thinkingBudget: 2048
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      // Save quiz
      const quizRef = await addDoc(collection(db, 'quizzes'), {
        courseId: challenge.courseId,
        title: `Challenge: ${challenge.title}`,
        topic: challenge.topic,
        questions: result.questions,
        creatorId: 'system',
        createdAt: new Date()
      });

      // Update challenge status
      await updateDoc(doc(db, 'challenges', challenge.id), {
        status: 'active',
        quizId: quizRef.id
      });

      fetchChallenge();
    } catch (error) {
      console.error(error);
      setError('Failed to start challenge and generate quiz.');
    } finally {
      setStarting(false);
    }
  };

  const handleEndChallenge = async () => {
    if (!challenge || !user) return;
    setStarting(true);
    setError('');
    
    try {
      // 1. Fetch all attempts for this challenge
      const attemptsQ = query(collection(db, 'quizAttempts'), where('challengeId', '==', challenge.id));
      const attemptsSnap = await getDocs(attemptsQ);
      const attempts = attemptsSnap.docs.map(d => d.data());

      if (attempts.length === 0) {
        // Just mark as completed if no one took it
        await updateDoc(doc(db, 'challenges', challenge.id), { status: 'completed' });
        fetchChallenge();
        return;
      }

      // 2. Sort attempts by score (desc) then timestamp (asc for speed)
      attempts.sort((a: any, b: any) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.completedAt?.seconds - b.completedAt?.seconds;
      });

      // 3. Determine winners
      const winners = attempts.slice(0, 3);
      const firstPrize = challenge.prizePool * 0.40;
      const secondPrize = challenge.prizePool * 0.20;
      const thirdPrize = challenge.prizePool * 0.10;

      // 4. Update winner balances (In a real app, use a server-side routine/transaction)
      for (let i = 0; i < winners.length; i++) {
        const winner = winners[i];
        const prize = i === 0 ? firstPrize : i === 1 ? secondPrize : thirdPrize;
        
        const winRef = doc(db, 'users', winner.userId);
        const winSnap = await getDoc(winRef);
        if (winSnap.exists()) {
          const currentBalance = winSnap.data().walletBalance || 0;
          await updateDoc(winRef, { walletBalance: currentBalance + prize });
        }
      }

      // 5. Mark challenge as completed
      await updateDoc(doc(db, 'challenges', challenge.id), { 
        status: 'completed',
        winners: winners.map((w: any) => ({ userId: w.userId, score: w.score }))
      });

      fetchChallenge();
    } catch (error) {
      console.error(error);
      setError('Failed to end challenge and distribute prizes.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl w-full"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl w-full"></div>
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl w-full"></div>
        </div>
      </div>
    );
  }
  if (!challenge) return <div>Challenge not found.</div>;

  const hasJoined = user && challenge.participants.includes(user.uid);
  const isCreator = user && challenge.creatorId === user.uid;

  // Prize Distribution Math
  const firstPrize = challenge.prizePool * 0.40;
  const secondPrize = challenge.prizePool * 0.20;
  const thirdPrize = challenge.prizePool * 0.10;
  const platformFee = challenge.prizePool * 0.30;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white">
          <div className="flex justify-between items-start">
            <div>
              <span className="bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4 inline-block">
                {challenge.status}
              </span>
              <h1 className="text-3xl font-bold mb-2">{challenge.title}</h1>
              <p className="text-indigo-100 text-lg">{challenge.topic}</p>
            </div>
            <div className="text-right">
              <p className="text-indigo-200 text-sm mb-1">Total Prize Pool</p>
              <p className="text-4xl font-bold">₦{challenge.prizePool.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Prize Distribution
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-4 text-center">
                  <p className="text-yellow-800 dark:text-yellow-500 font-bold text-lg">1st Place</p>
                  <p className="text-yellow-600 dark:text-yellow-600 text-sm">40%</p>
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mt-2">₦{firstPrize.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-center">
                  <p className="text-gray-800 dark:text-gray-300 font-bold text-lg">2nd Place</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">20%</p>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-200 mt-2">₦{secondPrize.toLocaleString()}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-lg p-4 text-center">
                  <p className="text-orange-800 dark:text-orange-500 font-bold text-lg">3rd Place</p>
                  <p className="text-orange-600 dark:text-orange-600 text-sm">10%</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-400 mt-2">₦{thirdPrize.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">30% (₦{platformFee.toLocaleString()}) retained as platform fee.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                Participants ({challenge.participants.length})
              </h2>
              {participants.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {participants.map(p => (
                    <div key={p.uid} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-full px-3 py-1.5">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">
                        {p.displayName.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{p.displayName}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No one has joined yet. Be the first!</p>
              )}
            </section>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700 h-fit">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Action Center</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Entry Fee</span>
                <span className="font-bold text-gray-900 dark:text-white">₦{challenge.entryFee.toLocaleString()}</span>
              </div>
              
              {challenge.status === 'open' && !hasJoined && (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Pay & Join Challenge'}
                </button>
              )}

              {challenge.status === 'open' && hasJoined && (
                <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded-lg text-center font-medium border border-green-200 dark:border-green-800/50">
                  You have joined! Waiting for challenge to start.
                </div>
              )}

              {challenge.status === 'open' && isCreator && challenge.participants.length > 0 && (
                <button
                  onClick={handleStartChallenge}
                  disabled={starting}
                  className="w-full bg-yellow-500 text-white py-3 rounded-lg font-bold hover:bg-yellow-600 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
                >
                  {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><PlayCircle className="w-5 h-5" /> Start Challenge</>}
                </button>
              )}

              {challenge.status === 'active' && hasJoined && challenge.quizId && (
                <button
                  onClick={() => navigate(`/quiz/${challenge.quizId}?challengeId=${challenge.id}`)}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
                >
                  <PlayCircle className="w-5 h-5" /> Take Challenge Quiz
                </button>
              )}
              
              {challenge.status === 'active' && isCreator && (
                <button
                  onClick={handleEndChallenge}
                  disabled={starting}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
                >
                  {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'End & Distribute Prizes'}
                </button>
              )}

              {challenge.status === 'completed' && (
                <div className="space-y-4">
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-center font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
                    Challenge Ended
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wider">Winners</p>
                    {(challenge as any).winners?.map((winner: any, idx: number) => (
                      <div key={winner.userId} className="flex justify-between items-center p-3 rounded-lg bg-white dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-700' : 'bg-orange-100 text-orange-700'}`}>
                            {idx + 1}
                          </span>
                          <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">Player {winner.userId.slice(0, 5)}...</span>
                        </div>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{winner.score} pts</span>
                      </div>
                    ))}
                    {!(challenge as any).winners && (
                        <p className="text-center text-gray-500 text-xs italic">Calculating results...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
