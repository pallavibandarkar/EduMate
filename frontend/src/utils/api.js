import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Session management
export const getSessions = async () => {
  const response = await api.get('/sessions');
  return response.data;
};

export const createSession = async (sessionName) => {
  const response = await api.post('/sessions', { session_name: sessionName });
  return response.data;
};

export const getSession = async (sessionId) => {
  const response = await api.get(`/sessions/${sessionId}`);
  return response.data;
};

export const deleteSession = async (sessionId) => {
  const response = await api.delete(`/sessions/${sessionId}`);
  return response.data;
};

// Document processing
export const processDocument = async (file, sessionId = null, onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);
  if (sessionId) {
    formData.append('session_id', sessionId);
  }
  
  try {
    const response = await api.post('/process/document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // Extended timeout for large files (60 seconds)
      onUploadProgress: onProgress ? (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      } : undefined
    });
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Upload timed out. The file might be too large.');
    }
    throw error;
  }
};

export const processUrl = async (url, sessionId = null) => {
  const response = await api.post('/process/url', { url, session_id: sessionId });
  return response.data;
};

export const getSessionSources = async (sessionId) => {
  const response = await api.get(`/sources/${sessionId}`);
  return response.data;
};

// Chat functionality
export const sendMessage = async (content, sessionId = null, forceWebSearch = false) => {
  try {
    const response = await api.post('/chat', {
      content,
      session_id: sessionId,
      force_web_search: forceWebSearch,
    });
    
    // Log the response structure for debugging
    console.log('API response structure:', Object.keys(response.data));
    
    if (response.data.baseline_response) {
      console.log('Received baseline response from API:', response.data.baseline_response.substring(0, 50) + '...');
    } else {
      console.log('No baseline_response field in API response');
    }
    
    return response.data;
  } catch (error) {
    console.error('API error in sendMessage:', error);
    throw error;
  }
};

export default api;
