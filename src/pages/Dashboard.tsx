import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, addDoc, updateDoc, doc, serverTimestamp, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Book, Plus, ChevronRight, Search, Calendar, CheckCircle2, Circle, TrendingUp, Users, Swords } from 'lucide-react';
import ActivityFeed from '../components/ActivityFeed';
import PeerDiscovery from '../components/PeerDiscovery';

interface Course {
  id: string;
  code: string;
  title: string;
  department: string;
  level: number;
}

interface Reminder {
  id: string;
  title: string;
  courseId?: string;
  dueDate?: string;
  completed: boolean;
}

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: '', title: '', department: '', level: 100 });
  const [newReminder, setNewReminder] = useState({ title: '', courseId: '', dueDate: '' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (user) {
      fetchReminders();
    }
  }, [user]);

  const fetchReminders = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'reminders'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const remindersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder));
      remindersData.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      setReminders(remindersData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'reminders');
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const reminderData: any = {
        userId: user.uid,
        title: newReminder.title,
        completed: false,
        createdAt: serverTimestamp()
      };
      if (newReminder.courseId) reminderData.courseId = newReminder.courseId;
      if (newReminder.dueDate) reminderData.dueDate = newReminder.dueDate;

      await addDoc(collection(db, 'reminders'), reminderData);
      setShowAddReminderModal(false);
      setNewReminder({ title: '', courseId: '', dueDate: '' });
      fetchReminders();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reminders');
    }
  };

  const toggleReminder = async (reminder: Reminder) => {
    try {
      const reminderRef = doc(db, 'reminders', reminder.id);
      await updateDoc(reminderRef, { completed: !reminder.completed });
      setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, completed: !r.completed } : r));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reminders/${reminder.id}`);
    }
  };

  const fetchCourses = async () => {
    try {
      const q = query(collection(db, 'courses'));
      const snapshot = await getDocs(q);
      const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(coursesData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'courses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'courses'), {
        ...newCourse,
        level: Number(newCourse.level),
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewCourse({ code: '', title: '', department: '', level: 100 });
      fetchCourses();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'courses');
    }
  };

  const filteredCourses = courses.filter(course => 
    course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl w-full"></div>
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-64"></div>
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden shadow-xl shadow-indigo-200 dark:shadow-none">
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Welcome back, {profile?.displayName?.split(' ')[0]}! 👋</h1>
            <p className="text-indigo-100 opacity-90 text-lg">You have {reminders.filter(r => !r.completed).length} pending tasks to crush today.</p>
            <div className="mt-6 flex flex-wrap gap-3">
               <Link to="/courses" className="bg-white/20 backdrop-blur-md hover:bg-white/30 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border border-white/10 flex items-center gap-2">
                 <Book className="w-4 h-4" /> Explore Courses
               </Link>
               <Link to="/challenges" className="bg-indigo-500 hover:bg-indigo-400 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2">
                 <Swords className="w-4 h-4" /> Go to Arena
               </Link>
            </div>
          </div>
          <TrendingUp className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/5 -rotate-12 pointer-events-none" />
          <div className="absolute top-[-40px] left-[-40px] w-32 h-32 bg-indigo-400/20 rounded-full blur-3xl"></div>
        </div>

        {/* Reminders Section */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Deadlines & Reminders</h2>
            </div>
            <button
              onClick={() => setShowAddReminderModal(true)}
              className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="p-6">
            {reminders.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm italic">
                No upcoming deadlines. You're all clear!
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map(reminder => (
                  <div 
                    key={reminder.id} 
                    className={`flex items-center gap-4 p-4 rounded-2xl border ${reminder.completed ? 'bg-gray-50 dark:bg-gray-900/10 border-gray-100 dark:border-gray-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'} transition-all hover:shadow-sm`}
                  >
                    <button 
                      onClick={() => toggleReminder(reminder)}
                      className="shrink-0 transition-transform active:scale-90"
                    >
                      {reminder.completed ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-300 dark:text-gray-600 hover:text-indigo-500" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${reminder.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        {reminder.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {reminder.courseId && (
                          <span className="bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
                            {courses.find(c => c.id === reminder.courseId)?.code}
                          </span>
                        )}
                        {reminder.dueDate && (
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            Due {new Date(reminder.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Courses Section */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Active Courses</h2>
              <p className="text-xs text-gray-500 mt-1">Total of {filteredCourses.length} courses enrolled</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Filter courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all focus:shadow-lg focus:shadow-indigo-100 dark:focus:shadow-none"
                />
              </div>
              {profile?.role === 'admin' && (
                <button 
                  onClick={() => setShowAddModal(true)} 
                  className="bg-indigo-600 p-2.5 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredCourses.map(course => (
              <Link
                key={course.id}
                to={`/course/${course.id}`}
                className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm hover:shadow-xl hover:shadow-indigo-50 dark:hover:shadow-none transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                      <Book className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded-lg">
                      {course.level}L
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-1 group-hover:text-indigo-600 transition-colors">{course.code}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{course.title}</p>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400 group-hover:text-indigo-600 transition-colors">
                  <span className="flex items-center gap-1 opacity-70"><Users className="w-3 h-3" /> 24 peers</span>
                  <div className="flex items-center gap-1 translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                    <span>Enter</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Sidebar Content */}
      <aside className="space-y-8">
        {/* Profile Stats Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 text-center shadow-sm">
          <div className="relative inline-block mb-4">
             <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl mx-auto flex items-center justify-center text-3xl font-black text-indigo-700 dark:text-indigo-300 overflow-hidden">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile?.displayName?.charAt(0)
                )}
             </div>
             <div className="absolute -bottom-2 -right-2 bg-emerald-500 border-4 border-white dark:border-gray-800 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold">
                Lvl 4
             </div>
          </div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white leading-tight">{profile?.displayName}</h3>
          <p className="text-sm text-gray-500 mt-1">{profile?.department}</p>
          
          <div className="mt-8 grid grid-cols-2 gap-4">
             <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-2xl">
                <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Rank</span>
                <span className="font-black text-lg text-indigo-600">#12</span>
             </div>
             <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-2xl">
                <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1">XP</span>
                <span className="font-black text-lg text-indigo-600">2,480</span>
             </div>
          </div>
          
          <Link to="/profile" className="mt-6 block w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-sm font-bold hover:opacity-90 transition-all active:scale-95">
             Manage Profile
          </Link>
        </div>

        {/* Activity Feed Container */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <ActivityFeed />
        </div>

        {/* Peer Discovery */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
          <PeerDiscovery />
        </div>
      </aside>

      {/* Add Reminder Modal */}
      {showAddReminderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-8 transition-all animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">Add Reminder</h2>
            <p className="text-sm text-gray-500 mb-6">Keep track of your academic commitments.</p>
            <form onSubmit={handleAddReminder} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Task / Deadline</label>
                <input
                  type="text"
                  required
                  value={newReminder.title}
                  onChange={e => setNewReminder({...newReminder, title: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Read Chapter 4"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Course</label>
                <select
                  value={newReminder.courseId}
                  onChange={e => setNewReminder({...newReminder, courseId: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">None</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Due Date</label>
                <input
                  type="date"
                  value={newReminder.dueDate}
                  onChange={e => setNewReminder({...newReminder, dueDate: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddReminderModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100 dark:shadow-none transition-all"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-8 transition-all animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">New Course</h2>
            <p className="text-sm text-gray-500 mb-6">Create a new course for the community.</p>
            <form onSubmit={handleAddCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Course Code</label>
                <input
                  type="text"
                  required
                  value={newCourse.code}
                  onChange={e => setNewCourse({...newCourse, code: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. CSC201"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={newCourse.title}
                  onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Course title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Dept</label>
                  <input
                    type="text"
                    required
                    value={newCourse.department}
                    onChange={e => setNewCourse({...newCourse, department: e.target.value})}
                     className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="CSC"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Level</label>
                  <select
                    value={newCourse.level}
                    onChange={e => setNewCourse({...newCourse, level: Number(e.target.value)})}
                     className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {[100, 200, 300, 400, 500].map(l => (
                      <option key={l} value={l}>{l}L</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
                >
                  Add Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
