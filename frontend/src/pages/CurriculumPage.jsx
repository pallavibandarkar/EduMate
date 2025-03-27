import React, { useState, useEffect } from 'react';
import CurriculumForm from '../components/curriculum/CurriculumForm';
import CurriculumOverview from '../components/curriculum/CurriculumOverview';
import CurriculumStepDetail from '../components/curriculum/CurriculumStepDetail';
import CurriculumModifier from '../components/curriculum/CurriculumModifier';
import Spinner from '../components/ui/Spinner';
import { CurriculumService } from '../services/CurriculumService';

const CurriculumPage = () => {
  const [curriculum, setCurriculum] = useState(null);
  const [detailedSteps, setDetailedSteps] = useState({});
  const [selectedStepIndex, setSelectedStepIndex] = useState(null);
  const [isModifying, setIsModifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [allCurricula, setAllCurricula] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch all curricula when component mounts
  useEffect(() => {
    const fetchCurricula = async () => {
      try {
        setLoading(true);
        const response = await CurriculumService.getAllCurricula();
        console.log('Curricula fetched:', response);
        // Extract the array of curricula from the response
        setAllCurricula(response.curriculums || []);
        setError('');
      } catch (err) {
        console.error('Failed to fetch curricula:', err);
        setError('Failed to load existing curricula');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCurricula();
  }, []);

  // Handle curriculum creation
  const handleCurriculumCreated = (newCurriculum) => {
    setCurriculum(newCurriculum);
    setActiveTab('overview');
    // Reset other states
    setDetailedSteps({});
    setSelectedStepIndex(null);
    // Add new curriculum to the list
    setAllCurricula(prev => [newCurriculum, ...prev]);
  };

  // Handle loading an existing curriculum
  const handleLoadCurriculum = async (curriculumId) => {
    try {
      setLoading(true);
      setError('');
      const loadedCurriculum = await CurriculumService.getCurriculum(curriculumId);
      setCurriculum(loadedCurriculum);
      setActiveTab('overview');
      
      // Reset states
      setDetailedSteps({});
      setSelectedStepIndex(null);
      
      // Check if this curriculum has any step details already generated
      // by trying to fetch the first step's details
      if (loadedCurriculum.steps && loadedCurriculum.steps.length > 0) {
        try {
          const firstStepDetail = await CurriculumService.getStepDetail(curriculumId, 0);
          if (firstStepDetail) {
            // Store the first step's details
            setDetailedSteps({ 0: firstStepDetail });
            // Optionally, you can set the selected step and change to details tab
            // setSelectedStepIndex(0);
            // setActiveTab('details');
          }
        } catch (detailErr) {
          // It's okay if there are no details yet, this is not a critical error
          console.log("No step details found, they can be generated later");
        }
      }
    } catch (err) {
      console.error('Error loading curriculum:', err);
      setError(`Failed to load curriculum: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Improved function to fetch individual step details
  const fetchStepDetail = async (curriculumId, stepIndex) => {
    if (!curriculumId) return;
    
    try {
      setLoading(true);
      console.log(`Fetching details for step ${stepIndex} of curriculum ${curriculumId}`);
      const stepDetail = await CurriculumService.getStepDetail(curriculumId, stepIndex);
      
      console.log("Step detail fetched successfully:", stepDetail);
      
      // Update the detailed steps with this specific step
      setDetailedSteps(prev => ({
        ...prev,
        [stepIndex]: stepDetail
      }));
      
      setError('');
    } catch (err) {
      console.error(`Failed to fetch details for step ${stepIndex}:`, err);
      setError(`Failed to load step details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle step selection with better error handling
  const handleStepSelect = (index) => {
    setSelectedStepIndex(index);
    
    // Fetch step details if we don't already have them
    if (!detailedSteps[index] && curriculum) {
      fetchStepDetail(curriculum.curriculum_id, index);
    }
  };

  // Handle curriculum modification
  const handleCurriculumModified = (modifiedCurriculum) => {
    setCurriculum(modifiedCurriculum);
    setIsModifying(false);
    // Since curriculum changed, reset detailed steps
    setDetailedSteps({});
    setSelectedStepIndex(null);
    // Update the curriculum in the list
    setAllCurricula(prev => prev.map(item => 
      item.curriculum_id === modifiedCurriculum.curriculum_id ? modifiedCurriculum : item
    ));
  };

  // Handle detailed curriculum generation
  const handleDetailsGenerated = (details) => {
    setDetailedSteps(details);
    // Set the first step as selected
    const firstIndex = Object.keys(details)[0];
    if (firstIndex) {
      setSelectedStepIndex(parseInt(firstIndex));
      setActiveTab('details');
    }
  };

  // Update handle tab switching to try fetching the first step's details if needed
  const handleTabChange = (tab) => {
    if (tab === 'details') {
      // If we're switching to details tab but don't have any step details yet,
      // try to fetch the first step's details
      if (Object.keys(detailedSteps).length === 0 && curriculum && curriculum.steps && curriculum.steps.length > 0) {
        fetchStepDetail(curriculum.curriculum_id, 0);
        setSelectedStepIndex(0); // Select the first step
      } else if (selectedStepIndex === null && Object.keys(detailedSteps).length > 0) {
        // If we have details but no step selected, select the first one we have
        setSelectedStepIndex(parseInt(Object.keys(detailedSteps)[0]));
      }
      setActiveTab(tab);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-white text-gray-900">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Curriculum Generator</h1>
      </div>
      
      {error && (
        <div className="bg-red-500 text-white p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {!curriculum ? (
        <div>
          <CurriculumForm onCurriculumCreated={handleCurriculumCreated} />
          
          {/* Display all curricula as cards */}
          <div className="mt-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Your Curricula</h2>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="flex flex-col items-center gap-2">
                  <Spinner size="lg" />
                  <p className="text-gray-500">Loading curricula...</p>
                </div>
              </div>
            ) : allCurricula.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allCurricula.map((item) => (
                  <div 
                    key={item.curriculum_id} 
                    className="bg-white border border-gray-200 p-4 rounded-lg shadow-lg cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => handleLoadCurriculum(item.curriculum_id)}
                  >
                    <h3 className="font-bold text-lg mb-2 truncate text-gray-800">{item.curriculum_name || item.title || 'Untitled Curriculum'}</h3>
                    <p className="text-sm mb-3 line-clamp-2 text-gray-600">
                      {item.overview || 'No description available'}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {item.total_time || 'Duration not specified'}
                      </span>
                      <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-1">
                        {(item.steps && item.steps.length) ? `${item.steps.length} step${item.steps.length !== 1 ? 's' : ''}` : 'Details on click'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center">
                <p className="text-gray-500">No curricula found. Create one to get started!</p>
              </div>
            )}
          </div>
        </div>
      ) : isModifying ? (
        <CurriculumModifier 
          curriculum={curriculum} 
          onModified={handleCurriculumModified} 
          onCancel={() => setIsModifying(false)} 
        />
      ) : (
        <div>
          {/* Tabs */}
          <div className="flex mb-6 border-b border-gray-300">
            <button
              className={`py-2 px-4 mr-2 ${
                activeTab === 'overview' 
                  ? 'border-b-2 border-blue-500 text-blue-500' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => handleTabChange('overview')}
            >
              Overview
            </button>
            <button
              className={`py-2 px-4 mr-2 ${
                activeTab === 'details' 
                  ? 'border-b-2 border-blue-500 text-blue-500' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => handleTabChange('details')}
            >
              Step Details
            </button>
            {/* Return to list button */}
            <button
              className="ml-auto py-2 px-4 text-gray-600 hover:text-gray-900"
              onClick={() => setCurriculum(null)}
            >
              ← Back to List
            </button>
          </div>
          
          {/* Tab content */}
          {isGenerating && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
              <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
                <Spinner size="xl" />
                <p className="mt-4 text-lg font-medium text-gray-800">Generating curriculum...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
              </div>
            </div>
          )}
          
          {activeTab === 'overview' && (
            <CurriculumOverview 
              curriculum={curriculum} 
              onDetailsGenerated={handleDetailsGenerated}
              onModificationRequested={() => setIsModifying(true)}
            />
          )}
          
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Step selector sidebar */}
              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-lg">
                <h3 className="font-bold text-lg mb-3 text-gray-800">Steps</h3>
                {curriculum.steps.length > 0 ? (
                  <div className="space-y-2">
                    {curriculum.steps.map((step, index) => (
                      <button
                        key={index}
                        className={`block w-full text-left p-2 rounded ${
                          selectedStepIndex === index 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                        }`}
                        onClick={() => handleStepSelect(index)}
                      >
                        <p className="font-medium truncate">{index + 1}. {step.title}</p>
                        <p className={`text-xs ${selectedStepIndex === index ? 'text-gray-200' : 'text-gray-500'}`}>
                          {step.estimated_time}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No steps available</p>
                )}
              </div>
              
              {/* Step detail content */}
              <div className="md:col-span-3">
                <CurriculumStepDetail 
                  stepDetail={detailedSteps[selectedStepIndex]} 
                  stepIndex={selectedStepIndex}
                  isLoading={loading}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CurriculumPage;
