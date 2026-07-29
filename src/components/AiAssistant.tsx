import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, X, Bot, RefreshCw, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface AiAssistantProps {
  employees: any[];
  timeLogs: any[];
  selectedMonth: number;
  selectedYear: number;
}

export default function AiAssistant({ employees, timeLogs, selectedMonth, selectedYear }: AiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Xin chào! Tôi là **Trợ lý Nhân sự Chấm công AI** 🤖\n\nTôi có thể giúp gì cho bạn hôm nay? Tôi có thể phân tích dữ liệu chấm công, thống kê ngày phép, giờ tăng ca, hoặc tư vấn tối ưu hóa nhân sự.`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const contextData = {
        month: selectedMonth,
        year: selectedYear,
        totalEmployees: employees.length,
        totalLogs: timeLogs.length,
        employeesList: employees.map(emp => ({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          department: emp.department || 'N/A'
        }))
      };

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          history: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text })),
          contextData
        })
      });

      if (!response.ok) {
        throw new Error('Lỗi từ máy chủ AI');
      }

      const data = await response.json();
      
      const assistantMsg: Message = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        role: 'assistant',
        text: data.text || 'Tôi không nhận được phản hồi phù hợp.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error('Lỗi khi trò chuyện với AI:', error);
      setMessages(prev => [...prev, {
        id: 'error_' + Date.now(),
        role: 'assistant',
        text: '⚠️ Đã xảy ra lỗi khi kết nối trợ lý AI. Vui lòng thử lại sau giây lát!',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const suggestions = [
    "Phân tích tổng quan chấm công tháng này",
    "Có ai vắng mặt nhiều nhất không?",
    "Tổng hợp giờ tăng ca (OT) của nhân viên",
    "Gợi ý chính sách cải thiện chuyên cần"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[9999] no-print">
      {/* Floating Sparkles Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-500 dark:via-purple-500 dark:to-pink-500 text-white shadow-2xl flex items-center justify-center cursor-pointer focus:outline-none relative group overflow-hidden border border-white/20"
      >
        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Sparkles className="w-6 h-6 animate-pulse" />
        )}
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, y: 50, filter: 'blur(10px)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-18 right-0 w-[92vw] sm:w-[420px] h-[520px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[28px] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-900 to-purple-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Bot className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-sm tracking-tight">Trợ lý Chấm Công Visual</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                    <span className="text-[10px] text-purple-200">Powered by Gemini 3.5</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/40">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div className={`p-2 rounded-xl h-8 w-8 shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-3.5 rounded-2xl text-[11px] sm:text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-150 dark:border-slate-800/80 shadow-xs'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2.5 max-w-[85%] mr-auto">
                  <div className="p-2 rounded-xl h-8 w-8 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 flex items-center justify-center animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                    <span className="text-xs text-slate-400 dark:text-slate-500">Trợ lý đang suy nghĩ...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions list */}
            {messages.length === 1 && !isLoading && (
              <div className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-900 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Gợi ý câu hỏi</span>
                <div className="flex flex-col gap-1.5">
                  {suggestions.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestClick(sug)}
                      className="text-left w-full px-3 py-2 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />
                      <span className="truncate">{sug}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="p-3.5 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Nhập câu hỏi tại đây..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white shadow-md disabled:opacity-50 transition-all flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
