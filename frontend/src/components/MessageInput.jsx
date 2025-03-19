import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, Search } from 'lucide-react';

const MessageInput = ({ onSendMessage, isLoading, onAttach }) => {
  const [message, setMessage] = useState('');
  const [forceWebSearch, setForceWebSearch] = useState(false);
  const textareaRef = useRef(null);
  
  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message, forceWebSearch);
      setMessage('');
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto w-full">
      <div className="relative flex items-end rounded-lg bg-input shadow-lg border border-border">
        <button
          type="button"
          onClick={onAttach}
          className="p-3 text-muted-foreground hover:text-foreground transition-colors"
          disabled={isLoading}
          aria-label="Attach document"
        >
          <Upload size={20} />
        </button>
        
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          disabled={isLoading}
          rows={1}
          className="flex-1 bg-transparent border-0 resize-none py-3 px-2 focus:ring-0 focus:outline-none text-foreground placeholder-muted-foreground max-h-[200px] min-h-[44px]"
        />
        
        <div className="flex items-center pr-2 gap-1 mb-1">
          <button
            type="button"
            onClick={() => setForceWebSearch(!forceWebSearch)}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-md text-sm transition-all duration-200 cursor-pointer ${
              forceWebSearch 
                ? 'bg-primary text-primary-foreground ring-2 ring-primary/50' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
            title={forceWebSearch ? "Web search enabled" : "Enable web search"}
            aria-label={forceWebSearch ? "Disable web search" : "Enable web search"}
          >
            <Search size={20} className="translate-y-0" />
          </button>
          
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-md transition-all duration-200 ${
              message.trim() && !isLoading
                ? 'text-primary hover:bg-secondary cursor-pointer'
                : 'text-muted-foreground cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            <Send size={20} className="translate-y-0" />
          </button>
        </div>
      </div>
      
      {isLoading && (
        <div className="absolute left-0 right-0 -bottom-6 text-center">
          <span className="text-xs text-muted-foreground animate-pulse-subtle">
            Processing...
          </span>
        </div>
      )}
    </form>
  );
};

export default MessageInput;
