import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Schema } from '../../amplify/data/resource';
import { Course } from '../types/models';
import '../styles/Lectures.css';

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
        <div className="lecture-page-content">
          <div className='lecture-page box_wrapper_no_hover'>
            <div className="lecture-list">
              {lectures.map(lecture => (
                <div key={lecture.lectureId} className="lecture-card">
                  <div className="lecture-content">
                    <h3>{lecture.title}</h3>
                    {lecture.summary && (
                      <div className="summary-preview">
                        {/* Display a shortened summary with ReactMarkdown */}
                        <ReactMarkdown 
                          rehypePlugins={[rehypeRaw, rehypeKatex]} 
                          remarkPlugins={[remarkGfm, remarkMath]}
                          // className="markdown-summary"
                          components={{
                            code({inline, className, children, ...props}: {
                              inline?: boolean;
                              className?: string;
                              children?: React.ReactNode;
                            }) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={vscDarkPlus}
                                  language={match[1]}
                                  PreTag="div"
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {getShortenedSummary(lecture.summary)}
                        </ReactMarkdown>
                      </div>
                    )}
                    <div className="lecture-meta">
                      {lecture.duration && <span className="duration">Duration: <span className="amplify-badge amplify-badge--info">{lecture.duration}</span></span>}
                      {lecture.difficulty && <span className={`difficulty ${lecture.difficulty.toLowerCase()}`}>
                        Level: <span className="amplify-badge amplify-badge--info">{lecture.difficulty}</span>
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
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to shorten the summary for preview
function getShortenedSummary(summary: string): string {
  // Get just the first paragraph or first 150 characters
  const firstParagraph = summary.split('\n\n')[0];
  if (firstParagraph.length <= 150) {
    return firstParagraph;
  }
  return firstParagraph.substring(0, 150) + '...';
}

export default LecturesPage;