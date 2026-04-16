import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, PlayCircle, Plus, FileUp, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Course {
  id: string;
  code: string;
  title: string;
}

interface Material {
  id: string;
  title: string;
  type: string;
  url: string;
  status: string;
  upvotes: number;
}

interface Quiz {
  id: string;
  title: string;
  topic?: string;
  questions: any[];
}

export default function CourseView() {
  const { courseId } = useParams<{ courseId: string }>();
  const { profile, user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'materials' | 'quizzes'>('materials');
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
    type: 'pdf',
    url: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      // Fetch course details
      const courseDoc = await getDoc(doc(db, 'courses', courseId!));
      if (courseDoc.exists()) {
        setCourse({ id: courseDoc.id, ...courseDoc.data() } as Course);
      }

      // Fetch materials
      const materialsQ = query(collection(db, 'materials'), where('courseId', '==', courseId));
      const materialsSnap = await getDocs(materialsQ);
      setMaterials(materialsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Material)));

      // Fetch quizzes
      const quizzesQ = query(collection(db, 'quizzes'), where('courseId', '==', courseId));
      const quizzesSnap = await getDocs(quizzesQ);
      setQuizzes(quizzesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Quiz)));

    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `courses/${courseId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!course || !user) return;
    setIsGeneratingQuiz(true);
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a 5-question multiple choice quiz for a university course titled "${course.title}" (Course Code: ${course.code}). Make the questions relevant to a typical syllabus for this course.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "A catchy title for the quiz" },
              topic: { type: Type.STRING, description: "The specific topic covered" },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.INTEGER, description: "Index of the correct option (0-3)" },
                    explanation: { type: Type.STRING, description: "Explanation of why the answer is correct" }
                  }
                }
              }
            }
          }
        }
      });

      const generatedData = JSON.parse(response.text || "{}");
      
      if (generatedData.questions && generatedData.questions.length > 0) {
        const newQuiz = {
          courseId: course.id,
          title: generatedData.title || `Generated Quiz for ${course.code}`,
          topic: generatedData.topic || 'General',
          questions: generatedData.questions,
          creatorId: user.uid,
          createdAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, 'quizzes'), newQuiz);
        setQuizzes(prev => [...prev, { id: docRef.id, ...newQuiz } as any]);
      }
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      alert("Failed to generate quiz. Please try again.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course || !user) return;
    
    setUploading(true);
    try {
      let finalUrl = newMaterial.url;

      if (selectedFile && newMaterial.type !== 'link') {
        const fileRef = ref(storage, `materials/${course.id}/${Date.now()}_${selectedFile.name}`);
        await uploadBytes(fileRef, selectedFile);
        finalUrl = await getDownloadURL(fileRef);
      }

      const materialData = {
        courseId: course.id,
        title: newMaterial.title,
        description: newMaterial.description,
        type: newMaterial.type,
        url: finalUrl,
        uploaderId: user.uid,
        status: profile?.role === 'cm' || profile?.role === 'admin' ? 'verified' : 'pending',
        upvotes: 0,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'materials'), materialData);
      setMaterials(prev => [{ id: docRef.id, ...materialData } as any, ...prev]);
      
      setShowUploadModal(false);
      setNewMaterial({ title: '', description: '', type: 'pdf', url: '' });
      setSelectedFile(null);
    } catch (error) {
      console.error("Failed to upload material:", error);
      alert("Failed to upload material. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl w-full"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!course) return <div>Course not found.</div>;

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{course.code}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{course.code}: {course.title}</h1>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('materials')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'materials' 
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' 
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Study Materials
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'quizzes' 
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' 
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Practice Quizzes
          </button>
        </nav>
      </div>

      {activeTab === 'materials' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Course Materials</h2>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
            >
              <FileUp className="w-4 h-4" /> Upload Material
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {materials.map(material => (
                <li key={material.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <a href={material.url} target="_blank" rel="noreferrer" className="font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">
                        {material.title}
                      </a>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span className="uppercase">{material.type}</span>
                        <span>•</span>
                        {material.status === 'verified' && <span className="flex items-center text-green-600 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1"/> Verified</span>}
                        {material.status === 'pending' && <span className="flex items-center text-yellow-600 dark:text-yellow-400"><Clock className="w-3 h-3 mr-1"/> Pending</span>}
                        {material.status === 'rejected' && <span className="flex items-center text-red-600 dark:text-red-400"><XCircle className="w-3 h-3 mr-1"/> Rejected</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {material.upvotes} upvotes
                  </div>
                </li>
              ))}
              {materials.length === 0 && (
                <li className="p-8 text-center text-gray-500 dark:text-gray-400">No materials uploaded yet.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'quizzes' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Available Quizzes</h2>
            {(profile?.role === 'cm' || profile?.role === 'admin') && (
              <button 
                onClick={handleGenerateQuiz}
                disabled={isGeneratingQuiz}
                className="flex items-center gap-2 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isGeneratingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isGeneratingQuiz ? 'Generating...' : 'Generate Quiz with AI'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map(quiz => (
              <div key={quiz.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col">
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{quiz.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{quiz.questions?.length || 0} Questions • {quiz.topic || 'General'}</p>
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                  <Link
                    to={`/quiz/${quiz.id}`}
                    className="flex items-center justify-center gap-2 w-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 py-2 rounded-lg font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <PlayCircle className="w-5 h-5" /> Start Quiz
                  </Link>
                </div>
              </div>
            ))}
            {quizzes.length === 0 && (
              <div className="col-span-full p-8 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                No quizzes available for this course yet.
              </div>
            )}
          </div>
        </div>
      )}
      {/* Upload Material Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Upload Material</h2>
            <form onSubmit={handleUploadMaterial} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newMaterial.title}
                  onChange={e => setNewMaterial({...newMaterial, title: e.target.value})}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Week 1 Lecture Notes"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
                <textarea
                  value={newMaterial.description}
                  onChange={e => setNewMaterial({...newMaterial, description: e.target.value})}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  rows={3}
                  placeholder="Brief description of the material..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={newMaterial.type}
                  onChange={e => setNewMaterial({...newMaterial, type: e.target.value})}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="pdf">PDF</option>
                  <option value="document">Document (Word, PPT)</option>
                  <option value="image">Image</option>
                  <option value="link">External Link</option>
                </select>
              </div>
              
              {newMaterial.type === 'link' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                  <input
                    type="url"
                    required
                    value={newMaterial.url}
                    onChange={e => setNewMaterial({...newMaterial, url: e.target.value})}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="https://..."
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File</label>
                  <input
                    type="file"
                    required
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    accept={
                      newMaterial.type === 'pdf' ? '.pdf' :
                      newMaterial.type === 'image' ? 'image/*' :
                      '.doc,.docx,.ppt,.pptx'
                    }
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
