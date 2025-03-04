import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { Course } from '../types/models';

const client = generateClient<Schema>();

const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        setLoading(true);
        // List all courses from the database
        const { data: coursesData, errors } = await client.models.Course.list();
        
        if (errors) {
          throw new Error('Failed to fetch courses');
        }
        
        setCourses(coursesData);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  if (loading) {
    return <div className="loading-container">Loading courses...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <div className="courses-page box_wrapper">
      <h1>Available Courses</h1>
      
      {courses.length === 0 ? (
        <p>No courses available at the moment.</p>
      ) : (
        <div className="course-grid">
          {courses.map(course => (
            <Link 
// Use courseID instead of id for routing
              to={`/courses/${course.courseID}`} 
              key={course.courseID}
              className="course-card"
            >
                            <div className="course-content">
                <h2>{course.title}</h2>
                {course.description && <p>{course.description}</p>}
                {course.difficulty && (
                  <span className={`difficulty-badge ${course.difficulty.toLowerCase()}`}>
                    {course.difficulty}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoursesPage;