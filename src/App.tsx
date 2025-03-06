import { useState } from "react";
import { useAuthenticator, Authenticator } from '@aws-amplify/ui-react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import AdminPage from "./pages/AdminPage";
import Navigation from "./components/nav/Navigation";
import CoursesPage from "./pages/CoursesPage";
import LecturesPage from "./pages/LecturesPage";
import LectureDetailPage from "./pages/LectureDetailPage";
import QuizPage from "./pages/QuizPage";
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminRoute from './components/auth/AdminRoute';
import './components/quiz/Quiz.css';
import './styles/courses.css';
import './App.css';

// Navigation wrapper with route-aware navigation
const NavigationWrapper = () => {
  const { signOut } = useAuthenticator();
  const navigate = useNavigate();
  
  // Get the stored active tab or default to 'main'
  const storedTab = sessionStorage.getItem('activeTab') || 'main';
  const [activeTab, setActiveTab] = useState(storedTab);
  
  // Use auth context - remove isLoading since it's not used
  const { isAdmin } = useAuth(); // Removed isLoading
  
  // Don't rely on effectiveIsAdmin, just use isAdmin from context
  // The context is already initialized with sessionStorage values
  
  // Save active tab when it changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    sessionStorage.setItem('activeTab', tab);
    
    switch (tab) {
      case 'main':
        navigate('/');
        break;
      case 'courses':
        navigate('/courses');
        break;
      case 'admin':
        if (isAdmin) {
          navigate('/admin');
        } else {
          console.warn('Access denied: User is not an admin');
        }
        break;
      default:
        navigate('/');
    }
  };
  
  return (
    <Navigation 
      activeTab={activeTab} 
      setActiveTab={handleTabChange} 
      onSignOut={signOut} 
      className="navigation"
      showAdminTab={isAdmin} // Just use isAdmin directly
    />
  );
};

function AppContent() {
  const navigate = useNavigate();
  const { displayName } = useAuth();
  
  const renderHomePage = () => (
    <>
      <h1 className="row_padding">
        Hi{displayName ? `, ${displayName}` : ''}<span className="bold_icon"> 👋</span>
      </h1>
      <div className="box_container">
        {/* Make entire box wrapper clickable */}
        <div 
          className="box_wrapper clickable"
          onClick={() => navigate('/courses')}
        >
          <h2>🚀 Learn Courses</h2>
          <p>Browse through our catalog of courses</p>
        </div>
        
        {/* Make entire box wrapper clickable */}
        <div 
          className="box_wrapper clickable"
          onClick={() => navigate('/courses')}
        >
          <h2>🧠 Take an Assessment</h2>
          <p>Test your knowledge with quizzes</p>
        </div>
        
        <div className="box_wrapper">
          <h2>🎯 Achieve a Task</h2>
          <p>Break down goals into manageable steps</p>
        </div>
        
        <div className="box_wrapper">
          <h2>🗓️ Schedule Your Time</h2>
          <p>Organize courses, tasks, and personal commitments</p>
        </div>
      </div>
      <div className="footer">
        <p>🥳 App successfully hosted.</p>
      </div>
    </>
  );
  
  return (
    <main className="app-container">
      <NavigationWrapper />
      
      <div className="page-content">
        <Routes>
          <Route path="/" element={renderHomePage()} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:courseId" element={<LecturesPage />} />
          <Route path="/courses/:courseId/lectures/:lectureId" element={<LectureDetailPage />} />
          <Route path="/courses/:courseId/lectures/:lectureId/quiz" element={<QuizPage />} />
          
          {/* Protected Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          
          {/* Catch-all route for unmatched paths */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </main>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Authenticator>
          {() => <AppContent />}
        </Authenticator>
      </AuthProvider>
    </Router>
  );
}

export default App;
