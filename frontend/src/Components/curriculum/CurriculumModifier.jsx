import React, { useState } from 'react';
import { CurriculumService } from '../../services/CurriculumService';
import Spinner from '../ui/Spinner';

const CurriculumModifier = ({ curriculum, onModified, onCancel }) => {
  const [modificationText, setModificationText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!modificationText.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const modifiedCurriculum = await CurriculumService.modifyCurriculum(
        curriculum.curriculum_id,
        modificationText
      );
      
      if (onModified) {
        onModified(modifiedCurriculum);
      }
    } catch (err) {
      console.error('Error modifying curriculum:', err);
      setError(err.message || 'Failed to modify curriculum');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Modify Curriculum</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2 text-gray-700">
          {curriculum.title}
        </h3>
        <p className="text-gray-600 mb-2">{curriculum.overview}</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="modificationText">
            Modification Instructions
          </label>
          <textarea
            id="modificationText"
            value={modificationText}
            onChange={(e) => setModificationText(e.target.value)}
            placeholder="Describe how you want to modify the curriculum. E.g., Add a section on async programming, make it more beginner-friendly, etc."
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-40"
            required
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isLoading || !modificationText.trim()}
            className={`${
              isLoading || !modificationText.trim()
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center gap-2`}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" className="border-white border-t-transparent" />
                <span>Updating...</span>
              </>
            ) : (
              'Apply Modifications'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CurriculumModifier;
