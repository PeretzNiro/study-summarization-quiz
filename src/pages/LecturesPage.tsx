import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import { useAuthenticator } from '@aws-amplify/ui-react';
import 'katex/dist/katex.min.css';
import type { Schema } from '../../amplify/data/resource';
import { Course } from '../types/models';
import '../styles/Lectures.css';
import { fetchAuthSession } from 'aws-amplify/auth';

// Use the type from the generated Schema
type Lecture = Schema['Lecture']['type'];
type UserProgress = Schema['UserProgress']['type'];

const client = generateClient<Schema>();

const LecturesPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthenticator((context) => [context.user]);
  
  // State management for page data
  const [course, setCourse] = useState<Course | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [, setProgressLoading] = useState(false);
  const [completedLectureIds, setCompletedLectureIds] = useState<string[]>([]);

  // Fetch course details and lectures on component mount or courseId change
  useEffect(() => {
    async function fetchCourseAndLectures() {
      if (!courseId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch course details by courseId
        const { data: courseData, errors: courseErrors } = await client.models.Course.list({
          filter: {
            courseId: { eq: courseId }
          }
        });
        
        if (courseErrors) {
          throw new Error('Failed to fetch course details');
        }
        
        if (courseData.length === 0) {
          setError('Course not found');
          return;
        }
        
        setCourse(courseData[0]);
        
        // Fetch lectures for this course
        const { data: lecturesData, errors: lectureErrors } = await client.models.Lecture.list({
          filter: {
            courseId: { eq: courseId }
          }
        });
        
        if (lectureErrors) {
          throw new Error('Failed to fetch lectures');
        }
        
        // Sort lectures by lectureId using natural sort order
        const sortedLectures = [...lecturesData].sort((a, b) => 
          a.lectureId.localeCompare(b.lectureId, undefined, { numeric: true })
        );
        
        setLectures(sortedLectures);
      } catch (err) {
        console.error('Error fetching course data:', err);
        setError('Failed to load course content. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchCourseAndLectures();
  }, [courseId]);

  // Fetch user's progress data for this course
  useEffect(() => {
    fetchUserProgress();
  }, [courseId, user]);
  
  // Create an authenticated API client using the current user session
  const getAuthenticatedClient = async () => {
    try {
      const { tokens } = await fetchAuthSession();
      return generateClient<Schema>({
        authMode: 'userPool',
        authToken: tokens?.idToken?.toString()
      });
    } catch (error) {
      console.error('Error getting authenticated client:', error);
      return client;
    }
  };

  // Retrieve the user's progress data for tracking completed lectures
  async function fetchUserProgress() {
    if (!user || !courseId) {
      return;
    }
    
    setProgressLoading(true);
    try {
      // Use an authenticated client for user-specific data
      const authClient = await getAuthenticatedClient();
      
      const { data: progressData } = await authClient.models.UserProgress.list({
        filter: { 
          userId: { eq: user.username },
          courseId: { eq: courseId }
        }
      });
      
      if (progressData && progressData.length > 0) {
        // Extract completed lecture IDs, handling various data formats
        let completedLectures: string[] = [];
        
        if (Array.isArray(progressData[0].completedLectures)) {
          // Handle DynamoDB attribute value format if present
          if (progressData[0].completedLectures.length > 0 && 
                typeof progressData[0].completedLectures[0] === 'object' && 
                progressData[0].completedLectures[0] !== null &&
                'S' in progressData[0].completedLectures[0]) {
            completedLectures = progressData[0].completedLectures.map((item: any) => item.S);
          } else {
            // Standard array of strings
            completedLectures = progressData[0].completedLectures.filter((item): item is string => item !== null);
          }
        } else if (typeof progressData[0].completedLectures === 'string') {
          // Handle serialized JSON string format
          try {
            completedLectures = JSON.parse(progressData[0].completedLectures);
          } catch (e) {
            console.error('Failed to parse completedLectures string:', e);
          }
        }
        
        // Update state with progress data
        setUserProgress(progressData[0]);
        setCompletedLectureIds(completedLectures);
      } else {
        // No progress data found
        setUserProgress(null);
        setCompletedLectureIds([]);
      }
    } catch (err) {
      console.error('Error fetching user progress:', err);
    } finally {
      setProgressLoading(false);
    }
  }
  
  // Check if a lecture is completed and passed based on user progress 
  const getCompletionStatus = (lectureId: string): { completed: boolean, passed: boolean } => {
    // First check if the lecture is in completedLectures
    const completed = completedLectureIds.includes(lectureId);
    
    // Check if there's quiz data for this lecture and if it was passed
    let passed = false;
    
    if (userProgress && userProgress.quizScores) {
      // Handle different data formats for quizScores
      let quizScores: Record<string, any> = {};
      
      if (typeof userProgress.quizScores === 'string') {
        // If quizScores is stored as a JSON string
        try {
          quizScores = JSON.parse(userProgress.quizScores);
        } catch (e) {
          console.error('Failed to parse quizScores:', e);
        }
      } else if (typeof userProgress.quizScores === 'object') {
        // If quizScores is already an object
        quizScores = userProgress.quizScores;
      }
      
      // Find all quizzes that belong to this lecture
      const matchingQuizzes = Object.entries(quizScores).filter(([_, quizData]) => {
        // Check if the quiz data is an object with a lectureId property
        if (typeof quizData === 'object' && quizData !== null) {
          return quizData.lectureId === lectureId;
        }
        return false;
      });
      
      // If we found matching quizzes for this lecture, check the results
      if (matchingQuizzes.length > 0) {
        // Use the most recent quiz result (or any valid result)
        const [_, scoreData] = matchingQuizzes[0];
        
        if (typeof scoreData === 'object' && scoreData.passed !== undefined) {
          passed = Boolean(scoreData.passed);
        } else if (typeof scoreData === 'object' && scoreData.score !== undefined) {
          passed = scoreData.score >= 70;
        } else if (typeof scoreData === 'number') {
          passed = scoreData >= 70;
        }
      }
    }
    
    return { completed, passed };
  };

  // Check if a lecture has been completed by the user
  const isLectureCompleted = (lectureId: string): boolean => {
    return completedLectureIds.includes(lectureId);
  };

  // Navigate to the quiz for a specific lecture
  const handleStartQuiz = (lectureId: string) => {
    navigate(`/courses/${courseId}/lectures/${lectureId}/quiz`);
  };

  // Map difficulty strings to UI badge variations
  function getDifficultyVariation(difficulty: string): "info" | "warning" | "error" | "natural" {
    const lowerDifficulty = difficulty.toLowerCase();
    if (lowerDifficulty === 'easy') return "info";
    if (lowerDifficulty === 'medium') return "warning";
    if (lowerDifficulty === 'hard') return "error";
    return "natural"; // Default
  }

  // Loading state UI
  if (loading) {
    return <div className="loading-container">Loading course content...</div>;
  }

  // Error state UI
  if (error || !course) {
    return <div className="error-container">{error || 'Course not found'}</div>;
  }

  // Render course and lecture list
  return (
    <div className="lectures-page">    
      <div className="lecture-navigation">
        <Link to="/courses" className="back-link">← Back to Courses</Link>
      </div>
      <div className="course-header box_wrapper_no_hover">
        <h1>{course.title}</h1>
        {course.description && <p className="course-description">{course.description}</p>}
      </div>
      
      <h2>Course Lectures</h2>
      
      {lectures.length === 0 ? (
        <p>No lectures available for this course.</p>
      ) : (
        <div className="lecture-page-content">
          <div className='lecture-page box_wrapper_no_hover'>
            <div className="lecture-list">
              {lectures.map(lecture => {
                const { completed, passed } = getCompletionStatus(lecture.lectureId);
                
                return (
                  <div key={lecture.lectureId} className="lecture-card">
                    <div className="lecture-content">
                      <h2>
                        {lecture.title}
                        {completed && (
                          <span 
                            className={`completion-indicator ${passed ? 'passed' : 'failed'}`} 
                            title={passed ? "Completed and passed" : "Completed but failed"}
                          >
                            {passed ? "✓" : "✗"}
                          </span>
                        )}
                      </h2>
                      
                      <div className="lecture-meta">
                      {lecture.duration && (
                        <span className="duration">
                        Duration: <span className="amplify-badge amplify-badge--natural">{lecture.duration}</span>
                        </span>
                      )}
                      {lecture.difficulty && (
                        <span className={`difficulty ${lecture.difficulty.toLowerCase()}`}>
                        Level: <span className={`amplify-badge amplify-badge--${getDifficultyVariation(lecture.difficulty)}`}>
                          {lecture.difficulty}
                        </span>
                        </span>
                      )}
                      </div>
                    </div>
                    <div className="lecture-actions">
                      <Link to={`/courses/${courseId}/lectures/${lecture.lectureId}`} className="amplify-button amplify-button--primary">
                        {isLectureCompleted(lecture.lectureId) ? "Review Lecture" : "View Lecture"}
                      </Link>
                      <button 
                        onClick={() => handleStartQuiz(lecture.lectureId)} 
                        className="amplify-button amplify-button--primary--overlay"
                      >
                        {completed ? (
                          passed ? "Take Quiz Again" : "Retake Quiz (Not Passed)"
                        ) : "Start Quiz"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturesPage;