import React, { useState, useEffect, useRef } from 'react';
import { Menu, Plus, MessageSquare, Scale, Send, ChevronDown, Library, Trash2, Edit2, LogOut, User as UserIcon, BookOpen, Shield, Zap, ArrowLeft, Sun, Moon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Login from './Login';
import { auth, signOut, onAuthStateChanged } from './firebase';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState(`session_${Date.now()}`);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Theme State
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);
  
  // Auth State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        setToken(idToken);
      } else {
        setToken(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = () => signOut(auth);
  const startNewChat = () => setCurrentSessionId(`session_${Date.now()}`);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <Scale className="text-blue-400 animate-pulse" size={48} />
      </div>
    );
  }

  if (!user || !token) return <Login isDark={isDark} setIsDark={setIsDark} />;

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans overflow-hidden relative">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-20 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-[280px]' : 'w-0'} absolute md:relative z-30 h-full bg-[var(--bg-surface)] transition-all duration-300 ease-in-out flex flex-col shrink-0 border-r border-[var(--border-color)] overflow-hidden`}>
        <div className="p-4 flex-1 flex flex-col h-full w-[280px]">
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[var(--text-primary)] cursor-pointer" onClick={startNewChat}>
              <Scale className="text-blue-400 shrink-0" size={24} />
              <h1 className="text-xl font-medium tracking-wide">LegalView</h1>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 hover:bg-[var(--bg-surface-hover)] rounded-full transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <ArrowLeft size={24} />
            </button>
          </div>

          <button 
            onClick={startNewChat}
            className="cursor-pointer flex items-center gap-3 bg-[var(--bg-surface-hover)] hover:bg-[var(--bg-surface-hover)] text-sm font-medium py-3 px-4 rounded-full transition-colors w-full mb-6 mt-2 border border-[var(--border-color)]"
          >
            <Plus size={18} className="text-[var(--text-secondary)]" />
            <span className="tracking-wide">New legal query</span>
          </button>

          <SidebarHistoryList 
            currentSessionId={currentSessionId} 
            setCurrentSessionId={setCurrentSessionId} 
            refreshTrigger={refreshTrigger}
            token={token}
          />
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-surface)] w-[280px] shrink-0">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              {user.isAnonymous ? <UserIcon size={16} /> : user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium truncate">{user.isAnonymous ? 'Guest User' : user.email}</p>
              <p className="text-[11px] text-gray-500">{user.isAnonymous ? 'History not saved' : 'History saved securely'}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="cursor-pointer flex items-center gap-3 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* Theme Toggle Top Right */}
        <div className="absolute top-4 right-4 z-50">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="cursor-pointer flex items-center gap-3 bg-[var(--bg-surface)]/60 backdrop-blur-md border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-full transition-all shadow-md"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
        
        {/* Fixed Navbar (Only shows hamburger when sidebar is closed) */}
        <header className="h-16 flex items-center px-4 shrink-0 z-10 bg-[var(--bg-main)]">
          {!isSidebarOpen && (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="cursor-pointer p-2 hover:bg-[var(--bg-surface-hover)] rounded-full transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Menu size={24} />
              </button>
              <div className="flex items-center gap-2 text-[var(--text-primary)] cursor-pointer" onClick={startNewChat}>
                <Scale className="text-blue-400 shrink-0" size={24} />
                <h1 className="text-xl font-medium tracking-wide">LegalView</h1>
              </div>
            </div>
          )}
        </header>

        {/* Chat Area (Scrollable body, fixed footer) */}
        <ChatArea 
          sessionId={currentSessionId} 
          onMessageSent={() => setRefreshTrigger(prev => prev + 1)}
          token={token}
          isDark={isDark}
        />
      </div>

    </div>
  );
}

