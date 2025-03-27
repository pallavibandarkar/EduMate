import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import Spinner from '../ui/Spinner';

const CurriculumStepDetail = ({ stepDetail, stepIndex, isLoading }) => {
  const [copySuccess, setCopySuccess] = useState('');
  
  useEffect(() => {
    // Log raw data for debugging
    if (stepDetail) {
      console.log("Raw step detail data:", stepDetail);
      console.log("Formatted text content:", stepDetail.formatted_text);
    }
  }, [stepDetail]);

  // Clear copy success message after 2 seconds
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => {
        setCopySuccess('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg flex justify-center items-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-gray-600">Loading step details...</p>
        </div>
      </div>
    );
  }

  if (!stepDetail) {
    return (
      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg text-center">
        <p className="text-gray-700">Select a step to view its details</p>
      </div>
    );
  }

  // Convert markdown to HTML for Word compatibility
  const convertToHtml = (markdown) => {
    // Create a temporary div with ReactMarkdown to render HTML
    const tempDiv = document.createElement('div');
    const reactElement = (
      <ReactMarkdown 
        rehypePlugins={[rehypeRaw, rehypeHighlight]} 
        remarkPlugins={[remarkGfm]}
      >
        {markdown}
      </ReactMarkdown>
    );
    
    // This is a simple approach - in a production environment, 
    // you might want to use a dedicated library for more accurate conversion
    const container = document.createElement('div');
    ReactDOM.render(reactElement, container);
    return container.innerHTML;
  };

  const handleDownload = () => {
    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${stepDetail.step_title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1, h2, h3 { color: #333; }
          a { color: #3182ce; text-decoration: underline; }
          pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; }
          code { font-family: 'Courier New', monospace; }
        </style>
      </head>
      <body>
        <h1>${stepDetail.step_title}</h1>
        <p><strong>Estimated Time:</strong> ${stepDetail.estimated_time}</p>
        <hr>
        ${convertToHtml(stepDetail.formatted_text)}
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stepDetail.step_title.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    // Create simple HTML content for clipboard (simpler than download version)
    const htmlContent = `<h1>${stepDetail.step_title}</h1>
<p><strong>Estimated Time:</strong> ${stepDetail.estimated_time}</p>
<hr>
${convertToHtml(stepDetail.formatted_text)}`;
    
    // Use clipboard API to copy as HTML (Word can paste HTML)
    try {
      navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([htmlContent], { type: 'text/html' })
        })
      ]).then(() => {
        setCopySuccess('Copied!');
      });
    } catch (err) {
      // Fallback to plain text if HTML clipboard is not supported
      navigator.clipboard.writeText(stepDetail.formatted_text)
        .then(() => {
          setCopySuccess('Copied as text!');
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          setCopySuccess('Failed to copy');
        });
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          Step {stepIndex + 1}: {stepDetail.step_title}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={handleCopy}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1 px-3 rounded flex items-center"
          >
            <span>{copySuccess || 'Copy'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-1 px-3 rounded"
          >
            Download
          </button>
        </div>
      </div>
      
      <p className="text-sm mb-4 text-gray-600">
        Estimated Time: {stepDetail.estimated_time}
      </p>
      
      <div className="pt-4 border-t border-gray-200">
        <div className="prose prose-gray max-w-none">
          <ReactMarkdown 
            rehypePlugins={[rehypeRaw, rehypeHighlight]} 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({node, ...props}) => <h1 className="text-2xl font-bold my-4 text-gray-800" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-bold my-3 text-gray-800" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-bold my-2 text-gray-800" {...props} />,
              strong: ({node, ...props}) => <strong className="font-bold text-gray-800" {...props} />,
              a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 underline" {...props} />,
              code: ({node, inline, ...props}) => 
                inline ? <code className="bg-gray-200 px-1 rounded" {...props} /> : <code {...props} />
            }}
          >
            {stepDetail.formatted_text}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default CurriculumStepDetail;
