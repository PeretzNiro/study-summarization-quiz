import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { Course, UserProgress } from '../types/models';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Loader, View, Heading, Text, Badge, Flex } from '@aws-amplify/ui-react';

const client = generateClient<Schema>();

const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthenticator((context) => [context.user]);
  const [userProgress, setUserProgress] = useState<Record<string, UserProgress>>({});

  useEffect(() => {
    async function fetchCourses() {
      try {
        setLoading(true);
        // List all courses from the database
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

  useEffect(() => {
    async function fetchUserProgress() {
      if (!user) return;
      
      try {
        const { data, errors } = await client.models.UserProgress.list({
          filter: { userId: { eq: user.username } }
        });
        
        if (errors) {
          console.error('Errors fetching user progress:', errors);
          return;
        }
        
        // Convert array to object indexed by courseId for easier lookup
        if (data && data.length > 0) {
          const progressByCourse = data.reduce((acc, progress) => {
            // Fix the key to use courseId instead of courseId
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

  if (loading) {
    return (
      <Flex direction="column" alignItems="center" justifyContent="center" padding="2rem">
        <Loader size="large" />
        <Text marginTop="1rem">Loading courses...</Text>
      </Flex>
    );
  }

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
            
            return (
              <Link 
                to={`/courses/${course.courseId}`}
                key={course.courseId}
                className="course-card"
              >
                <div className="course-content">
                  <h2>{course.title}</h2>
                  {course.description && <p>{course.description}</p>}
                  
                  <div className="course-details">
                    {course.difficulty && (
                      <Badge variation={getDifficultyVariation(course.difficulty)}>
                        {course.difficulty}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Progress indicator */}
                  {hasProgress && (
                    <div className="progress-indicator">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${calculateProgress(progress)}%` }}
                        />
                      </div>
                      <Text fontSize="0.8rem">
                        {progress.completedLectures.length} completed lectures
                      </Text>
                      {progress.lastAccessed && (
                        <Text fontSize="0.75rem" color="var(--amplify-colors-neutral-60)">
                          Last accessed: {formatDate(progress.lastAccessed)}
                        </Text>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Helper functions
function getDifficultyVariation(difficulty: string): "info" | "warning" | "error" {
  switch (difficulty.toLowerCase()) {
    case 'easy': return 'info';
    case 'medium': return 'warning';
    case 'hard': return 'error';
    default: return 'info';
  }
}

function calculateProgress(progress: UserProgress): number {
  // You'll need to know the total number of lectures in the course
  // For now, we'll just show a placeholder
  return progress.completedLectures.length * 10; // Assuming 10 lectures per course
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export default CoursesPage;