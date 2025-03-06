import React from 'react';
import { Link, useParams } from 'react-router-dom';
import QuizContainer from '../components/quiz/QuizContainer';
import { generateClient } from 'aws-amplify/data';
import { useAuthenticator } from '@aws-amplify/ui-react';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

const QuizPage: React.FC = () => {
  const { user } = useAuthenticator((context) => [context.user]);
  const { courseId, lectureId } = useParams<{ courseId: string; lectureId: string }>();
  
  const handleQuizSubmission = async (score: number, quizId: string) => {
    if (!user || !courseId || !quizId) return;
    
    try {
      // Find existing progress
      const { data: existingProgress } = await client.models.UserProgress.list({
        filter: { 
          userId: { eq: user.username },
          courseId: { eq: courseId }
        }
      });
      
      const now = new Date().toISOString();
      
      if (existingProgress && existingProgress.length > 0) {
        // Update existing record with quiz score
        const currentProgress = existingProgress[0];
        const updatedQuizScores = {
          ...(typeof currentProgress.quizScores === 'object' && currentProgress.quizScores !== null ? currentProgress.quizScores : {}),
          [quizId]: score
        };
        
        await client.models.UserProgress.update({
          id: currentProgress.id,
          quizScores: updatedQuizScores,
          lastAccessed: now
        });
      } else {
        // Create new progress record with quiz score
        await client.models.UserProgress.create({
          userId: user.username,
          courseId: courseId,
          lectureId: lectureId || '',
          completedLectures: [],
          quizScores: { [quizId]: score },
          lastAccessed: now
        });
      }
    } catch (error) {
      console.error('Error updating quiz scores:', error);
    }
  };
  
  if (!courseId || !lectureId) {
    return (
      <div className="error-container">
        <p>Missing required course or lecture information.</p>
        <Link to="/courses" className="btn btn-primary">
          Return to Courses
        </Link>
      </div>
    );
  }
  
  return (
    <div className="quiz-page">
      <div className="lecture-navigation">
        <Link to={`/courses/${courseId}/lectures/${lectureId}`} className="back-link">
          ← Back to Lecture
        </Link>
      </div>
      <div className="quiz-header">
        <h1>Quiz Assessment</h1>
      </div>
      
      <QuizContainer 
        courseId={courseId} 
        lectureId={lectureId} 
        onQuizSubmit={handleQuizSubmission} 
      />
    </div>
  );
};

export default QuizPage;