// ==========================================
// Sidebar History List Component
// ==========================================
function SidebarHistoryList({ currentSessionId, setCurrentSessionId, refreshTrigger, token }) {
  const [historySessions, setHistorySessions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const fetchSessions = () => {
    fetch('http://13.235.74.216:8000/sessions', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.sessions) setHistorySessions(data.sessions);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchSessions();
  }, [refreshTrigger, token]);

  const loadPastSession = (id) => setCurrentSessionId(id);

  const deleteSession = (e, id) => {
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this chat history? This cannot be undone.")) {
      return;
    }
    
    fetch(`http://13.235.74.216:8000/sessions/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(() => {
        if (currentSessionId === id) setCurrentSessionId(`session_${Date.now()}`);
        fetchSessions();
      })
      .catch(err => console.error(err));
  };

  const handleRenameSubmit = (e, id) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    fetch(`http://13.235.74.216:8000/sessions/${id}/title`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title: editTitle })
    })
    .then(() => {
      setEditingId(null);
      fetchSessions();
    })
    .catch(err => console.error(err));
  };

  if (historySessions.length === 0) return null;

  return (
    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
      <div className="px-3 text-xs font-semibold text-gray-500 mb-2 tracking-wider">Past Queries</div>
      <div className="space-y-1">
        {historySessions.map(session => (
          <div key={session.id} className="relative group flex items-center">
            {editingId === session.id ? (
              <form 
                onSubmit={(e) => handleRenameSubmit(e, session.id)}
                className="flex-1 flex items-center gap-2 w-full px-3 py-1.5 rounded-full bg-[var(--bg-surface-hover)]"
              >
                <MessageSquare size={16} className="shrink-0 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                  onBlur={(e) => handleRenameSubmit(e, session.id)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-primary)] h-7"
                />
              </form>
            ) : (
              <>
                <button 
                  onClick={() => loadPastSession(session.id)}
                  className={`cursor-pointer flex-1 flex items-center gap-3 w-full px-3 py-2 rounded-full text-sm transition-colors ${currentSessionId === session.id ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)]' : 'hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)]'}`}
                >
                  <MessageSquare size={16} className={`shrink-0 ${currentSessionId === session.id ? 'text-blue-400' : 'group-hover:text-[var(--text-secondary)]'}`} />
                  <span className="truncate text-left pr-14">{session.title}</span>
                </button>
                <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(session.id);
                      setEditTitle(session.title);
                    }}
                    className="cursor-pointer p-1.5 rounded-full text-gray-500 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
                    title="Rename chat"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={(e) => deleteSession(e, session.id)}
                    className="cursor-pointer p-1.5 rounded-full text-gray-500 hover:text-red-400 hover:bg-[var(--bg-surface-hover)]"
                    title="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// Main Chat Area Component
// ==========================================
function ChatArea({ sessionId, onMessageSent, token, isDark }) {
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
    fetch(`http://13.235.74.216:8000/sessions/${sessionId}`, {
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

      const res = await fetch('http://13.235.74.216:8000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ query: input, session_id: sessionId }),
      });
      
      const data = await res.json();
      
      if (res.status === 429) {
          setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: "You are sending messages too quickly. Please slow down" }]);
          setLoading(false);
          return;
      }
      
      const aiMsg = {
        id: Date.now() + 1,
        role: 'ai',
        content: data.answer || "Sorry, I couldn't generate an answer",
        sources: data.chunks || []
      };
      setMessages(prev => [...prev, aiMsg]);
      setLoading(false);
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
            <div className="w-16 h-16 bg-[var(--bg-surface)] rounded-full flex items-center justify-center mb-6">
              <Scale size={32} className="text-blue-400" />
            </div>
            <h2 className="text-4xl md:text-5xl font-medium text-[var(--text-primary)] mb-3 text-center">
              Query your Legal Query
            </h2>
            <p className="text-[var(--text-secondary)] text-lg md:text-xl font-normal tracking-wide mb-12 text-center">
              No hallucinations, guaranteed citations
            </p>
            
            {/* Information Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-5 rounded-xl flex flex-col items-center text-center hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer" onClick={() => setInput("What are the provisions for fundamental rights?")}>
                <BookOpen size={24} className="text-blue-400 mb-3" />
                <h3 className="text-[var(--text-primary)] font-medium mb-2 text-base">Explore Laws</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">Ask about constitutional provisions, sections, and legal definitions</p>
              </div>
              <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-5 rounded-xl flex flex-col items-center text-center hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer" onClick={() => setInput("Summarize the BNS 2023 document")}>
                <Shield size={24} className="text-purple-400 mb-3" />
                <h3 className="text-[var(--text-primary)] font-medium mb-2 text-base">Safe & Accurate</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">Responses are strictly grounded in your provided legal documents</p>
              </div>
              <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-5 rounded-xl flex flex-col items-center text-center hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer" onClick={() => setInput("What are the exceptions to murder?")}>
                <Zap size={24} className="text-yellow-400 mb-3" />
                <h3 className="text-[var(--text-primary)] font-medium mb-2 text-base">Instant Analysis</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">Rapidly search and cross-reference thousands of pages</p>
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Messages */
          <div className="max-w-3xl mx-auto w-full space-y-10 py-8 pb-10">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'user' ? (
                  <div className="bg-[var(--bg-surface-hover)] text-[var(--text-primary)] rounded-[24px] rounded-tr-sm px-6 py-3.5 max-w-[85%] md:max-w-[75%] shadow-sm">
                    <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</p>
                  </div>
                ) : (
                  <div className="w-full text-[var(--text-primary)]">
                    <div className="flex items-center gap-3 mb-3">
                      <Scale className="text-blue-400" size={24} />
                    </div>
                    <div className={`prose ${isDark ? 'prose-invert' : ''} max-w-none prose-p:leading-relaxed prose-p:text-[15px] prose-pre:bg-[var(--bg-surface)] prose-pre:border prose-pre:border-[var(--border-color)] prose-th:text-left prose-th:p-3 prose-th:border-b prose-th:border-[var(--border-color)] prose-td:p-3 prose-td:border-b prose-td:border-[var(--border-color)]`}>
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
      <div className="shrink-0 w-full px-4 md:px-24 pb-6 pt-4 bg-[var(--bg-main)]">
        <div className="max-w-3xl mx-auto w-full relative">
          <form 
            onSubmit={handleSend} 
            className="flex items-center bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[32px] px-2 py-2 focus-within:ring-1 focus-within:ring-gray-500 focus-within:border-gray-500 transition-all shadow-lg"
          >
            <input 
              type="text" 
              placeholder="Ask LegalView a legal query..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-gray-400 px-6 text-base h-12"
            />
            <div className="flex items-center pr-2 shrink-0">
              <button 
                type="submit" 
                disabled={!input.trim() || loading} 
                className={`cursor-pointer w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  input.trim() && !loading ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)]' : 'text-gray-600 bg-transparent'
                }`}
              >
                <Send size={18} />
              </button>
            </div>
          </form>
          <p className="text-center text-xs text-[var(--text-secondary)] mt-4 tracking-wide">
            LegalView may display inaccurate info, so double-check its responses
          </p>
        </div>
      </div>
    </div>
  );
}

function CitationAccordion({ sources }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-8 border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-main)]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer w-full flex items-center justify-between p-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
          <Library size={16} className="text-blue-400" />
          View {sources.length} Retrieved Citations
        </div>
        <ChevronDown 
          size={16} 
          className={`text-[var(--text-secondary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      {isOpen && (
        <div className="p-4 grid gap-3 border-t border-[var(--border-color)] bg-[var(--bg-surface)]">
          {sources.map((src, idx) => (
            <div key={idx} className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-blue-400">Match: {(src.score * 100).toFixed(1)}%</span>
                <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface-hover)] px-2.5 py-1 rounded-md max-w-[70%] truncate">
                  {src.source} (Pg {src.page}) {src.legal_meta ? `• ${src.legal_meta}` : ""}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">{src.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
