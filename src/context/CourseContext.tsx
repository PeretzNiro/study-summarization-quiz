import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

/**
 * Type definition for the course context
 */
interface CourseContextType {
  lectureCounts: Record<string, number>; // Maps courseId to number of lectures it contains
  loading: boolean;                      // Indicates if data is currently being fetched
}

// Create context with default values
const CourseContext = createContext<CourseContextType>({
  lectureCounts: {},
  loading: true
});

/**
 * Provider component that fetches and maintains lecture count data
 * for each course to enable UI optimizations
 */
export const CourseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State to track lecture counts by courseId
  const [lectureCounts, setLectureCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  
  // Create data API client
  const client = generateClient<Schema>();
  
  // Fetch lecture counts when component mounts
  useEffect(() => {
    async function fetchAllLectureCounts() {
      try {
        setLoading(true);
        
        // Get all lectures (efficient in small to medium datasets)
        const { data, errors } = await client.models.Lecture.list();
        
        if (errors) {
          console.error('Error fetching lectures:', errors);
          return;
        }
        
        // Group lectures by courseId and count occurrences
        const counts = data?.reduce((acc, lecture) => {
          const courseId = lecture.courseId;
          acc[courseId] = (acc[courseId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};
        
        setLectureCounts(counts);
      } catch (error) {
        console.error('Error counting lectures:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAllLectureCounts();
  }, []); // Only run once on mount
  
  // Provide lecture count data to child components
  return (
    <CourseContext.Provider value={{ lectureCounts, loading }}>
      {children}
    </CourseContext.Provider>
  );
};

/**
 * Custom hook for accessing course data context
 * @returns Course context with lecture counts and loading state
 */
export const useCourseData = () => useContext(CourseContext);