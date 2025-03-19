import React, { useState, useEffect } from 'react';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import SourceViewer from '../components/SourceViewer';
import AttachModal from '../components/AttachModal';
import SessionDrawer from '../components/SessionDrawer';
import { sendMessage, getSession } from '../utils/api';
import { Menu, FileText, Image, Globe, Files } from 'lucide-react';

const ChatPage = () => {
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sources, setSources] = useState([]);
  const [processedDocs, setProcessedDocs] = useState([]);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [isSessionDrawerOpen, setIsSessionDrawerOpen] = useState(false);

  // Load session data when session changes
  useEffect(() => {
    const loadSession = async () => {
      if (!currentSessionId) return;
      
      setLoading(true);
      try {
        const sessionData = await getSession(currentSessionId);
        setMessages(sessionData.history || []);
        setProcessedDocs(sessionData.processed_documents || []);
      } catch (err) {
        console.error('Failed to load session:', err);
        setError('Failed to load chat data');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [currentSessionId]);

  const handleSendMessage = async (content, forceWebSearch) => {
    if (!content.trim()) return;

    // Optimistically add user message
    const userMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    
    setLoading(true);
    setError('');
    
    try {
      const response = await sendMessage(content, currentSessionId, forceWebSearch);
      
      // Add assistant response
      const assistantMessage = { role: 'assistant', content: response.content };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update sources display
      setSources(response.sources || []);
      
      // Update session ID if it was created during this request
      if (response.session_id && (!currentSessionId || currentSessionId !== response.session_id)) {
        setCurrentSessionId(response.session_id);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to get response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentProcessed = (result) => {
    if (result && result.success && result.session_id) {
      // If a new session was created, switch to it
      if (!currentSessionId) {
        setCurrentSessionId(result.session_id);
      }
      
      // Update processed documents list
      setProcessedDocs(prev => {
        const newDocs = Array.isArray(result.sources) ? result.sources : [];
        return [...new Set([...prev, ...newDocs])];
      });
    }
  };

  // Add a function to toggle document view in drawer
  const openSessionDrawerWithDocuments = () => {
    setIsSessionDrawerOpen(true);
    // Note: The SessionDrawer component will need to be modified to accept and use this prop
  };

  const showWelcomeScreen = messages.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <header className="bg-card border-b border-border z-10">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* Empty div for spacing instead of the menu button */}
            <div className="w-8" /> {/* Spacer for alignment */}
            <h1 className="text-lg font-medium">Teacher Assistant</h1>
            
            <div className="flex items-center">
              <button 
                onClick={() => setIsSessionDrawerOpen(true)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                aria-label="Open chats"
              >
                <Menu size={20} />
              </button>
              
              {/* Document display button - only show when documents are present */}
              {processedDocs.length > 0 && (
                <button
                  onClick={openSessionDrawerWithDocuments}
                  className="ml-1 p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  title="View session documents"
                >
                  <Files size={18} />
                  <span className="text-xs font-medium">{processedDocs.length}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Messages or Welcome Screen */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted">
          {showWelcomeScreen ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in">
              <h2 className="text-3xl font-medium mb-6">What can I help with?</h2>
              <p className="text-muted-foreground max-w-md mb-8">
                Ask questions about your documents or any topic. You can upload files or share URLs to get more precise answers.
              </p>
              <div className="max-w-3xl w-full">
                <MessageInput 
                  onSendMessage={handleSendMessage} 
                  isLoading={loading}
                  onAttach={() => setIsAttachModalOpen(true)}
                />
              </div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              <MessageList messages={messages} />
              
              {sources.length > 0 && <SourceViewer sources={sources} />}
              
              {error && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg max-w-3xl mx-auto">
                  {error}
                </div>
              )}
              
              {/* Processed Documents Info - Make it more prominent with a button to open drawer */}
              {processedDocs.length > 0 && (
                <div className="mt-6 p-4 bg-card rounded-lg border border-border/70 max-w-3xl mx-auto">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-base font-medium">Processed Documents</h3>
                    <button 
                      onClick={openSessionDrawerWithDocuments}
                      className="text-xs text-primary hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {processedDocs.map((doc, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-secondary rounded-lg text-sm">
                          {doc.toLowerCase().endsWith('.pdf') ? (
                            <FileText size={14} className="text-amber-400" />
                          ) : doc.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/) ? (
                            <Image size={14} className="text-emerald-400" />
                          ) : (
                            <Globe size={14} className="text-blue-400" />
                          )}
                          <span className="truncate">{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area - Only show if not on welcome screen or we're already showing it there */}
        {!showWelcomeScreen && (
          <div className="border-t border-border p-4 bg-background/95 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto">
              <MessageInput 
                onSendMessage={handleSendMessage} 
                isLoading={loading}
                onAttach={() => setIsAttachModalOpen(true)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AttachModal 
        isOpen={isAttachModalOpen} 
        onClose={() => setIsAttachModalOpen(false)}
        sessionId={currentSessionId}
        onDocumentProcessed={handleDocumentProcessed}
        className="solid-bg"
      />

      {/* Session Drawer - Pass initial tab state */}
      <SessionDrawer
        isOpen={isSessionDrawerOpen}
        onClose={() => setIsSessionDrawerOpen(false)}
        currentSessionId={currentSessionId}
        onSessionChange={setCurrentSessionId}
        className="solid-bg"
      />
    </div>
  );
};

export default ChatPage;
