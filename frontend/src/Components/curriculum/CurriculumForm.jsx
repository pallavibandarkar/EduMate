import React, { useState } from 'react';
import { CurriculumService } from '../../services/CurriculumService';
import Spinner from '../ui/Spinner';

const CurriculumForm = ({ onCurriculumCreated }) => {
  const [subject, setSubject] = useState('');
  const [syllabusUrl, setSyllabusUrl] = useState('');
  const [timeConstraint, setTimeConstraint] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const curriculum = await CurriculumService.createCurriculum(
        subject,
        syllabusUrl || null,
        timeConstraint || null
      );
      
      if (onCurriculumCreated) {
        onCurriculumCreated(curriculum);
      }
      
      // Clear the form
      setSubject('');
      setSyllabusUrl('');
      setTimeConstraint('');
    } catch (err) {
      console.error('Error creating curriculum:', err);
      setError(err.message || 'Failed to create curriculum');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Create a Curriculum</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="subject">
            Subject / Topic *
          </label>
          <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="E.g., Introduction to JavaScript"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="syllabusUrl">
            Syllabus URL (Optional)
          </label>
          <input
            type="url"
            id="syllabusUrl"
            value={syllabusUrl}
            onChange={(e) => setSyllabusUrl(e.target.value)}
            placeholder="https://example.com/syllabus"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="timeConstraint">
            Time Constraint (Optional)
          </label>
          <input
            type="text"
            id="timeConstraint"
            value={timeConstraint}
            onChange={(e) => setTimeConstraint(e.target.value)}
            placeholder="E.g., 4 weeks, 2 hours per day"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={isLoading || !subject.trim()}
            className={`${
              isLoading || !subject.trim()
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center gap-2`}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" className="border-white border-t-transparent" />
                <span>Generating...</span>
              </>
            ) : (
              'Generate Curriculum'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CurriculumForm;
