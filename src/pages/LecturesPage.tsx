import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { Course } from '../types/models';

// Use the type from the generated Schema
type Lecture = Schema['Lecture']['type'];

const client = generateClient<Schema>();

const LecturesPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleStartQuiz = (lectureId: string) => {
    navigate(`/courses/${courseId}/lectures/${lectureId}/quiz`);
  };

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
        <div className="lecture-list">
          {lectures.map(lecture => (
            <div key={lecture.lectureId} className="lecture-card">
              <div className="lecture-content">
                <h3>{lecture.title}</h3>
                {lecture.summary && <p>{lecture.summary}</p>}
                <div className="lecture-meta">
                  {lecture.duration && <span>Duration: {lecture.duration}</span>}
                  {lecture.difficulty && <span className={`difficulty ${lecture.difficulty.toLowerCase()}`}>
                    Level: {lecture.difficulty}
                  </span>}
                </div>
              </div>
              <div className="lecture-actions">
                <Link to={`/courses/${courseId}/lectures/${lecture.lectureId}`} className="btn btn-primary">
                  View Lecture
                </Link>
                <button 
                  onClick={() => handleStartQuiz(lecture.lectureId)} 
                  className="btn btn-secondary"
                >
                  Start Quiz
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LecturesPage;