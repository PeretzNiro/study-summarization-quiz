import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import { useAuthenticator } from '@aws-amplify/ui-react';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();
type Lecture = Schema['Lecture']['type'];

const LectureDetailPage: React.FC = () => {
  const { courseId, lectureId } = useParams<{ courseId: string; lectureId: string }>();
  const { user } = useAuthenticator((context: any) => [context.user]);
  const navigate = useNavigate();
  
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLectureDetails() {
      if (!courseId || !lectureId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch lecture details by courseId and lectureId
        const { data: lecturesData, errors } = await client.models.Lecture.list({
          filter: {
            courseId: { eq: courseId },
            lectureId: { eq: lectureId }
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

  // Track user progress when viewing a lecture
  useEffect(() => {
    if (!user || !courseId || !lectureId || !lecture) return;
    
    async function updateUserProgress() {
      try {
        setSavingProgress(true);
        // First check if a progress record exists
        const { data: existingProgress } = await client.models.UserProgress.list({
          filter: { 
            userId: { eq: user.username },
            courseId: { eq: courseId }
          }
        });
        
        const now = new Date().toISOString();
        
        if (existingProgress && existingProgress.length > 0) {
          // Update existing record
          const currentProgress = existingProgress[0];
          const completedLectures = new Set(currentProgress.completedLectures || []);
          if (lectureId) {
            completedLectures.add(lectureId);
          }
          
          await client.models.UserProgress.update({
            id: currentProgress.id,
            lectureId: lectureId, // Current lecture
            lastAccessed: now,
            completedLectures: Array.from(completedLectures)
          });
        } else {
          // Create new progress record
          await client.models.UserProgress.create({
            userId: user.username,
            courseId: courseId!,
            lectureId: lectureId!,
            completedLectures: [lectureId!],
            quizScores: {},
            lastAccessed: now
          });
        }
      } catch (error) {
        console.error('Error updating progress:', error);
        setProgressError('Failed to save your progress. Your learning will continue, but progress may not be tracked.');
      } finally {
        setSavingProgress(false);
      }
    }
    
    updateUserProgress();
  }, [user, courseId, lectureId, lecture]);

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
        {savingProgress && <small className="saving-indicator">Saving progress...</small>}
        {progressError && <div className="progress-error">{progressError}</div>}
      </div>
    </div>
  );
};

export default LectureDetailPage;