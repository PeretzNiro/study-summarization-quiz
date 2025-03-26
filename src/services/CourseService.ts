import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import type { Schema } from '../../amplify/data/resource';

// Default client for unauthenticated operations
const client = generateClient<Schema>();

/**
 * Interface defining the structure of course data
 */
export interface CourseData {
  id?: string;                // Internal database ID
  courseId: string;           // Business identifier for the course
  title?: string;             // Display title
  description?: string;       // Course description
  difficulty?: string;        // Difficulty level
}

/**
 * Service class for course-related operations
 */
export class CourseService {
  /**
   * Creates an authenticated API client using the current user session
   * @returns Authenticated API client or default client if authentication fails
   */
  static async getAuthenticatedClient() {
    try {
      const { tokens } = await fetchAuthSession();
      return generateClient<Schema>({
        authMode: 'userPool',
        authToken: tokens?.idToken?.toString()
      });
    } catch (error) {
      console.error('Error getting authenticated client:', error);
      return generateClient<Schema>();
    }
  }

  /**
   * Creates a new course
   * @param courseData The course data to create
   * @returns The created course
   */
  static async createCourse(courseData: any) {
    try {
      const client = await this.getAuthenticatedClient();
      const result = await client.models.Course.create(courseData);
      return result.data;
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  }

  /**
   * Updates an existing course
   * @param id The unique identifier of the course
   * @param courseData The updated course data
   * @returns The updated course
   */
  static async updateCourse(id: string, courseData: any) {
    try {
      const client = await this.getAuthenticatedClient();
      const result = await client.models.Course.update({
        id,
        ...courseData,
      });
      return result.data;
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    }
  }

  /**
   * Get all available courses
   * @returns List of course IDs and titles
   */
  static async getAllCourses(): Promise<CourseData[]> {
    try {
      const { data: courses, errors } = await client.models.Course.list();
      
      if (errors) {
        console.error('Errors fetching courses:', errors);
        return [];
      }
      
      // Map database objects to CourseData interface
      return (courses || []).map(course => ({
        id: course.id,
        courseId: course.courseId,
        title: course.title === null ? undefined : course.title,
        description: course.description === null ? undefined : course.description,
        difficulty: course.difficulty === null ? undefined : course.difficulty
      }));
    } catch (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
  }
  
  /**
   * Get list of all course IDs
   * @returns Array of course IDs
   */
  static async getAllCourseIds(): Promise<string[]> {
    try {
      const courses = await this.getAllCourses();
      return courses.map(course => course.courseId);
    } catch (error) {
      console.error('Error fetching course IDs:', error);
      return [];
    }
  }
  
  /**
   * Find a course by its courseId
   * @param courseId The course ID to search for
   * @returns The course data or null if not found
   */
  static async getCourseById(courseId: string): Promise<CourseData | null> {
    try {
      const { data: courses, errors } = await client.models.Course.list({
        filter: { courseId: { eq: courseId } }
      });
      
      if (errors) {
        console.error('Errors fetching course:', errors);
        return null;
      }
      
      if (courses && courses.length > 0) {
        const course = courses[0];
        return {
          id: course.id,
          courseId: course.courseId,
          title: course.title === null ? undefined : course.title,
          description: course.description === null ? undefined : course.description,
          difficulty: course.difficulty === null ? undefined : course.difficulty
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching course ${courseId}:`, error);
      return null;
    }
  }
}