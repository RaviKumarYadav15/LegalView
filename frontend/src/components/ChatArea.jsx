import React, { useState, useEffect, useRef } from 'react';
import { Scale, Send, BookOpen, Shield, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import CitationAccordion from './CitationAccordion';
import { parseSSE } from '../utils/parseSSE';
import { auth } from '../firebase';

const API_URL = import.meta.env.VITE_API_URL || "http://13.235.74.216:8000";


const SUGGESTIONS = [
  { icon: BookOpen, color: 'text-blue-400', title: 'Explore Laws', body: 'Ask about constitutional provisions, sections, and legal definitions', prompt: 'What is meant by an unfair trade practice under the Consumer Protection Act, 2019?' },
  { icon: Shield, color: 'text-purple-400', title: 'Safe & Accurate', body: 'Responses are strictly grounded in your provided legal documents', prompt: 'Summarize the BNS 2023 document' },
  { icon: Zap, color: 'text-yellow-400', title: 'Instant Analysis', body: 'Rapidly search and cross-reference thousands of pages', prompt: 'What are the exceptions to murder?' },
];

function SuggestionCard({ icon: Icon, color, title, body, onClick }) {
  return (
    <div
      className="bg-panel border border-line p-5 rounded-xl flex flex-col items-center text-center hover:bg-panel-hover transition-colors cursor-pointer"
      onClick={onClick}
    >
      <Icon size={24} className={`${color} mb-3`} />
      <h3 className="text-ink font-medium mb-2 text-base">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{body}</p>
    </div>
  );
}

export default function ChatArea({ sessionId, onMessageSent, token, isDark }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    setLoading(true);
    setMessages([]); // Immediately clear the screen to prevent showing old chat
    fetch(`${API_URL}/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized or not found");
        return res.json();
      })
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          setMessages([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setMessages([]);
        setLoading(false);
      });
  }, [sessionId, token]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      const currentToken = await currentUser.getIdToken();

      const res = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ query: input, session_id: sessionId }),
      });
      
      if (res.status === 429) {
          setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: "You are sending messages too quickly. Please slow down" }]);
          setLoading(false);
          return;
      }
      
      if (!res.ok) {
          const errorText = await res.text();
          setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: `SERVER ERROR (${res.status}):\n\`\`\`json\n${errorText}\n\`\`\`` }]);
          setLoading(false);
          return;
      }
      
      const aiMsgId = Date.now() + 1;
      setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', content: "", sources: [] }]);
      setLoading(false);
      
      for await (const { event, data } of parseSSE(res)) {
        if (event === 'sources') {
          setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, sources: data } : m));
        } else if (event === 'chunk') {
          setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: m.content + data } : m));
        }
      }
      
      if (onMessageSent) onMessageSent();
      
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: "Server not available" }]);
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      
      {/* Scrollable Chat History or Landing Page */}
      <div className="flex-1 overflow-y-auto px-4 md:px-24 flex flex-col">
        
        {messages.length === 0 ? (
          /* Landing Page */
          <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full pb-10">
            <div className="w-16 h-16 bg-panel rounded-full flex items-center justify-center mb-6">
              <Scale size={32} className="text-blue-400" />
            </div>
            <h2 className="text-4xl md:text-5xl font-medium text-ink mb-3 text-center">
              Query your Legal Query
            </h2>
            <p className="text-muted text-lg md:text-xl font-normal tracking-wide mb-12 text-center">
              No hallucinations, guaranteed citations
            </p>
            
            {/* Information Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {SUGGESTIONS.map(s => (
                <SuggestionCard key={s.title} {...s} onClick={() => setInput(s.prompt)} />
              ))}
            </div>
          </div>
        ) : (
          /* Active Chat Messages */
          <div className="max-w-3xl mx-auto w-full space-y-10 py-8 pb-10">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'user' ? (
                  <div className="bg-panel-hover text-ink rounded-[24px] rounded-tr-sm px-6 py-3.5 max-w-[85%] md:max-w-[75%] shadow-sm">
                    <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</p>
                  </div>
                ) : (
                  <div className="w-full text-ink">
                    <div className="flex items-center gap-3 mb-3">
                      <Scale className="text-blue-400" size={24} />
                    </div>
                    <div className={`prose ${isDark ? 'prose-invert' : ''} max-w-none prose-p:leading-relaxed prose-p:text-[15px] prose-pre:bg-panel prose-pre:border prose-pre:border-line prose-th:text-left prose-th:p-3 prose-th:border-b prose-th:border-line prose-td:p-3 prose-td:border-b prose-td:border-line`}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                      <CitationAccordion sources={msg.sources} />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex flex-col items-start w-full">
                <div className="flex items-center gap-3 mb-3">
                  <Scale className="text-blue-400 animate-pulse" size={24} />
                </div>
                <div className="flex gap-1 items-center px-2 py-4">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Fixed Footer Input Area */}
      <div className="shrink-0 w-full px-4 md:px-24 pb-6 pt-4 bg-canvas">
        <div className="max-w-3xl mx-auto w-full relative">
          <form 
            onSubmit={handleSend} 
            className="flex items-center bg-panel border border-line rounded-[32px] px-2 py-2 focus-within:ring-1 focus-within:ring-gray-500 focus-within:border-gray-500 transition-all shadow-lg"
          >
            <input 
              type="text" 
              placeholder="Ask LegalView a legal query..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-transparent border-none outline-none text-ink placeholder-gray-400 px-6 text-base h-12"
            />
            <div className="flex items-center pr-2 shrink-0">
              <button 
                type="submit" 
                disabled={!input.trim() || loading} 
                className={`cursor-pointer w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  input.trim() && !loading ? 'bg-cta text-cta-ink hover:bg-cta-hover' : 'text-gray-600 bg-transparent'
                }`}
              >
                <Send size={18} />
              </button>
            </div>
          </form>
          <p className="text-center text-xs text-muted mt-4 tracking-wide">
            LegalView may display inaccurate info, so double-check its responses
          </p>
        </div>
      </div>
    </div>
  );
}
