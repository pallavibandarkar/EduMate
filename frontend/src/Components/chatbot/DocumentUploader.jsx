import React, { useState } from 'react';
import { processDocument, processUrl } from '../../utils/api';

const DocumentUploader = ({ sessionId, onDocumentProcessed }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await processDocument(file, sessionId);
      onDocumentProcessed(result);
      setSuccess(`Successfully processed ${file.name}`);
      e.target.value = null; // Reset file input
    } catch (error) {
      setError('Error processing document: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await processUrl(url, sessionId);
      onDocumentProcessed(result);
      setSuccess(`Successfully processed URL`);
      setUrl('');
    } catch (error) {
      setError('Error processing URL: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-4 border rounded-lg bg-gray-50 mb-4">
      <h3 className="text-lg font-medium mb-3">Knowledge Sources</h3>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Upload Document</label>
        <input
          type="file"
          onChange={handleFileUpload}
          disabled={isLoading}
          className="w-full border p-2 rounded text-sm bg-white"
          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
        />
        <div className="text-xs text-gray-500 mt-1">
          Supported formats: PDF, PNG, JPG, JPEG, GIF, WEBP
        </div>
      </div>
      
      <div className="mb-3">
        <form onSubmit={handleUrlSubmit}>
          <label className="block text-sm font-medium mb-1">Process URL</label>
          <div className="flex">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={isLoading}
              className="flex-grow border p-2 rounded-l text-sm"
            />
            <button
              type="submit"
              disabled={isLoading || !url}
              className={`px-3 py-2 rounded-r text-sm font-medium ${
                isLoading || !url
                  ? 'bg-gray-300'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Process
            </button>
          </div>
        </form>
      </div>
      
      {isLoading && <p className="text-blue-500 text-sm">Processing...</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-500 text-sm">{success}</p>}
    </div>
  );
};

export default DocumentUploader;
