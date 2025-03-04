import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();
type Lecture = Schema['Lecture']['type'];

const LectureDetailPage: React.FC = () => {
  const { courseId, lectureId } = useParams<{ courseId: string; lectureId: string }>();
  const navigate = useNavigate();
  
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLectureDetails() {
      if (!courseId || !lectureId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch lecture details by courseID and lectureID
        const { data: lecturesData, errors } = await client.models.Lecture.list({
          filter: {
            courseID: { eq: courseId },
            lectureID: { eq: lectureId }
          }
        });
        
        if (errors) {
          throw new Error('Failed to fetch lecture details');
        }
        
        if (!lecturesData || lecturesData.length === 0) {
          setError('Lecture not found');
          return;
        }
        
        setLecture(lecturesData[0]);
      } catch (err) {
        console.error('Error fetching lecture:', err);
        setError('Failed to load lecture content. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchLectureDetails();
  }, [courseId, lectureId]);

  const handleStartQuiz = () => {
    if (courseId && lectureId) {
      navigate(`/courses/${courseId}/lectures/${lectureId}/quiz`);
    }
  };

  if (loading) {
    return <div className="loading-container">Loading lecture content...</div>;
  }

  if (error || !lecture) {
    return <div className="error-container">{error || 'Lecture not found'}</div>;
  }

  return (
    <div className="lecture-detail-page">
      <div className="lecture-navigation">
        <Link to={`/courses/${courseId}`} className="back-link">
          ← Back to Course
        </Link>
      </div>
      
      <div className="lecture-header">
        <h1>{lecture.title}</h1>
        <div className="lecture-meta">
          {lecture.duration && <span>Duration: {lecture.duration}</span>}
          {lecture.difficulty && <span className={`difficulty ${lecture.difficulty.toLowerCase()}`}>
            Level: {lecture.difficulty}
          </span>}
        </div>
      </div>
      
      <div className="lecture-content">
        {/* Use safe rendering instead of dangerouslySetInnerHTML */}
        <div className="content-text">
          {lecture.content?.split('\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
        
        {lecture.summary && (
          <div className="lecture-summary">
            <h3>Summary</h3>
            <p>{lecture.summary}</p>
          </div>
        )}
      </div>
      
      <div className="lecture-actions">
        <button 
          onClick={handleStartQuiz}
          className="btn btn-primary start-quiz-btn"
        >
          Start Quiz for this Lecture
        </button>
      </div>
    </div>
  );
};

export default LectureDetailPage;