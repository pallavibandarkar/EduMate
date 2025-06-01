import React from 'react';
import { MessageSquare, BookOpen, Menu, Users, PlusCircle, Layout, Home, Calendar, Settings, User, GraduationCap } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

const routes = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    path: '/EduMate'
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    path: '/calendar'
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: MessageSquare,
    path: '/chat'
  },
  {
    id: 'curriculum',
    label: 'Curriculum',
    icon: BookOpen,
    path: '/curriculum'
  },
  // Create/Join class routes remain but the buttons will appear in navbar
];

const Sidebar = ({ user, isOpen, toggleSidebar }) => {
  const location = useLocation();
  
  return (
    <div
      className={`min-h-screen bg-white shadow-lg transition-all duration-300 ease-in-out 
      ${isOpen ? 'w-72' : 'w-20'} relative`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        {isOpen && (
          <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            EduMate
          </h1>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors duration-200"
          aria-label="Toggle sidebar"
        >
          <Menu size={22} className="text-gray-600" />
        </button>
      </div>

      {/* User Info - only show when logged in and sidebar is open */}
      {user && isOpen && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-medium">
                {user.username ? user.username.charAt(0).toUpperCase() : "U"}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="font-medium text-gray-800 truncate">
                {user.username || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.email || ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col gap-2 p-4">
        {routes.map((route) => (
          <NavLink
            key={route.id}
            to={route.path}
            className={({ isActive }) => `
              flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200
              ${isActive 
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm' 
                : 'text-gray-600 hover:bg-gray-50'}
              ${!isOpen && 'justify-center'}
            `}
          >
            {({ isActive }) => (
              <>
                <route.icon
                  size={22}
                  className={isActive ? 'text-indigo-600' : 'text-gray-500'}
                />
                {isOpen && (
                  <span className={`font-medium ${isActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent' : 'text-gray-700'}`}>
                    {route.label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Teaching Classes - only show when user has classes and sidebar is open */}
        {user?.classTeacher?.length > 0 && isOpen && (
          <div className="mt-4">
            <div className="flex items-center gap-4 px-4 py-2">
              <User size={22} className="text-gray-500" />
              <span className="font-medium text-gray-700">Teaching</span>
            </div>
            <ul className="ml-9 mt-1">
              {user.classTeacher.map((classItem, index) => (
                <li key={classItem._id || index} className="text-sm text-gray-600 py-1.5">
                  <NavLink 
                    to={`/EduMate/viewClass/${classItem._id}`}
                    className={({isActive}) => `hover:text-indigo-600 ${isActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent' : ''}`}
                  >
                    {classItem.className || classItem.name || `Class ${index + 1}`}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Teaching icon when sidebar is collapsed */}
        {user?.classTeacher?.length > 0 && !isOpen && (
          <div className="mt-4 flex justify-center">
            <div className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 cursor-pointer">
              <User size={22} />
            </div>
          </div>
        )}

        {/* Enrolled Classes - only show when user has enrolled classes and sidebar is open */}
        {user?.enrolledIn?.length > 0 && isOpen && (
          <div className="mt-4">
            <div className="flex items-center gap-4 px-4 py-2">
              <GraduationCap size={22} className="text-gray-500" />
              <span className="font-medium text-gray-700">Enrolled</span>
            </div>
            <ul className="ml-9 mt-1">
              {user.enrolledIn.map((classItem, index) => (
                <li key={classItem._id || index} className="text-sm text-gray-600 py-1.5">
                  <NavLink 
                    to={`/EduMate/viewClass/${classItem._id}`}
                    className={({isActive}) => `hover:text-indigo-600 ${isActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent' : ''}`}
                  >
                    {classItem.className || classItem.name || `Class ${index + 1}`}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Enrolled icon when sidebar is collapsed */}
        {user?.enrolledIn?.length > 0 && !isOpen && (
          <div className="mt-4 flex justify-center">
            <div className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 cursor-pointer">
              <GraduationCap size={22} />
            </div>
          </div>
        )}
        
        {/* Removed the logout button as it's now in the Navbar */}
      </div>
    </div>
  );
};

export default Sidebar;