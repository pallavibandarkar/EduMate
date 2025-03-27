import React, { useState, useEffect } from 'react';
import MessageList from '../components/chatbot/MessageList';
import MessageInput from '../components/chatbot/MessageInput';
import SourceViewer from '../components/chatbot/SourceViewer';
import AttachModal from '../components/chatbot/AttachModal';
import SessionDrawer from '../components/chatbot/SessionDrawer';
import Spinner from '../components/ui/Spinner';
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
  const [baselineResponses, setBaselineResponses] = useState({});

  // Load session data when session changes
  useEffect(() => {
    console.log("=== useEffect triggered for sessionId:", currentSessionId);
    
    const loadSession = async () => {
      console.log("loadSession function started");
      
      if (!currentSessionId) {
        console.log("No currentSessionId, skipping session load");
        return;
      }
      
      console.log("Setting loading state to true");
      setLoading(true);
      
      try {
        console.log("Attempting to fetch session data for ID:", currentSessionId);
        const sessionData = await getSession(currentSessionId);
        console.log("Session data received:", sessionData);
        
        console.log("Setting messages:", sessionData.history?.length || 0, "messages");
        setMessages(sessionData.history || []);
        
        console.log("Setting processed documents:", sessionData.processed_documents?.length || 0, "docs");
        setProcessedDocs(sessionData.processed_documents || []);
        
        // Load baseline responses from session data
        if (sessionData.baseline_responses) {
          console.log('Loaded baseline responses:', sessionData.baseline_responses);
          setBaselineResponses(sessionData.baseline_responses);
        } else {
          console.log('No baseline responses in session data');
        }
      } catch (err) {
        console.error('Failed to load session:', err);
        console.error('Error details:', { 
          message: err.message, 
          status: err.status,
          stack: err.stack 
        });
        setError('Failed to load chat data');
      } finally {
        console.log("Session loading completed, setting loading state to false");
        setLoading(false);
      }
    };

    loadSession();
  }, [currentSessionId]);

  const handleSendMessage = async (content, forceWebSearch) => {
    if (!content.trim()) return;

    // Optimistically add user message
    const userMessage = { role: 'user', content };
    const userMsgIndex = messages.length;
    const userMsgKey = `user_msg_${userMsgIndex}`;
    
    setMessages(prev => [...prev, userMessage]);
    
    setLoading(true);
    setError('');
    
    try {
      const response = await sendMessage(content, currentSessionId, forceWebSearch);
      
      // Add assistant response
      const assistantMessage = { role: 'assistant', content: response.content };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Check response structure in detail
      console.log('Response from API:', response);
      
      // Update baseline responses if available
      if (response.baseline_response) {
        console.log(`Setting baseline response for ${userMsgKey}:`, response.baseline_response);
        setBaselineResponses(prev => ({
          ...prev,
          [userMsgKey]: response.baseline_response
        }));
      } else {
        console.log('No baseline response in API response');
      }
      
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
    <div className="flex h-screen overflow-hidden bg-white text-gray-800">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <header className="bg-gray-50 border-b border-gray-200 z-10">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* Empty div for spacing instead of the menu button */}
            <div className="w-8" /> {/* Spacer for alignment */}
            <h1 className="text-lg font-medium text-gray-900">Teacher Assistant</h1>
            
            <div className="flex items-center">
              <button 
                onClick={() => setIsSessionDrawerOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Open chats"
              >
                <Menu size={20} className="text-gray-700" />
              </button>
              
              {/* Document display button - only show when documents are present */}
              {processedDocs.length > 0 && (
                <button
                  onClick={openSessionDrawerWithDocuments}
                  className="ml-1 p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  title="View session documents"
                >
                  <Files size={18} className="text-gray-700" />
                  <span className="text-xs font-medium text-gray-700">{processedDocs.length}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Messages or Welcome Screen */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300">
          {showWelcomeScreen ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in">
              <h2 className="text-3xl font-medium mb-6 text-gray-900">What can I help with?</h2>
              <p className="text-gray-600 max-w-md mb-8">
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
              <MessageList 
                messages={messages} 
                baselineResponses={baselineResponses} 
              />
              
              {/* Loading Spinner - show when loading responses */}
              {loading && (
                <div className="flex justify-center items-center my-6 animate-fade-in">
                  <div className="flex flex-col items-center gap-2">
                    <Spinner size="lg" />
                    <p className="text-sm text-gray-600 animate-pulse-subtle">Thinking...</p>
                  </div>
                </div>
              )}
              
              {sources.length > 0 && <SourceViewer sources={sources} />}
              
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg max-w-3xl mx-auto">
                  {error}
                </div>
              )}
              
              {/* Processed Documents Info - Make it more prominent with a button to open drawer */}
              {processedDocs.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 max-w-3xl mx-auto">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-base font-medium text-gray-900">Processed Documents</h3>
                    <button 
                      onClick={openSessionDrawerWithDocuments}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {processedDocs.map((doc, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg text-sm">
                          {doc.toLowerCase().endsWith('.pdf') ? (
                            <FileText size={14} className="text-amber-600" />
                          ) : doc.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/) ? (
                            <Image size={14} className="text-emerald-600" />
                          ) : (
                            <Globe size={14} className="text-blue-600" />
                          )}
                          <span className="truncate text-gray-800">{doc}</span>
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
          <div className="border-t border-gray-200 p-4 bg-white backdrop-blur-sm">
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
        className="light-bg"
      />

      {/* Session Drawer - Pass initial tab state */}
      <SessionDrawer
        isOpen={isSessionDrawerOpen}
        onClose={() => setIsSessionDrawerOpen(false)}
        currentSessionId={currentSessionId}
        onSessionChange={setCurrentSessionId}
        className="light-bg"
      />
    </div>
  );
};

export default ChatPage;
