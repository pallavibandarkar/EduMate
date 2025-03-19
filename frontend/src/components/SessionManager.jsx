import React, { useState, useEffect } from 'react';
import { X, PenLine, Trash2 } from 'lucide-react';
import { getSessions, createSession, deleteSession } from '../utils/api';

const SessionDrawer = ({ isOpen, onClose, currentSessionId, onSessionChange, className }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await getSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      setError('Failed to load chats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    setIsCreating(true);
    try {
      const { session_id } = await createSession("New chat");
      setSessions([...sessions, { session_id, session_name: "New chat" }]);
      onSessionChange(session_id);
      onClose(); // Close drawer when selecting new chat
    } catch (err) {
      setError('Failed to create chat');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat?')) {
      try {
        await deleteSession(sessionId);
        setSessions(sessions.filter(session => session.session_id !== sessionId));

        if (sessionId === currentSessionId) {
          const remainingSessions = sessions.filter(session => session.session_id !== sessionId);
          if (remainingSessions.length > 0) {
            onSessionChange(remainingSessions[0].session_id);
          } else {
            onSessionChange(null);
          }
        }
      } catch (err) {
        setError('Failed to delete chat');
        console.error(err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      onClick={onClose}
    >
      <div
        className="fixed inset-y-0 left-0 w-80 bg-card shadow-xl z-40 animate-slide-up border-r border-sidebar-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <h2 className="text-xl font-medium">Chats</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-sidebar-accent rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Create new chat button */}
          <button
            onClick={handleCreateSession}
            disabled={isCreating}
            className="flex items-center w-full gap-2 p-3 bg-sidebar-accent hover:bg-sidebar-accent/80 rounded-lg transition-colors text-left"
          >
            <PenLine size={18} />
            <span>New chat</span>
          </button>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-900/30 text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Chats list */}
          <div className="space-y-1 mt-2">
            <h3 className="text-xs text-sidebar-foreground/70 uppercase font-medium px-2 mb-2">Recent chats</h3>

            {loading ? (
              <div className="flex justify-center p-4">
                <div className="animate-pulse-subtle text-sidebar-foreground/60">Loading...</div>
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sidebar-foreground/60 text-sm p-2">No chats available</p>
            ) : (
              <div className="space-y-0.5 max-h-[calc(100vh-180px)] overflow-y-auto pb-4">
                {sessions.map((session) => (
                  <div
                    key={session.session_id}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-colors ${
                      session.session_id === currentSessionId
                        ? 'bg-sidebar-primary/10 text-sidebar-primary'
                        : 'hover:bg-sidebar-accent/70 text-sidebar-foreground'
                    }`}
                    onClick={() => {
                      onSessionChange(session.session_id);
                      onClose(); // Close drawer when selecting chat
                    }}
                  >
                    <span className="truncate text-sm">{session.session_name}</span>
                    <button
                      onClick={(e) => handleDeleteSession(session.session_id, e)}
                      className="p-1 rounded-full opacity-60 hover:opacity-100 hover:bg-sidebar-accent transition-all"
                      aria-label="Delete chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDrawer;
