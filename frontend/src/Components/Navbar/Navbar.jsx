import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, FolderPlus, LogOut, Menu } from 'lucide-react';

const Navbar = ({ user, logOutUser, toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get current page title based on path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/EduMate/viewClass')) return 'Class View';
    if (path === '/EduMate') return 'My Classes';
    if (path === '/EduMate/createClass') return 'Create Class';
    if (path === '/EduMate/joinClass') return 'Join Class';
    if (path === '/chat') return 'Chat';
    if (path === '/curriculum') return 'Curriculum';
    if (path === '/calendar') return 'Calendar';
    if (path === '/settings') return 'Settings';
    if (path.includes('/grading/')) return 'Grading Report';
    return 'EduMate';
  };
  
  // Only show class buttons on home page
  const showClassButtons = location.pathname === '/EduMate';
  
  return (
    <div className="sticky top-0 z-10 flex justify-between items-center px-6 py-3 bg-white border-b border-gray-200 shadow-sm h-16">
      <div className="flex items-center gap-3">
        <button 
          className="p-1 rounded-md hover:bg-gray-100 focus:outline-none"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu size={24} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800 m-0">{getPageTitle()}</h1>
      </div>
      
      <div className="flex gap-3">
        {showClassButtons && (
          <>
            <button 
              className="flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium hover:from-blue-700 hover:to-indigo-700 hover:shadow-md transition-all duration-300 cursor-pointer"
              onClick={() => navigate('/EduMate/joinClass')}
            >
              <UserPlus size={18} />
              Join Class
            </button>
            <button 
              className="flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium hover:from-blue-700 hover:to-indigo-700 hover:shadow-md transition-all duration-300 cursor-pointer"
              onClick={() => navigate('/EduMate/createClass')}
            >
              <FolderPlus size={18} />
              Create Class
            </button>
          </>
        )}
        
        {user && (
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium text-white bg-red-600 hover:bg-red-700 hover:shadow-md transition-all duration-300 cursor-pointer"
            onClick={logOutUser}
          >
            <LogOut size={18} />
            Logout
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
