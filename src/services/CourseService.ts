import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

export interface CourseData {
  id?: string;
  courseId: string;
  title?: string;
  description?: string;
  difficulty?: string;
}

export class CourseService {
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