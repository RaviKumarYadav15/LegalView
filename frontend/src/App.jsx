import React, { useState, useEffect } from 'react';
import { Menu, Plus, Scale, LogOut, User as UserIcon } from 'lucide-react';
import Login from './Login';
import { auth, signOut, onAuthStateChanged } from './firebase';
import SidebarHistoryList from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ThemeToggleButton from './components/ThemeToggleButton';

const API_URL = import.meta.env.VITE_API_URL || "http://13.235.74.216:8000";


function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
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
  const startNewChat = () => {
    setCurrentSessionId(`session_${Date.now()}`);
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Scale className="text-blue-400 animate-pulse" size={48} />
      </div>
    );
  }

  if (!user || !token) return <Login isDark={isDark} setIsDark={setIsDark} />;

  return (
    <div className="flex h-screen bg-canvas text-ink font-sans overflow-hidden relative">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-20 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-[280px]' : 'w-0'} absolute md:relative z-30 h-full bg-panel transition-all duration-300 ease-in-out flex flex-col shrink-0 border-r border-line overflow-hidden`}>
        <div className="p-4 flex-1 flex flex-col h-full w-[280px]">
          
          <div className="flex items-center gap-4 mb-4">
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="cursor-pointer p-2 hover:bg-panel-hover rounded-full transition-colors text-muted hover:text-ink"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2 text-ink cursor-pointer" onClick={startNewChat}>
              <Scale className="text-blue-400 shrink-0" size={24} />
              <h1 className="text-xl font-medium tracking-wide">LegalView</h1>
            </div>
          </div>

          <button 
            onClick={startNewChat}
            className="cursor-pointer flex items-center gap-3 bg-panel-hover hover:bg-panel-hover text-sm font-medium py-3 px-4 rounded-full transition-colors w-full mb-6 mt-2 border border-line"
          >
            <Plus size={18} className="text-muted" />
            <span className="tracking-wide">New legal query</span>
          </button>

          <SidebarHistoryList 
            currentSessionId={currentSessionId} 
            setCurrentSessionId={setCurrentSessionId} 
            refreshTrigger={refreshTrigger}
            token={token}
            setIsSidebarOpen={setIsSidebarOpen}
          />
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-line bg-panel w-[280px] shrink-0">
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
            className="cursor-pointer flex items-center gap-3 w-full px-3 py-2 text-sm text-muted hover:text-ink hover:bg-panel-hover rounded-lg transition-colors"
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
          <ThemeToggleButton isDark={isDark} setIsDark={setIsDark} />
        </div>
        
        {/* Fixed Navbar (Only shows hamburger when sidebar is closed) */}
        <header className="h-16 flex items-center px-4 shrink-0 z-10 bg-canvas">
          {!isSidebarOpen && (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="cursor-pointer p-2 hover:bg-panel-hover rounded-full transition-colors text-muted hover:text-ink"
              >
                <Menu size={24} />
              </button>
              <div className="flex items-center gap-2 text-ink cursor-pointer" onClick={startNewChat}>
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

export default App;