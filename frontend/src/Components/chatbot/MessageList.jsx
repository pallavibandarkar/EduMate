import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import BaselineResponse from './BaselineResponse';

const MessageList = ({ messages, baselineResponses = {} }) => {
  const endRef = useRef(null);
  
  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // For debugging - log baseline responses when they change
  useEffect(() => {
    console.log('Baseline responses:', baselineResponses);
  }, [baselineResponses]);
  
  if (!messages || messages.length === 0) {
    return null; // Return null so we can show the centered welcome message
  }

  return (
    <div className="flex flex-col gap-8 pb-4 animate-fade-in">
      {messages.map((message, index) => {
        // Create a key for finding baseline responses - ensure it matches backend format
        const userMsgKey = message.role === 'assistant' && index > 0 ? `user_msg_${index-1}` : null;
        
        // Check if baseline response exists for this message
        const hasBaselineResponse = userMsgKey && baselineResponses && baselineResponses[userMsgKey];
        
        // For debugging - log when we find a baseline response
        if (hasBaselineResponse) {
          console.log(`Found baseline response for ${userMsgKey}:`, baselineResponses[userMsgKey]);
        }

        return (
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
                  ? 'bg-blue-100 ml-16 rounded-tr-none shadow-md border-blue-200' 
                  : 'bg-gray-100 mr-16 rounded-tl-none shadow-lg border-gray-200'
              } p-6 rounded-2xl border`}
            >
              <div className="font-semibold mb-2 text-xs flex items-center gap-2">
                {message.role === 'user' 
                  ? <span className="text-blue-700">You</span> 
                  : <span className="text-amber-700">Assistant</span>}
              </div>
              <div className="prose max-w-none prose-p:leading-relaxed prose-pre:bg-white prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-lg prose-pre:text-sm text-gray-800">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
              
              {/* Show baseline response if available - with forceful rendering for debugging */}
              {message.role === 'assistant' && (
                <BaselineResponse 
                  baselineContent={hasBaselineResponse ? baselineResponses[userMsgKey] : null} 
                />
              )}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
};

export default MessageList;
