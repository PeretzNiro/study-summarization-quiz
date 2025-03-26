import React, { useState, useEffect } from 'react';
import { Tabs } from '@aws-amplify/ui-react';
import LecturesTab from './LecturesTab';
import QuizQuestionsTab from './QuizQuestionsTab';
import QuizzesTab from './QuizzesTab';
import PendingUploadsTab from './PendingUploadsTab';
import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import type { Schema } from '../../../types/Schema';
import './ContentManager.css';

/**
 * Content Manager component providing administrative interface
 * for managing course materials, quizzes, and content uploads
 */
const ContentManager: React.FC = () => {
  // Core state for shared data across tabs
  const [courses, setCourses] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>('');
  
  /**
   * Create an authenticated GraphQL client with user's session token
   * Used for all database operations across content management tabs
   */
  const getAuthenticatedClient = async () => {
    try {
      const { tokens } = await fetchAuthSession();
      if (!tokens?.idToken?.toString()) {
        throw new Error('No ID token found in session');
      }
      
      return generateClient<Schema>({
        authMode: 'userPool',
        authToken: tokens.idToken.toString()
      });
    } catch (error) {
      console.error('Error getting authenticated client:', error);
      throw error;
    }
  };

  /**
   * Fetch all approved lectures from the database
   * Can be called from PendingUploadsTab after approving new content
   */
  const fetchLectures = async () => {
    try {
      const authClient = await getAuthenticatedClient();
      
      // Only fetch approved lectures for the main lecture tab
      const result = await authClient.models.Lecture.list({
        filter: { status: { eq: 'approved' } }
      });
      
      if (result.data) {
        setLectures(result.data);
      }
    } catch (error) {
      console.error('Error fetching lectures:', error);
    }
  };
  
  /**
   * Fetch all courses from the database
   * Used for populating course selection dropdowns
   */
  const fetchCourses = async () => {
    try {
      const authClient = await getAuthenticatedClient();
      const result = await authClient.models.Course.list();
      
      if (result.data) {
        setCourses(result.data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };
  
  // Initialize data when component mounts
  useEffect(() => {
    fetchCourses();
    fetchLectures();
  }, []);

  return (
    <div className="content-manager">
      <Tabs className="content-manager-tabs"
        defaultValue="pending"
        spacing="equal"
        items={[
          {
            label: "Pending Uploads",
            value: "pending",
            content: (
              <PendingUploadsTab 
                getAuthenticatedClient={getAuthenticatedClient}
                courses={courses}
                refreshLectures={fetchLectures}
              />
            )
          },
          {
            label: "Lectures",
            value: "lectures",
            content: (
              <LecturesTab 
                getAuthenticatedClient={getAuthenticatedClient}
                courses={courses}
                lectures={lectures}
                courseFilter={courseFilter}
                setCourseFilter={setCourseFilter}
                refreshLectures={fetchLectures}
              />
            )
          },
          {
            label: "Quiz Questions",
            value: "questions",
            content: (
              <QuizQuestionsTab 
                getAuthenticatedClient={getAuthenticatedClient}
                courses={courses}
                lectures={lectures}
                courseFilter={courseFilter}
              />
            )
          },
          {
            label: "Quizzes",
            value: "quizzes",
            content: (
              <QuizzesTab 
                getAuthenticatedClient={getAuthenticatedClient}
                courses={courses}
                lectures={lectures}
                courseFilter={courseFilter}
              />
            )
          }
        ]}
      />
    </div>
  );
};

export default ContentManager;