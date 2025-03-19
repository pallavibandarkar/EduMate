import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const MessageList = ({ messages }) => {
  const endRef = useRef(null);
  
  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  if (!messages || messages.length === 0) {
    return null; // Return null so we can show the centered welcome message
  }

  return (
    <div className="flex flex-col gap-8 pb-4 animate-fade-in">
      {messages.map((message, index) => (
        <div 
          key={index}
          className={`rounded-lg animate-slide-up ${
            message.role === 'user' 
              ? 'justify-end flex cursor-pointer' 
              : 'justify-start flex cursor-pointer'
          }`}
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div 
            className={`max-w-3xl ${
              message.role === 'user' 
                ? 'bg-blue-800/30 ml-16 rounded-tr-none shadow-md border-blue-900/30' 
                : 'bg-zinc-800 mr-16 rounded-tl-none shadow-lg border-zinc-700'
            } p-6 rounded-2xl border`}
          >
            <div className="font-semibold mb-2 text-xs flex items-center gap-2">
              {message.role === 'user' 
                ? <span className="text-blue-400">You</span> 
                : <span className="text-amber-300">Assistant</span>}
            </div>
            <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5 prose-pre:rounded-lg prose-pre:text-sm">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};

export default MessageList;
