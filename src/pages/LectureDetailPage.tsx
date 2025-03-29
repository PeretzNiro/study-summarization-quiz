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

/**
 * Creates an authenticated API client using the current user session
 * @returns Authenticated API client or default client if authentication fails
 */
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

/**
 * Component for displaying detailed lecture content with rich formatting
 * Handles lecture data fetching, progress tracking, and navigation
 */
const LectureDetailPage: React.FC = () => {
  const { courseId, lectureId } = useParams<{ courseId: string; lectureId: string }>();
  const { user } = useAuthenticator((context: any) => [context.user]);
  const navigate = useNavigate();
  
  // State management
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [isLectureCompleted, setIsLectureCompleted] = useState(false);
  const [quizPassed, setQuizPassed] = useState<boolean | null>(null);

  /**
   * Maps difficulty level to UI badge variation
   * @param difficulty The difficulty level string
   * @returns CSS class suffix for the badge
   */
  function getDifficultyVariation(difficulty: string): "info" | "warning" | "error" | "natural" {
    const lowerDifficulty = difficulty.toLowerCase();
    if (lowerDifficulty === 'easy') return "info";
    if (lowerDifficulty === 'medium') return "warning";
    if (lowerDifficulty === 'hard') return "error";
    return "natural"; // Default
  }

  // Fetch lecture details when component mounts or parameters change
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
          
          // Check if this lecture is already marked as completed
          if (lectureId) {
            setIsLectureCompleted(completedLectures.has(lectureId));
            
            // Check if quiz was passed
            let isPassed = false;
            if (currentProgress.quizScores) {
              const quizScores = typeof currentProgress.quizScores === 'string' 
                ? JSON.parse(currentProgress.quizScores) 
                : currentProgress.quizScores;
                
              // Look for quiz entries that match the CURRENT lecture ID
              const matchingQuizzes = Object.entries(quizScores).filter(([_, quizData]) => {
                // Check if the quiz data contains information about which lecture it belongs to
                if (typeof quizData === 'object' && quizData !== null) {
                  // First check if quiz has a lectureId property that matches current lecture
                  return 'lectureId' in quizData && quizData.lectureId === lectureId;
                }
                return false;
              });
              
              // If we found matching quizzes for this lecture
              if (matchingQuizzes.length > 0) {
                // Use the most recent quiz result (or any result that exists)
                const [_, scoreData] = matchingQuizzes[0];
                
                if (typeof scoreData === 'object' && scoreData && 'passed' in scoreData) {
                  isPassed = Boolean(scoreData.passed);
                } else if (typeof scoreData === 'object' && scoreData && 'score' in scoreData) {
                  isPassed = typeof scoreData === 'object' && 
                            scoreData !== null && 
                            'score' in scoreData && 
                            typeof scoreData.score === 'number' && 
                            scoreData.score >= 70;
                }
              }
            }
            
            setQuizPassed(isPassed);
          }
          
          // Update the last accessed timestamp without modifying completed lectures
          await authClient.models.UserProgress.update({
            id: currentProgress.id,
            lectureId: lectureId, // Current lecture
            lastAccessed: now,
          });
        } else {
          // Create new progress record without marking lecture as completed yet
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

  /**
   * Navigate to the quiz for this lecture
   */
  const handleStartQuiz = () => {
    if (courseId && lectureId) {
      navigate(`/courses/${courseId}/lectures/${lectureId}/quiz`);
    }
  };

  // Loading state
  if (loading) {
    return <div className="loading-container">Loading lecture content...</div>;
  }

  // Error state
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
            <span 
              className={`completion-indicator ${quizPassed ? 'passed' : 'failed'}`} 
              title={quizPassed ? "Completed and passed" : "Completed but quiz not passed"}
            >
              {quizPassed ? "✓" : "✗"}
            </span>
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
        {lecture.summary ? (
          <div className="lecture-summary">
            <ReactMarkdown 
              rehypePlugins={[rehypeRaw, rehypeKatex]}
              remarkPlugins={[remarkGfm, remarkMath]}
              components={{
                // Remap heading levels for proper hierarchy
                h1: ({node, children, ...props}) => <h2 className="summary-heading" {...props}>{children}</h2>,
                h2: ({node, children, ...props}) => <h3 className="summary-heading" {...props}>{children}</h3>,
                h3: ({node, children, ...props}) => <h4 className="summary-heading" {...props}>{children}</h4>,
                // Add responsive table wrapper
                table: ({node, children, ...props}) => (
                  <div className="table-wrapper">
                    <table {...props}>{children}</table>
                  </div>
                ),
                // Syntax highlighting for code blocks
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
                      customStyle={{
                        borderRadius: '8px'
                      }}
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
        ) : (
          <div className="lecture-summary-error">No summary found for this lecture.</div>
        )}
      </div>
      
      <div className="lecture-actions">
        <button 
          onClick={handleStartQuiz}
          className="amplify-button amplify-button--primary start-quiz-btn"
        >
          {isLectureCompleted 
            ? (quizPassed 
                ? "Take Quiz Again" 
                : "Retake Quiz (Not Passed)"
              ) 
            : "Start Quiz for this Lecture"
          }
        </button>
        {savingProgress && <small className="saving-indicator">Saving progress...</small>}
        {progressError && <div className="progress-error">{progressError}</div>}
      </div>
    </div>
  );
};

export default LectureDetailPage;