import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';

// Import components using the target directory structure
import LoginSignup from './Components/LoginSignup/LoginSignup';
import CreateClass from './Components/CreateClass/CreateClass';
import JoinClass from './Components/JoinClass/JoinClass';
import Classroom from './Components/Classroom/Classroom';
import ViewClass from './Components/ViewClass/ViewClass';
import GradingReport from './Components/GradingReport/GradingReport';

// Import Sidebar and Navbar
import Sidebar from './Components/Sidebar';
import Navbar from './Components/Navbar/Navbar'; // Add Navbar import
import ChatPage from './pages/ChatPage';
import CurriculumPage from './pages/CurriculumPage';
import CalendarPage from './pages/CalendarPage'; // Import the new CalendarPage component

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null); // Manage user state here
  const location = useLocation(); // Get current location for conditional rendering
  const navigate = useNavigate(); // Add navigate hook for programmatic navigation

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const checkUser = async () => {
    try {
      // First check if user is authenticated
      const authResult = await axios.get("http://localhost:8080/user", { withCredentials: true });
      
      if (authResult.data.user) {
        // If authenticated, fetch detailed user data with populated fields
        const userDetailResult = await axios.get("http://localhost:8080/profile/getUser", { withCredentials: true });
        
        if (userDetailResult.data.data) {
          setUser(userDetailResult.data.data);
          console.log("User data fetched successfully:", userDetailResult.data.data);
        } else {
          // Fallback to basic user data if detailed data is not available
          setUser(authResult.data.user);
          console.log("Basic user data fetched:", authResult.data.user);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error.response?.data || error.message);
      setUser(null);
    }
  };

  const logOutUser = async () => {
    try {
      // Ensure the backend URL is correct
      await axios.get("http://localhost:8080/profile/logout", { withCredentials: true });
      setUser(null);
      console.log("User logged out successfully.");
      // Redirect to login page after logout
      navigate('/EduMate/login');
    } catch (err) {
      console.error("Logout error:", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    console.log("User state updated:", user);
    // Redirect to login if user is not authenticated
    if (!user && location.pathname !== '/EduMate/login') {
      navigate('/EduMate/login');
    }
    // Add this condition to redirect authenticated users away from login page
    else if (user && location.pathname === '/EduMate/login') {
      navigate('/EduMate');
    }
  }, [user, location.pathname, navigate]);

  // Determine if sidebar should be shown based on route
  // Hide sidebar on login page, show elsewhere
  const showSidebar = location.pathname !== '/EduMate/login';

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      {showSidebar && (
        <div className="sticky top-0 h-screen">
          <Sidebar
            user={user} 
            isOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
            // Removed logOutUser prop as it's no longer needed in Sidebar
          />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden"> 
        {/* Only show Navbar on non-chat pages when user is logged in */}
        {user && location.pathname !== '/chat' && <Navbar user={user} logOutUser={logOutUser} toggleSidebar={toggleSidebar} />}
        
        <main className="flex-1 overflow-auto pt-2"> {/* Added padding-top */}
          <Routes>
            {/* Routes from original App.jsx */}
            <Route path="/grading/:id" element={user ? <GradingReport /> : <Navigate to="/EduMate/login" />} />
            <Route path="/EduMate" element={user ? <Classroom user={user} /> : <Navigate to="/EduMate/login" />} /> {/* Removed isSidebarVisible */}
            <Route path="/EduMate/login" element={<LoginSignup setUser={setUser} />} />
            <Route path="/EduMate/createClass" element={user ? <CreateClass /> : <Navigate to="/EduMate/login" />} />
            <Route path="/EduMate/joinClass" element={user ? <JoinClass /> : <Navigate to="/EduMate/login" />} />
            <Route path="/EduMate/viewClass/:id" element={user ? <ViewClass user={user} /> : <Navigate to="/EduMate/login" />} />
            
            {/* Routes from src/src/App.jsx */}
            <Route path="/chat" element={user ? <ChatPage /> : <Navigate to="/EduMate/login" />} />
            <Route path="/curriculum" element={user ? <CurriculumPage /> : <Navigate to="/EduMate/login" />} />
            <Route path="/calendar" element={user ? <CalendarPage /> : <Navigate to="/EduMate/login" />} />

            {/* Add default route to redirect to EduMate or login based on authentication */}
            <Route path="/" element={<Navigate to={user ? "/EduMate" : "/EduMate/login"} replace />} />
            <Route path="*" element={<Navigate to={user ? "/EduMate" : "/EduMate/login"} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
