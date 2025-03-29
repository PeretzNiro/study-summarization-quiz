import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { Course, UserProgress } from '../types/models';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Loader, View, Heading, Text, Badge, Flex } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';

const client = generateClient<Schema>();

/**
 * Component for displaying available courses with progress tracking
 */
const CoursesPage: React.FC = () => {
  // Core state management
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthenticator((context) => [context.user]);
  
  // Progress tracking state
  const [userProgress, setUserProgress] = useState<Record<string, UserProgress>>({});
  const [lectureCountByCourse, setLectureCountByCourse] = useState<Record<string, number>>({});

  // Fetch all courses on component mount
  useEffect(() => {
    async function fetchCourses() {
      try {
        setLoading(true);
        
        const { data: coursesData, errors } = await client.models.Course.list();
        
        if (errors) {
          throw new Error('Failed to fetch courses');
        }
        
        setCourses(coursesData || []);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  /**
   * Creates an authenticated API client using the current user session
   * @returns Authenticated API client or default client if authentication fails
   */
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

  // Fetch user progress data when user is authenticated
  useEffect(() => {
    async function fetchUserProgress() {
      if (!user) return;
      
      try {
        // Use authenticated client for user-specific data
        const authClient = await getAuthenticatedClient();
        
        const { data, errors } = await authClient.models.UserProgress.list({
          filter: { userId: { eq: user.username } }
        });
        
        if (errors) {
          console.error('Errors fetching user progress:', errors);
          return;
        }
        
        // Convert array to object indexed by courseId for easier lookup
        if (data && data.length > 0) {
          const progressByCourse = data.reduce((acc, progress) => {
            acc[progress.courseId] = {
              ...progress,
              // Handle null/undefined cases for completedLectures
              completedLectures: Array.isArray(progress.completedLectures) ? 
                progress.completedLectures.filter((lecture): lecture is string => lecture !== null && lecture !== undefined) : [],
              // Ensure quizScores is always the expected object type
              quizScores: typeof progress.quizScores === 'object' && progress.quizScores !== null ? 
                progress.quizScores as { [quizId: string]: number } : {}
            };
            return acc;
          }, {} as Record<string, UserProgress>);
          
          setUserProgress(progressByCourse);
        }
      } catch (error) {
        console.error('Error fetching user progress:', error);
      }
    }
    
    fetchUserProgress();
  }, [user]);

  // Count lectures per course for progress calculation
  useEffect(() => {
    async function fetchLectureCounts() {
      if (!courses || courses.length === 0) return;
      
      const counts: Record<string, number> = {};
      
      try {
        for (const course of courses) {
          const { data } = await client.models.Lecture.list({
            filter: { courseId: { eq: course.courseId } }
          });
          
          counts[course.courseId] = data?.length || 0;
        }
        
        setLectureCountByCourse(counts);
      } catch (error) {
        console.error('Error fetching lecture counts:', error);
      }
    }
    
    fetchLectureCounts();
  }, [courses]);

  // Loading state
  if (loading) {
    return (
      <Flex direction="column" alignItems="center" justifyContent="center" padding="2rem">
        <Loader size="large" />
        <Text marginTop="1rem">Loading courses...</Text>
      </Flex>
    );
  }

  // Error state
  if (error) {
    return (
      <View padding="2rem" backgroundColor="var(--amplify-colors-background-error)">
        <Heading level={3}>Error</Heading>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <div className="courses-page box_wrapper_no_hover">
      <h1>Available Courses</h1>
      
      {courses.length === 0 ? (
        <p>No courses available at the moment.</p>
      ) : (
        <div className="course-grid">
          {courses.map(course => {
            // Get progress for this course if available
            const progress = userProgress[course.courseId];
            const hasProgress = !!progress;
            
            // Calculate progress percentage
            const progressPercent = hasProgress ? 
              calculateProgress(progress, lectureCountByCourse) : 0;
            
            return (
              <Link 
                to={`/courses/${course.courseId}`}
                key={course.courseId}
                className="course-card"
              >
                <div className="course-content">
                  <h2>{course.title}</h2>

                  <div className="course-details">
                    {course.difficulty && (
                      <Badge variation={getDifficultyVariation(course.difficulty)}>
                        {course.difficulty}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Progress indicator with completion percentage */}
                  <div className="progress-indicator-course">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${progressPercent}%`,
                          backgroundColor: hasProgress ? '#00A300' : '#cccccc'
                        }}
                      />
                    </div>
                    <Text fontSize="0.8rem">
                      {hasProgress ? (
                        `${progress.completedLectures.length} of ${lectureCountByCourse[course.courseId] || '?'} lectures completed`
                      ) : (
                        'No progress yet'
                      )}
                    </Text>
                    {hasProgress && progress.lastAccessed && (
                      <Text fontSize="0.75rem" color="var(--amplify-colors-neutral-60)">
                        Last accessed: {formatDate(progress.lastAccessed)}
                      </Text>
                    )}
                  </div>
                  <div className="click-indicator">
                    <span className="click-text">Click to view course</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Maps difficulty level to appropriate UI badge variation
 * @param difficulty The difficulty level string
 * @returns The badge variation to use
 */
function getDifficultyVariation(difficulty: string): "info" | "warning" | "error" {
  switch (difficulty.toLowerCase()) {
    case 'easy': return 'info';
    case 'medium': return 'warning';
    case 'hard': return 'error';
    default: return 'info';
  }
}

/**
 * Calculates completion percentage for a course
 * @param progress User's progress data for the course
 * @param lectureCountByCourse Object mapping courseId to lecture count
 * @returns Percentage of course completion (0-100)
 */
function calculateProgress(progress: UserProgress, lectureCountByCourse: Record<string, number>): number {
  const totalLectures = lectureCountByCourse[progress.courseId] || 10; // Default to 10 if unknown
  if (totalLectures === 0) return 0;
  
  return Math.round((progress.completedLectures.length / totalLectures) * 100);
}

/**
 * Formats an ISO date string into a human-readable format
 * @param dateString ISO date string
 * @returns Formatted date string (e.g., "Mar 26, 2025")
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export default CoursesPage;