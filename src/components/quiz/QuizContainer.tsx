import React, { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';

// Child components
import QuestionCard from './QuestionCard';
import QuizNavigation from './QuizNavigation';
import QuizResults from './QuizResults';

import { QuizQuestion, UserAnswer } from './types';
import './Quiz.css';

const client = generateClient<Schema>();

interface QuizContainerProps {
  courseId: string;   // We'll fetch all Quiz items matching this courseId
  lectureId: string;  // and this lectureId
  onQuizSubmit?: (score: number, quizId: string) => void;
}

/**
 * Main quiz container component that manages quiz state and lifecycle
 * Fetches questions from the database, tracks user progress, and persists results
 */
const QuizContainer: React.FC<QuizContainerProps> = ({ courseId, lectureId, onQuizSubmit }) => {
  // Get current authenticated user
  const { user } = useAuthenticator((context) => [context.user]);
  
  // Quiz identification and content state
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  
  // Quiz flow control state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calculate the quiz score based on correct answers
   * @returns Percentage score (0-100)
   */
  const calculateScore = (): number => {
    if (questions.length === 0) return 0;
    
    // Count correct answers
    const correctCount = userAnswers.filter((answer) => {
      const question = questions.find(q => q.id === answer.questionId);
      return (
        question && 
        answer.selectedAnswerIndex === question.correctAnswerIndex
      );
    }).length;
    
    return (correctCount / questions.length) * 100;
  };

  // Calculate score and passing status
  const score = calculateScore();
  const isPassed = score >= 70; // 70% is passing threshold

  /**
   * Load quiz data from DynamoDB when component mounts
   * Retrieves quiz metadata and questions, then formats for display
   */
  useEffect(() => {
    async function loadQuizData() {
      try {
        setLoading(true);
        setError(null);
              
        // Step 1: Find quiz record for this lecture
        const { data: quizzes } = await client.models.Quiz.list({
          filter: {
            courseId: { eq: courseId },
            lectureId: { eq: lectureId },
          },
        });

        if (!quizzes || quizzes.length === 0) {
          setQuestions([]);
          setError("No quiz found for this lecture.");
          return;
        }

        // Use the first available quiz
        const quiz = quizzes[0];
        setQuizId(quiz.quizId);
        
        // Get question IDs assigned to this quiz
        const questionIds = quiz.questionIds || [];
        
        if (questionIds.length === 0) {
          setQuestions([]);
          setError("No questions assigned to this quiz.");
          return;
        }
        
        // Step 2: Fetch each question by ID
        const questionPromises = questionIds
          .filter((id): id is string => id !== null && id !== undefined)
          .map(id => client.models.QuizQuestion.get({ id }));
        
        const questionResults = await Promise.all(questionPromises);
        const questionRecords = questionResults
          .filter(result => result.data !== null)
          .map(result => result.data);
        
        if (!questionRecords || questionRecords.length === 0) {
          setQuestions([]);
          setError("Could not load questions for this quiz.");
          return;
        }
        
        // Transform database records to component-friendly format
        const transformedQuestions: QuizQuestion[] = questionRecords.map((item) => {
          return {
            id: item?.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
            question: item?.question || 'Question text unavailable',
            answerChoices: (item?.options || ['Option A', 'Option B', 'Option C', 'Option D'])
              .filter((option): option is string => option !== null),
            correctAnswerIndex: item?.options ? item.options.indexOf(item.answer) : 0,
            explanation: item?.explanation || 'No explanation available',
          };
        });
        
        // Randomize question order for each quiz attempt
        const shuffledQuestions = shuffleArray(transformedQuestions);
        setQuestions(shuffledQuestions);
        
        // Initialize user answers array with null selections
        const initialAnswers = shuffledQuestions.map(q => ({
          questionId: q.id,
          selectedAnswerIndex: null,
        }));
        setUserAnswers(initialAnswers);
        
      } catch (err: any) {
        console.error('Error loading quiz data:', err);
        setError(err.message || 'Failed to load quiz data.');
      } finally {
        setLoading(false);
      }
    }

    loadQuizData();
  }, [courseId, lectureId]);

  /**
   * Randomize array order using Fisher-Yates shuffle algorithm
   */
  const shuffleArray = (array: QuizQuestion[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  /**
   * Update user's answer selection for current question
   */
  const handleAnswerSelect = (answerIndex: number) => {
    if (isSubmitted) return;

    const currentQ = questions[currentQuestionIndex];
    setUserAnswers((prev) =>
      prev.map((ua) =>
        ua.questionId === currentQ.id
          ? { ...ua, selectedAnswerIndex: answerIndex }
          : ua
      )
    );
  };

  // Question navigation handlers
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  /**
   * Submit the completed quiz for grading and record results
   */
  const handleSubmitQuiz = () => {
    setIsSubmitted(true);
    handleQuizCompletion(score);
  };

  /**
   * Reset the quiz to initial state for retaking
   */
  const handleRestartQuiz = () => {
    setIsSubmitted(false);
    setCurrentQuestionIndex(0);
    setUserAnswers((prev) =>
      prev.map((ans) => ({ ...ans, selectedAnswerIndex: null }))
    );
  };

  /**
   * Get an authenticated client for making API calls
   * Uses the user's current session token
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
   * Save quiz results to the user's progress record
   * Creates or updates progress information in DynamoDB
   */
  const updateUserProgress = async (score: number) => {
    if (!user || !courseId || !lectureId || !quizId) {
      console.error('Missing required data to update progress', {
        user: !!user,
        courseId,
        lectureId,
        quizId
      });
      return;
    }
  
    try {
      // Get authenticated client for user operations
      const authClient = await getAuthenticatedClient();
      
      // Check for existing progress record
      const { data: existingProgress } = await authClient.models.UserProgress.list({
        filter: {
          userId: { eq: user.username },
          courseId: { eq: courseId }
        }
      });
  
      const currentDate = new Date().toISOString();
  
      if (existingProgress && existingProgress.length > 0) {
        // Update existing progress record
        const progress = existingProgress[0];
        
        // Parse existing quiz scores (handles both string and object formats)
        let quizScores = {};
        try {
          if (progress.quizScores) {
            if (typeof progress.quizScores === 'string') {
              quizScores = JSON.parse(progress.quizScores);
            } else {
              quizScores = progress.quizScores;
            }
          }
        } catch (e) {
          console.error('Error parsing existing quizScores', e);
        }
        
        // Add or update this quiz score
        const quizData = {
          score: score,
          passed: score >= 70,
          lectureId: lectureId,
          timeCompleted: currentDate
        };
        quizScores = {
          ...quizScores,
          [quizId]: quizData
        };
  
        // Mark lecture as completed if not already
        let completedLectures = progress.completedLectures || [];
        if (!completedLectures.includes(lectureId)) {
          completedLectures = [...completedLectures, lectureId];
        }
  
        // Update the progress record
        await authClient.models.UserProgress.update({
          id: progress.id,
          completedLectures,
          quizScores: JSON.stringify(quizScores),
          lastAccessed: currentDate
        });
        
      } else {
        // Create new progress record for first-time completions
        const quizData = {
          score: score,
          passed: score >= 70,
          lectureId: lectureId,
          timeCompleted: currentDate
        };
        const quizScores = {
          [quizId]: quizData
        };
  
        await authClient.models.UserProgress.create({
          userId: user.username,
          courseId,
          lectureId,
          completedLectures: [lectureId],
          quizScores: JSON.stringify(quizScores),
          lastAccessed: currentDate
        });
      }
    } catch (error) {
      console.error('Error updating user progress:', error);
    }
  };
  
  /**
   * Handle quiz completion by updating progress and notifying parent
   */
  const handleQuizCompletion = (score: number) => {
    // Save results to user profile
    updateUserProgress(score);
    
    // Notify parent component if callback provided
    if (onQuizSubmit && quizId) {
      onQuizSubmit(score, quizId);
    }
  };

  // Check if all questions have answers selected
  const allQuestionsAnswered = userAnswers.every(
    (ans) => ans.selectedAnswerIndex !== null
  );

  // --- Render different component states ---
  
  if (loading) {
    return <div className="quiz-loading">Loading quiz questions...</div>;
  }

  if (error) {
    return <div className="quiz-error">{error}</div>;
  }

  // Show results view after submission
  if (isSubmitted) {
    return (
      <QuizResults
        questions={questions}
        userAnswers={userAnswers}
        score={score}
        isPassed={isPassed}
        onRestartQuiz={handleRestartQuiz}
        courseId={courseId}
      />
    );
  }

  // Handle edge cases
  if (!questions.length) {
    return <div className="quiz-empty">No questions available for this quiz</div>;
  }

  // Get current question and answer state
  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return <div className="quiz-error">Question data is invalid</div>;
  }

  const currentAnswer = userAnswers.find(a => a.questionId === currentQuestion.id);

  // Render the active quiz interface
  return (
    <div className="quiz-container">
      <QuestionCard
        question={currentQuestion}
        selectedAnswerIndex={currentAnswer?.selectedAnswerIndex ?? null}
        onAnswerSelect={handleAnswerSelect}
        isSubmitted={isSubmitted}
      />
      
      <QuizNavigation
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={questions.length}
        goToNextQuestion={goToNextQuestion}
        goToPreviousQuestion={goToPreviousQuestion}
        canSubmit={allQuestionsAnswered}
        onSubmit={handleSubmitQuiz}
        isSubmitted={isSubmitted}
      />
    </div>
  );
};

export default QuizContainer;
