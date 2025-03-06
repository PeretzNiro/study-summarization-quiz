import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

interface CourseContextType {
  lectureCounts: Record<string, number>;
  loading: boolean;
}

const CourseContext = createContext<CourseContextType>({
  lectureCounts: {},
  loading: true
});

export const CourseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lectureCounts, setLectureCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const client = generateClient<Schema>();
  
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
        
        // Group by courseId and count
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
  }, []);
  
  return (
    <CourseContext.Provider value={{ lectureCounts, loading }}>
      {children}
    </CourseContext.Provider>
  );
};

export const useCourseData = () => useContext(CourseContext);