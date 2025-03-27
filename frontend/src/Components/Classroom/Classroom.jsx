import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { GraduationCap, Users, Code, ChevronRight, PlusCircle, LogIn, FileText } from 'lucide-react';

// Array of educational themed images
const classImages = [
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=1000',  // Books and laptop
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=1000',  // Stack of books
  'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=1000',     // Modern classroom
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1000',  // Science lab
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1000',  // Coding/computer
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&q=80&w=1000',  // Mathematics
];

const getRandomImage = () => {
  const randomIndex = Math.floor(Math.random() * classImages.length);
  return classImages[randomIndex];
};

export default function Classroom({isSidebarVisible, user}) {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [isTeacher, setIsTeacher] = useState(false);

  const fetchClasses = async () => {
    try {
      const result = await axios.get("http://localhost:8080/class/getClasses", {
        withCredentials: true,
      });
      // Add random cover images to each class
      const classesWithImages = result.data.classes.map(classItem => ({
        ...classItem,
        coverImage: getRandomImage()
      }));
      setClasses(classesWithImages);
      
      // Check if user is teacher for any class
      if (classesWithImages.some(c => c.classTeacher._id === user)) {
        setIsTeacher(true);
      }
      
      console.log("Classes loaded successfully!");
    } catch (err) {
      console.error("Error fetching classes:", err);
    }
  }

  useEffect(() => {
    fetchClasses();
  }, []);
    
  return (
    <div className="p-6 pt-8 mt-2">
      {/* Add Create Assignment button for teachers */}
      {isTeacher && (
        <div className="mb-6">
          <button 
            onClick={() => navigate('/EduMate/upload-assignment')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText size={18} />
            <span>Create Assignment</span>
          </button>
        </div>
      )}
      
      {/* Classes Grid - Changed to flex layout with fixed-width cards */}
      {user && classes.length > 0 ? (
        <div className="w-full">
          <div className="flex flex-wrap gap-6 transition-all ease-in-out duration-300">
            {classes.map((classItem) => (
              <div
                key={classItem._id}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 w-[325px]"
              >
                <div 
                  className="h-32 bg-cover bg-center bg-gradient-to-r from-blue-600 to-indigo-600"
                  style={{ 
                    backgroundImage: classItem.coverImage ? `url(${classItem.coverImage})` : 'none',
                    opacity: classItem.coverImage ? '1' : '0.9'
                  }}
                />
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{classItem.className}</h3>
                      <p className="text-sm text-gray-600 mt-1">{classItem.subject || "Class"}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-sm font-medium rounded-md">
                      {classItem.div}
                    </span>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-gray-600">
                      <Code size={18} className="mr-2" />
                      <span className="text-sm">Class Code: {classItem.classCode}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <GraduationCap size={18} className="mr-2" />
                      <span className="text-sm">{classItem.classTeacher.email}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Users size={18} className="mr-2" />
                      <span className="text-sm">{classItem.students.length} Students</span>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button 
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => navigate(`/EduMate/viewClass/${classItem._id}`)}
                    >
                      <span>View Class</span>
                      <ChevronRight size={18} />
                    </button>
                    
                    {/* Add upload assignment button if user is the teacher of this class */}
                    {user === classItem.classTeacher._id && (
                      <button 
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                        onClick={() => navigate('/EduMate/upload-assignment', { state: { classId: classItem._id } })}
                      >
                        <FileText size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100 max-w-lg mx-auto">
          <div className="max-w-sm mx-auto">
            <GraduationCap size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Classes Yet</h3>
            <p className="text-gray-600 mb-6">You don't have any classes at the moment.</p>
          </div>
        </div>
      )}
    </div>
  );
}
