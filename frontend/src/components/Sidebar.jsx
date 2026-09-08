import React, { useState, useEffect } from 'react';
import { MessageSquare, Edit2, Trash2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://13.235.74.216:8000";

function SidebarHistoryList({ currentSessionId, setCurrentSessionId, refreshTrigger, token, setIsSidebarOpen }) {
  const [historySessions, setHistorySessions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const fetchSessions = () => {
    fetch(`${API_URL}/sessions`, {
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

  const loadPastSession = (id) => {
    setCurrentSessionId(id);
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this chat history? This cannot be undone.")) {
      return;
    }
    
    fetch(`${API_URL}/sessions/${id}`, { 
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
    fetch(`${API_URL}/sessions/${id}/title`, {
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
                className="flex-1 flex items-center gap-2 w-full px-3 py-1.5 rounded-full bg-panel-hover"
              >
                <MessageSquare size={16} className="shrink-0 text-muted" />
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                  onBlur={(e) => handleRenameSubmit(e, session.id)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-ink h-7"
                />
              </form>
            ) : (
              <>
                <button 
                  onClick={() => loadPastSession(session.id)}
                  className={`cursor-pointer flex-1 flex items-center gap-3 w-full px-3 py-2 rounded-full text-sm transition-colors ${currentSessionId === session.id ? 'bg-panel-hover text-ink' : 'hover:bg-panel-hover text-muted'}`}
                >
                  <MessageSquare size={16} className={`shrink-0 ${currentSessionId === session.id ? 'text-blue-400' : 'group-hover:text-muted'}`} />
                  <span className="truncate text-left pr-14">{session.title}</span>
                </button>
                <div className="absolute right-2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(session.id);
                      setEditTitle(session.title);
                    }}
                    className="cursor-pointer p-1.5 rounded-full text-gray-500 hover:text-ink hover:bg-panel-hover"
                    title="Rename chat"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={(e) => deleteSession(e, session.id)}
                    className="cursor-pointer p-1.5 rounded-full text-gray-500 hover:text-red-400 hover:bg-panel-hover"
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

export default SidebarHistoryList;
