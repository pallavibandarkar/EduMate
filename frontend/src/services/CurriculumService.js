const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// Headers with API key
const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY
};

export const CurriculumService = {
  // Create a new curriculum
  createCurriculum: async (subject, syllabusUrl = null, timeConstraint = null) => {
    try {
      const response = await fetch(`${API_URL}/curriculum`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject,
          syllabus_url: syllabusUrl,
          time_constraint: timeConstraint
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create curriculum');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating curriculum:', error);
      throw error;
    }
  },
  
  // Get a curriculum by ID
  getCurriculum: async (curriculumId) => {
    try {
      const response = await fetch(`${API_URL}/curriculum/${curriculumId}`, {
        headers
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get curriculum');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting curriculum:', error);
      throw error;
    }
  },
  
  // Modify an existing curriculum
  modifyCurriculum: async (curriculumId, modificationText) => {
    try {
      const response = await fetch(`${API_URL}/curriculum/${curriculumId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          modification_text: modificationText
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to modify curriculum');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error modifying curriculum:', error);
      throw error;
    }
  },
  
  // Generate detailed content for a curriculum
  generateCurriculumDetails: async (curriculumId) => {
    try {
      const response = await fetch(`${API_URL}/curriculum/${curriculumId}/details`, {
        method: 'POST',
        headers
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate curriculum details');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error generating curriculum details:', error);
      throw error;
    }
  },
  
  // Get details for a specific step - with better logging
  getStepDetail: async (curriculumId, stepIndex) => {
    try {
      console.log(`Calling API to get step detail: /curriculum/${curriculumId}/details/${stepIndex}`);
      const response = await fetch(`${API_URL}/curriculum/${curriculumId}/details/${stepIndex}`, {
        headers
      });
      
      console.log(`API response status: ${response.status}`);
      
      if (!response.ok) {
        let errorDetail = 'Unknown error';
        try {
          const error = await response.json();
          console.error('Error response from API:', error);
          errorDetail = error.detail || 'Failed to get step details';
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          // Try to get the text response if JSON parsing fails
          const textError = await response.text();
          console.error('Raw error response:', textError);
          errorDetail = textError || 'Failed to get step details';
        }
        throw new Error(errorDetail);
      }
      
      const data = await response.json();
      console.log('Step detail data received:', data);
      return data;
    } catch (error) {
      console.error('Error getting step details:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  },
  
  // Generate a roadmap for the curriculum
  generateRoadmap: async (curriculumId) => {
    try {
      const response = await fetch(`${API_URL}/curriculum/${curriculumId}/roadmap`, {
        headers
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate roadmap');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error generating roadmap:', error);
      throw error;
    }
  },
  
  // Get all curricula
  getAllCurricula: async () => {
    try {
      const response = await fetch(`${API_URL}/curriculums`, {
        headers
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get curricula');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting all curricula:', error);
      throw error;
    }
  }
};
