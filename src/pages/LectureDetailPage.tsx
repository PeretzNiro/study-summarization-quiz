import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import { useAuthenticator } from '@aws-amplify/ui-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Schema } from '../../amplify/data/resource';
import '../styles/Lectures.css';
import { fetchAuthSession } from 'aws-amplify/auth';

const client = generateClient<Schema>();
type Lecture = Schema['Lecture']['type'];

const getAuthenticatedClient = async () => {
  try {
    const { tokens } = await fetchAuthSession();
    return generateClient<Schema>({
      authMode: 'userPool',
      authToken: tokens?.idToken?.toString()
    });
  } catch (error) {
    console.error('Error getting authenticated client:', error);
    return client;
  }
};

const LectureDetailPage: React.FC = () => {
  const { courseId, lectureId } = useParams<{ courseId: string; lectureId: string }>();
  const { user } = useAuthenticator((context: any) => [context.user]);
  const navigate = useNavigate();
  
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [isLectureCompleted, setIsLectureCompleted] = useState(false);

  // Helper function for badge variation
  function getDifficultyVariation(difficulty: string): "info" | "warning" | "error" | "natural" {
    const lowerDifficulty = difficulty.toLowerCase();
    if (lowerDifficulty === 'easy') return "info";
    if (lowerDifficulty === 'medium') return "warning";
    if (lowerDifficulty === 'hard') return "error";
    return "natural"; // Default
  }

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
        
        // Get authenticated client
        const authClient = await getAuthenticatedClient();
        
        // First check if a progress record exists
        const { data: existingProgress } = await authClient.models.UserProgress.list({
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
          
          // CHECK if this lecture is already marked as completed, but DON'T add it
          if (lectureId) {
            setIsLectureCompleted(completedLectures.has(lectureId));
          }
          
          // Update the last accessed timestamp, but don't modify completed lectures
          await authClient.models.UserProgress.update({
            id: currentProgress.id,
            lectureId: lectureId, // Current lecture
            lastAccessed: now,
            // Don't change completedLectures here
          });
          
          // Don't set isLectureCompleted to true automatically
        } else {
          // Create new progress record WITHOUT marking lecture as completed
          await authClient.models.UserProgress.create({
            userId: user.username,
            courseId: courseId!,
            lectureId: lectureId!,
            completedLectures: [], // Start with empty array
            quizScores: {},
            lastAccessed: now
          });
          
          // Set as not completed initially
          setIsLectureCompleted(false);
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
        <h1>
          {lecture.title}
          {isLectureCompleted && (
            <span className="completion-indicator" title="Completed">✓</span>
          )}
        </h1>
        <div className="lecture-meta">
          {lecture.duration && <span className="duration">Duration: <span className="amplify-badge amplify-badge--natural">{lecture.duration}</span></span>}
          {lecture.difficulty && <span className={`difficulty ${lecture.difficulty.toLowerCase()}`}>
            Level: <span className={`amplify-badge amplify-badge--${getDifficultyVariation(lecture.difficulty)}`}>
              {lecture.difficulty}
            </span>
          </span>}
        </div>
      </div>
      
      <div className="lecture-content">
        {lecture.content && (
          <div className="content-markdown">
            <div className="markdown-content">
              <ReactMarkdown 
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                remarkPlugins={[remarkGfm, remarkMath]}
                components={{
                  code({node, inline, className, children, ...props}: {
                    node?: any;
                    inline?: boolean;
                    className?: string;
                    children?: React.ReactNode;
                    [key: string]: any;
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
                {lecture.content}
              </ReactMarkdown>
            </div>
          </div>
        )}
        
        {lecture.summary && (
          <div className="lecture-summary">
            <ReactMarkdown 
              rehypePlugins={[rehypeRaw, rehypeKatex]}
              remarkPlugins={[remarkGfm, remarkMath]}
              components={{
                code({node, inline, className, children, ...props}: {
                  node?: any;
                  inline?: boolean;
                  className?: string;
                  children?: React.ReactNode;
                  [key: string]: any;
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
              {lecture.summary}
            </ReactMarkdown>
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