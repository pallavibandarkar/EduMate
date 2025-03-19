import React, { useState, useRef } from 'react';
import { X, Upload, Link, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { processDocument, processUrl } from '../utils/api';

const AttachModal = ({ isOpen, onClose, sessionId, onDocumentProcessed }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [lastUploadedFile, setLastUploadedFile] = useState(null);
  const [fileDetails, setFileDetails] = useState(null);
  const fileInputRef = useRef(null);
  
  // Maximum file size: 10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = [
    'application/pdf',
    'image/png', 
    'image/jpeg', 
    'image/jpg', 
    'image/gif', 
    'image/webp'
  ];

  if (!isOpen) return null;

  const validateFile = (file) => {
    if (!file) return "No file selected";
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload a PDF or image file.";
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
    }
    
    return null;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFileDetails({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + " KB",
      type: file.type
    });
    
    processFile(file);
  };

  const processFile = async (file) => {
    setIsLoading(true);
    setError('');
    setLastUploadedFile(file);

    try {
      const result = await processDocument(file, sessionId);
      onDocumentProcessed && onDocumentProcessed(result);
      onClose();
    } catch (error) {
      console.error("Document processing error:", error);
      
      let errorMessage = 'Error processing document';
      if (error.response) {
        // Server responded with error
        if (error.response.status === 422) {
          // Handle unprocessable entity errors (text extraction failures)
          errorMessage = 'No text could be extracted from this file. This might be because:';
          
          // Add specific details from the error if available
          if (error.response?.data?.detail) {
            errorMessage += `\n${error.response.data.detail}`;
          } else {
            errorMessage += '\n• The file may be password-protected or encrypted';
            errorMessage += '\n• The document might be a scanned image without OCR';
            errorMessage += '\n• The image may not contain readable text';
            errorMessage += '\n• The file might be corrupted or in an unsupported format';
          }
        } else if (error.response.status === 500) {
          errorMessage = 'Server error: The document could not be processed. Please try a smaller file or a different format.';
        } else if (error.response.status === 413) {
          errorMessage = 'File is too large. Please try a smaller file (max 10MB).';
        } else {
          errorMessage = `Error (${error.response.status}): ${error.response?.data?.detail || 'Unknown error'}`;
        }
      } else if (error.request) {
        // Request made but no response received
        errorMessage = 'No response from server. Please check your connection and try again.';
      } else {
        // Error setting up request
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await processUrl(url, sessionId);
      onDocumentProcessed && onDocumentProcessed(result);
      onClose();
    } catch (error) {
      console.error("URL processing error:", error);
      
      let errorMessage = 'Error processing URL';
      if (error.response) {
        if (error.response.status === 500) {
          errorMessage = 'Server error: The URL could not be processed. Please try again or use a different URL.';
        } else {
          errorMessage = `Error (${error.response.status}): ${error.response?.data?.detail || 'Unknown error'}`;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection and try again.';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const retryLastUpload = () => {
    if (lastUploadedFile) {
      processFile(lastUploadedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div
        className="bg-background rounded-xl w-full max-w-lg mx-4 shadow-xl animate-slide-up border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-medium">Attach</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* File Upload */}
          <div>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-secondary/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !fileDetails && fileInputRef.current?.click()}
            >
              {!fileDetails ? (
                <>
                  <Upload className="mx-auto mb-4 text-muted-foreground" size={32} />
                  <p className="mb-2 font-medium">Upload files</p>
                  <p className="text-sm text-muted-foreground mb-2">Drag and drop or click to browse</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supported formats: PDF, PNG, JPG, GIF, WEBP<br/>
                    Max size: 10MB
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <FileText className="mx-auto mb-2 text-primary" size={32} />
                  <p className="font-medium text-ellipsis overflow-hidden max-w-full">{fileDetails.name}</p>
                  <p className="text-xs text-muted-foreground">{fileDetails.size} · {fileDetails.type}</p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="hidden"
                id="file-upload"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
              />
              
              <div className="mt-4">
                {fileDetails && !isLoading ? (
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileDetails(null);
                        setError('');
                      }}
                      className="px-4 py-2 border border-border hover:bg-secondary rounded-lg text-sm font-medium"
                    >
                      Change file
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isLoading}
                    className="px-4 py-2 button-primary rounded-lg text-sm font-medium"
                  >
                    {isLoading ? 'Processing...' : 'Select files'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* URL Input */}
          <div>
            <h3 className="flex items-center gap-2 mb-3 text-base font-medium">
              <Link size={18} />
              Attach URL
            </h3>
            <form onSubmit={handleUrlSubmit}>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter a publicly accessible URL"
                  className="flex-1 input-glass rounded-lg px-4 py-2"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !url}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isLoading || !url
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'button-primary'
                  }`}
                >
                  Attach
                </button>
              </div>
            </form>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium mb-1">Error</p>
                  <p className="whitespace-pre-line">{error}</p>
                  {lastUploadedFile && (
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => {
                            setFileDetails(null);
                            setError('');
                            fileInputRef.current?.click();
                          }}
                          className="flex items-center gap-1.5 text-xs font-medium hover:underline text-foreground/80"
                        >
                          Try different file
                        </button>
                        <button 
                          onClick={() => processFile(lastUploadedFile)}
                          className="flex items-center gap-1.5 text-xs font-medium hover:underline text-foreground/80"
                        >
                          <RefreshCw size={14} />
                          Try again
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {error.includes('No text could be extracted') ? (
                          'Tips: Try converting scanned documents to searchable PDFs first, or use a document with embedded text.'
                        ) : (
                          'Tips: Try using a smaller file, different format, or simpler document.'
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttachModal;

