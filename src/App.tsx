import { useState, useEffect } from "react";
import { useAuthenticator, Authenticator } from '@aws-amplify/ui-react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
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

// Wrapper component that handles navigation state and tab synchronization
const NavigationWrapper = () => {
  const { signOut } = useAuthenticator();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize active tab from session storage or default to home
  const storedTab = sessionStorage.getItem('activeTab') || 'main';
  const [activeTab, setActiveTab] = useState(storedTab);
  
  const { isAdmin } = useAuth();
  
  // Synchronize active tab with current route
  useEffect(() => {
    const path = location.pathname;
    
    if (path === '/') {
      setActiveTab('main');
      sessionStorage.setItem('activeTab', 'main');
    } else if (path.startsWith('/courses')) {
      setActiveTab('courses');
      sessionStorage.setItem('activeTab', 'courses');
    } else if (path.startsWith('/admin')) {
      setActiveTab('admin');
      sessionStorage.setItem('activeTab', 'admin');
    }
  }, [location.pathname]);
  
  // Handle tab selection and navigation
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
      showAdminTab={isAdmin}
    />
  );
};

// Main application content with routing configuration
function AppContent() {
  const navigate = useNavigate();
  const { displayName } = useAuth();
  
  // Dashboard/homepage component with navigation cards
  const renderHomePage = () => (
    <>
      <h1 className="row_padding">
        Hi{displayName ? `, ${displayName}` : ''}<span className="bold_icon"> 👋</span>
      </h1>
      <div className="box_container">
        <div 
          className="box_wrapper clickable"
          onClick={() => navigate('/courses')}
        >
          <h2>🚀 Learn Courses</h2>
          <p>Browse through our catalog of courses</p>
        </div>
        
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
          
          {/* Admin route with authorization protection */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </main>
  );
}

// Root component that configures authentication and routing
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
