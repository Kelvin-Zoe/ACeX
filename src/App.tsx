/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CourseView from './pages/CourseView';
import QuizView from './pages/QuizView';
import Leaderboard from './pages/Leaderboard';
import Chatbot from './pages/Chatbot';
import Challenges from './pages/Challenges';
import ChallengeView from './pages/ChallengeView';
import Profile from './pages/Profile';
import Layout from './components/Layout';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 dark:text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="course/:courseId" element={<CourseView />} />
                <Route path="quiz/:quizId" element={<QuizView />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="chat" element={<Chatbot />} />
                <Route path="challenges" element={<Challenges />} />
                <Route path="challenges/:challengeId" element={<ChallengeView />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
