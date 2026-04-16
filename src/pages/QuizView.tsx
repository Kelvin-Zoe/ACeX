import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Quiz {
  id: string;
  title: string;
  courseId: string;
  questions: Question[];
}

export default function QuizView() {
  const { quizId } = useParams<{ quizId: string }>();
  const [searchParams] = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (quizId) fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const docRef = doc(db, 'quizzes', quizId!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setQuiz({ id: docSnap.id, ...docSnap.data() } as Quiz);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `quizzes/${quizId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (optionIdx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [currentQuestionIdx]: optionIdx }));
  };

  const handleSubmit = async () => {
    if (!quiz || !user) return;
    
    let calculatedScore = 0;
    quiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        calculatedScore += 1;
      }
    });
    
    setScore(calculatedScore);
    setIsSubmitted(true);

    try {
      const attemptData: any = {
        quizId: quiz.id,
        userId: user.uid,
        courseId: quiz.courseId,
        score: calculatedScore,
        totalQuestions: quiz.questions.length,
        completedAt: serverTimestamp()
      };
      
      if (challengeId) {
        attemptData.challengeId = challengeId;
      }

      await addDoc(collection(db, 'quizAttempts'), attemptData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'quizAttempts');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-8"></div>
        <div className="h-48 bg-gray-200 rounded-xl w-full"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded-xl w-full"></div>
          ))}
        </div>
      </div>
    );
  }
  if (!quiz) return <div>Quiz not found.</div>;

  const currentQuestion = quiz.questions[currentQuestionIdx];
  const isLastQuestion = currentQuestionIdx === quiz.questions.length - 1;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Question {currentQuestionIdx + 1} of {quiz.questions.length}</span>
          {isSubmitted && <span className="font-bold text-blue-600">Score: {score} / {quiz.questions.length}</span>}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all" 
            style={{ width: `${((currentQuestionIdx + 1) / quiz.questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8 mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">{currentQuestion.question}</h2>
        
        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedAnswers[currentQuestionIdx] === idx;
            const isCorrect = currentQuestion.correctAnswer === idx;
            
            let btnClass = "w-full text-left p-4 rounded-lg border transition-all ";
            
            if (!isSubmitted) {
              btnClass += isSelected 
                ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" 
                : "border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-300";
            } else {
              if (isCorrect) {
                btnClass += "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300";
              } else if (isSelected && !isCorrect) {
                btnClass += "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300";
              } else {
                btnClass += "border-gray-200 dark:border-gray-700 opacity-50 text-gray-900 dark:text-gray-300";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(idx)}
                disabled={isSubmitted}
                className={btnClass}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {isSubmitted && isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {isSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                </div>
              </button>
            );
          })}
        </div>

        {isSubmitted && (
          <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
            <h4 className="font-medium text-indigo-900 dark:text-indigo-300 mb-1">Explanation</h4>
            <p className="text-sm text-indigo-800 dark:text-indigo-200">{currentQuestion.explanation}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIdx === 0}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>
        
        {!isSubmitted ? (
          isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length < quiz.questions.length}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestionIdx(prev => Math.min(quiz.questions.length - 1, prev + 1))}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )
        ) : (
          isLastQuestion ? (
            <button
              onClick={() => navigate(`/course/${quiz.courseId}`)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Back to Course
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestionIdx(prev => Math.min(quiz.questions.length - 1, prev + 1))}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              Next Question <ArrowRight className="w-4 h-4" />
            </button>
          )
        )}
      </div>
    </div>
  );
}
