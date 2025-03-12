import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import { useAuthenticator } from '@aws-amplify/ui-react'; // Add this import
import 'katex/dist/katex.min.css';
import type { Schema } from '../../amplify/data/resource';
import { Course } from '../types/models';
import '../styles/Lectures.css';
import { fetchAuthSession } from 'aws-amplify/auth'; // Add this import

// Use the type from the generated Schema
type Lecture = Schema['Lecture']['type'];
type UserProgress = Schema['UserProgress']['type'];

const client = generateClient<Schema>();

const LecturesPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthenticator((context) => [context.user]); // Add user authentication
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setUserProgress] = useState<UserProgress | null>(null); // Add state for user progress
  const [, setProgressLoading] = useState(false);
  const [completedLectureIds, setCompletedLectureIds] = useState<string[]>([]);

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
        
        // Sort lectures by lectureId if needed
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

  // Add new useEffect to fetch user progress
  useEffect(() => {
    fetchUserProgress();
  }, [courseId, user]);
  
  // Add this function before fetchUserProgress
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

  // Then update your fetchUserProgress function
  async function fetchUserProgress() {
    if (!user || !courseId) {
      return;
    }
    
    setProgressLoading(true);
    try {
      
      // Use an authenticated client
      const authClient = await getAuthenticatedClient();
      
      const { data: progressData } = await authClient.models.UserProgress.list({
        filter: { 
          userId: { eq: user.username },
          courseId: { eq: courseId }
        }
      });
      
      if (progressData && progressData.length > 0) {
        
        // Extract completed lecture IDs
        let completedLectures: string[] = [];
        
        if (Array.isArray(progressData[0].completedLectures)) {
          if (progressData[0].completedLectures.length > 0 && 
                typeof progressData[0].completedLectures[0] === 'object' && 
                progressData[0].completedLectures[0] !== null &&
                'S' in progressData[0].completedLectures[0]) {
            completedLectures = progressData[0].completedLectures.map((item: any) => item.S);
          } else {
            completedLectures = progressData[0].completedLectures.filter((item): item is string => item !== null);
          }
        } else if (typeof progressData[0].completedLectures === 'string') {
          try {
            completedLectures = JSON.parse(progressData[0].completedLectures);
          } catch (e) {
            console.error('Failed to parse completedLectures string:', e);
          }
        }
        
        
        // Save both the whole progress object and the completed lecture IDs
        setUserProgress(progressData[0]);
        setCompletedLectureIds(completedLectures);
      } else {
        setUserProgress(null);
        setCompletedLectureIds([]);
      }
    } catch (err) {
      console.error('Error fetching user progress:', err);
    } finally {
      setProgressLoading(false);
    }
  }
  
  // Updated isLectureCompleted function
  const isLectureCompleted = (lectureId: string): boolean => {
    // Use the pre-processed completed lecture IDs
    return completedLectureIds.includes(lectureId);
  };

  const handleStartQuiz = (lectureId: string) => {
    navigate(`/courses/${courseId}/lectures/${lectureId}/quiz`);
  };

  // Helper function for badge variation
  function getDifficultyVariation(difficulty: string): "info" | "warning" | "error" | "natural" {
    const lowerDifficulty = difficulty.toLowerCase();
    if (lowerDifficulty === 'easy') return "info";
    if (lowerDifficulty === 'medium') return "warning";
    if (lowerDifficulty === 'hard') return "error";
    return "natural"; // Default
  }

  if (loading) {
    return <div className="loading-container">Loading course content...</div>;
  }

  if (error || !course) {
    return <div className="error-container">{error || 'Course not found'}</div>;
  }

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
                const isCompleted = isLectureCompleted(lecture.lectureId);
                
                return (
                  <div key={lecture.lectureId} className="lecture-card">
                    <div className="lecture-content">
                      <h2>
                      {lecture.title}
                      {isCompleted && (
                      <span className="completion-indicator" title="Completed">✓</span>
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
                        Start Quiz
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