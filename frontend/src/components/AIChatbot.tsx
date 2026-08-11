import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Message {
  sender: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

export const AIChatbot: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: "Hello! I am the Odisha Disease Surveillance AI Assistant. How can I help you today? You can ask me about outbreak prevention, hospital availability, or active case statistics.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const suggestedPrompts = [
    "Dengue prevention guidelines",
    "Active cases in Cuttack",
    "Show hospitals near me",
    "Waterborne outbreak measures"
  ];

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg: Message = { sender: 'user', text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:8000/api/v1/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          district: user?.district || null
        })
      });

      if (!response.ok) throw new Error('Chatbot error');
      const data = await response.json();
      
      const botMsg: Message = {
        sender: 'bot',
        text: data.reply,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      // Offline fallback mock responses
      let replyText = "I'm having trouble reaching the AI server. Please make sure the backend is running. For immediate assistance, contact the toll-free health helpline at 104.";
      const q = text.toLowerCase();
      if (q.includes('dengue')) {
        replyText = "Dengue alert (Mock Fallback): Clean up standing water, sleep under insecticide-treated bed nets, and report any fever of 3+ days to your local ASHA worker.";
      } else if (q.includes('cuttack') || q.includes('khordha') || q.includes('puri')) {
        replyText = "Local records (Mock Fallback): There are active surveillance reports in this area. ASHA workers are conducting daily temperature checks.";
      }
      
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: replyText, timestamp: new Date() }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      {/* Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-govsaffron hover:bg-govsaffron-dark text-white flex items-center justify-center shadow-lg shadow-govsaffron/30 hover:scale-105 transition-all duration-200"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-96 h-[500px] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-govsaffron/20 flex items-center justify-center text-govsaffron-light">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Surveillance AI Chatbot</h3>
                <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Active Support Agent
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Message List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.sender === 'user' ? 'bg-govsaffron/20 text-govsaffron-light' : 'bg-govnavy-light/20 text-white'
                }`}>
                  {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-govsaffron text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50'
                }`}>
                  {msg.text.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? "mt-1.5" : ""}>{line}</p>
                  ))}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-govnavy-light/20 text-white flex items-center justify-center shrink-0">
                  <Bot size={14} />
                </div>
                <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-tl-none px-4 py-2 border border-slate-700/50 flex items-center gap-1 text-xs">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length === 1 && (
            <div className="px-4 py-2 border-t border-slate-800/50 flex flex-wrap gap-1.5 bg-slate-900/60">
              {suggestedPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(p)}
                  className="px-2.5 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-350 rounded-full hover:text-white transition"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input Panel */}
          <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
              placeholder="Ask for containment guidelines..."
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-govsaffron transition"
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              className="p-2 rounded-lg bg-govsaffron hover:bg-govsaffron-dark text-white shadow-md shadow-govsaffron/10 transition"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
