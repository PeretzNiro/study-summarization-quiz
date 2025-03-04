import { useEffect, useState } from "react";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import AdminPage from "./pages/AdminPage";
import Navigation from "./components/nav/Navigation";
import CoursesPage from "./pages/CoursesPage";
import LecturesPage from "./pages/LecturesPage";
import LectureDetailPage from "./pages/LectureDetailPage";
import QuizPage from "./pages/QuizPage";
import { Flex } from '@aws-amplify/ui-react';
import './components/Quiz.css';
import './components/courses.css';

const client = generateClient<Schema>();

// Navigation wrapper with route-aware navigation
const NavigationWrapper = () => {
  const { signOut } = useAuthenticator();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('main');
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    switch (tab) {
      case 'main':
        navigate('/');
        break;
      case 'courses':
        navigate('/courses');
        break;
      case 'admin':
        navigate('/admin');
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
    />
  );
};

function AppContent() {
  const navigate = useNavigate();
  
  const renderHomePage = () => (
    <>
      <h1 className="row_padding">Hi, <span className="bold_icon"> 👋</span></h1>
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
        
        <div 
          className="box_wrapper clickable"
          onClick={() => navigate('/tasks')}
        >
          <h2>🎯 Achieve a Task</h2>
          <p>Break down goals into manageable steps</p>
        </div>
        
        <div 
          className="box_wrapper clickable"
          onClick={() => navigate('/schedule')}
        >
          <h2>🗓️ Schedule Your Time</h2>
          <p>Organize courses, tasks, and personal commitments</p>
        </div>
      </div>
      <div className="footer">
        🥳 App successfully hosted.
      </div>
    </>
  );
  
  // Then you would add placeholder routes:
  return (
    <main>
      <Flex direction="column" gap="1rem">
        <NavigationWrapper />
        
        <Routes>
          <Route path="/" element={renderHomePage()} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:courseId" element={<LecturesPage />} />
          <Route path="/courses/:courseId/lectures/:lectureId" element={<LectureDetailPage />} />
          <Route path="/courses/:courseId/lectures/:lectureId/quiz" element={<QuizPage />} />
          <Route path="/admin" element={<AdminPage />} />
          {/* Placeholder routes for future features */}
          <Route path="/tasks" element={<div className="placeholder-page">Task Decomposition Coming Soon</div>} />
          <Route path="/schedule" element={<div className="placeholder-page">Schedule Management Coming Soon</div>} />
        </Routes>
      </Flex>
    </main>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
