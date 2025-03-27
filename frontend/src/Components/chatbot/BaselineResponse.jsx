import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const BaselineResponse = ({ baselineContent }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  // Return null only if baselineContent is definitely null or undefined
  if (baselineContent === null || baselineContent === undefined) {
    // For debugging - log when baselineContent is missing
    console.log('No baseline content provided to BaselineResponse component');
    return null;
  }
  
  // Otherwise, even if it's an empty string, still render the component
  return (
    <div className="mt-3 pt-2 border-t border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md py-1 px-2"
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronUp size={16} className="mr-1" />
        ) : (
          <ChevronDown size={16} className="mr-1" />
        )}
        <span>
          {isExpanded ? "Hide response without external tools" : "See response without external tools"}
        </span>
      </button>
      
      {isExpanded && (
        <div className="mt-2 pl-3 border-l-2 border-gray-200 text-gray-700 text-sm bg-gray-50 p-3 rounded">
          {baselineContent || "No baseline response available"}
        </div>
      )}
    </div>
  );
};

export default BaselineResponse;
