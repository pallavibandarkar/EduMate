import React from 'react';
import { FileText, Image, Globe } from 'lucide-react';

const SourceViewer = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-8 p-5 bg-white backdrop-blur-sm rounded-2xl border border-gray-200 max-w-3xl mx-auto animate-slide-up shadow-lg">
      <h3 className="text-base font-medium mb-4 flex items-center">
        <span className="bg-blue-100 p-1.5 rounded-md mr-2">
          <Globe size={16} className="text-blue-600" />
        </span>
        Sources
      </h3>
      <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
        {sources.map((source, index) => (
          <div 
            key={index} 
            className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
          >
            {source.type === 'web' ? (
              <div>
                <p className="font-medium flex items-center text-sm mb-2">
                  <Globe size={14} className="mr-2 text-blue-600" /> 
                  Web Source
                </p>
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:text-blue-800 text-sm truncate block transition-colors"
                >
                  {source.name}
                </a>
              </div>
            ) : source.type === 'image' ? (
              <div>
                <p className="font-medium flex items-center text-sm mb-2">
                  <Image size={14} className="mr-2 text-emerald-600" /> 
                  Image: {source.name}
                </p>
                {source.content && (
                  <p className="text-sm text-gray-600 mt-1 bg-gray-100 p-2 rounded-lg">{source.content}</p>
                )}
              </div>
            ) : (
              <div>
                <p className="font-medium flex items-center text-sm mb-2">
                  <FileText size={14} className="mr-2 text-amber-600" /> 
                  Document: {source.name}
                </p>
                {source.content && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2 bg-gray-100 p-2 rounded-lg">{source.content}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SourceViewer;
