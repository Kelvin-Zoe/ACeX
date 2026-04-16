import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, BrainCircuit, Loader2, Target } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', content: 'Hello! I am your AI Study Tutor. How can I help you prepare for your exams today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useDeepThinking, setUseDeepThinking] = useState(false);
  const [focusTopic, setFocusTopic] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for the API
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      
      // Add the new user message
      history.push({ role: 'user', parts: [{ text: userMessage.content }] });

      const modelName = useDeepThinking ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview';
      
      const config: any = {
        systemInstruction: `You are Leo, an expert university tutor. Your goal is to help students understand complex topics, prepare for exams, and explain concepts clearly. Be encouraging, structured, and use examples where possible.\n\nCurrent Focus Course/Topic: ${focusTopic || 'General Studies'}. Tailor your responses to this context if provided.`,
      };

      if (useDeepThinking) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: history,
        config
      });

      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.text || 'Sorry, I could not generate a response.'
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-semibold">
            <Bot className="w-6 h-6" />
            Leo (AI Tutor)
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input 
              type="checkbox" 
              checked={useDeepThinking}
              onChange={(e) => setUseDeepThinking(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            />
            <BrainCircuit className={`w-4 h-4 ${useDeepThinking ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`} />
            Deep Thinking Mode
          </label>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
          <Target className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-2" />
          <input
            type="text"
            value={focusTopic}
            onChange={(e) => setFocusTopic(e.target.value)}
            placeholder="Specify a course or topic to focus on (e.g., CSC201, Anatomy)..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400'
            }`}>
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
            }`}>
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-none p-4 flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              {useDeepThinking ? 'Leo is thinking deeply...' : 'Leo is thinking...'}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your courses..."
            className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
