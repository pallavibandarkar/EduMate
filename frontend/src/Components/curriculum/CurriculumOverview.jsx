import React, { useState } from 'react';
import { CurriculumService } from '../../services/CurriculumService';
import Spinner from '../../components/ui/Spinner';

const CurriculumOverview = ({ curriculum, onDetailsGenerated, onModificationRequested }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  
  const handleGenerateDetails = async () => {
    setIsGenerating(true);
    setError('');
    
    try {
      const details = await CurriculumService.generateCurriculumDetails(curriculum.curriculum_id);
      if (onDetailsGenerated) {
        onDetailsGenerated(details);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate curriculum details');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleDownload = () => {
    const blob = new Blob([curriculum.formatted_text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${curriculum.title.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg">
      {error && (
        <div className="bg-red-500 text-white p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2 text-gray-800">{curriculum.title}</h1>
        <p className="text-gray-700 mb-2">{curriculum.overview}</p>
        <p className="text-sm text-gray-600">Total Time: {curriculum.total_time}</p>
      </div>
      
      <div className="my-4 pt-4 border-t border-gray-200">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">Learning Steps</h2>
        
        <div className="space-y-3">
          {curriculum.steps.map((step, index) => (
            <div key={index} className="bg-gray-100 p-3 rounded">
              <h3 className="font-medium text-gray-800">{index + 1}. {step.title}</h3>
              <p className="text-sm text-gray-600">Estimated Time: {step.estimated_time}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add a more visible instruction for generating step details */}
      {curriculum.steps.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <p className="text-blue-800">
            <strong>Next Step:</strong> Click "Generate Details" to create comprehensive content for each step.
            After generation, you can view step details in the "Step Details" tab.
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-3 mt-6">
        <button
          onClick={handleDownload}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded"
        >
          Download Curriculum
        </button>
        
        <button
          onClick={handleGenerateDetails}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center gap-2"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Spinner size="sm" className="border-white border-t-transparent" />
              <span>Generating...</span>
            </>
          ) : (
            'Generate Detailed Curriculum'
          )}
        </button>
        
        <button
          onClick={onModificationRequested}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded"
        >
          Modify Curriculum
        </button>
      </div>
    </div>
  );
};

export default CurriculumOverview;
