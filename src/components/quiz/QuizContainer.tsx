import React, { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { useAuthenticator } from '@aws-amplify/ui-react'; // Add this import
// Import auth session
import { fetchAuthSession } from 'aws-amplify/auth';

// Child components
import QuestionCard from './QuestionCard';
import QuizNavigation from './QuizNavigation';
import QuizResults from './QuizResults';

import { QuizQuestion, UserAnswer } from './types';
import './Quiz.css';

const client = generateClient<Schema>();

interface QuizContainerProps {
  courseId: string;   // We’ll fetch all Quiz items matching this courseId
  lectureId: string;  // and this lectureId
  onQuizSubmit?: (score: number, quizId: string) => void;
}

const QuizContainer: React.FC<QuizContainerProps> = ({ courseId, lectureId, onQuizSubmit }) => {
  // Add user from Authenticator
  const { user } = useAuthenticator((context) => [context.user]);
  
  // Add state for quiz ID
  const [quizId, setQuizId] = useState<string | null>(null);
  
  // -- State --
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Loading & error handling
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -- Derive current score & pass/fail
  const calculateScore = (): number => {
    if (questions.length === 0) return 0;
    const correctCount = userAnswers.filter((answer) => {
      const question = questions.find(q => q.id === answer.questionId);
      return (
        question && 
        answer.selectedAnswerIndex === question.correctAnswerIndex
      );
    }).length;
    return (correctCount / questions.length) * 100;
  };

  const score = calculateScore();
  const isPassed = score >= 70;

  // -- Load Quiz Records from DynamoDB (via models.Quiz) --
  useEffect(() => {
    async function loadQuizData() {
      try {
        setLoading(true);
        setError(null);
                
        // Step 1: Get quiz records for this lecture
        const { data: quizzes } = await client.models.Quiz.list({
          filter: {
            courseId: { eq: courseId },
            lectureId: { eq: lectureId },
          },
        });


        // Check if we have any quizzes
        if (!quizzes || quizzes.length === 0) {
          setQuestions([]);
          setError("No quiz found for this lecture.");
          return;
        }

        // Use the first quiz we find (most common case)
        const quiz = quizzes[0];
        
        // Save the quizId for later use
        setQuizId(quiz.quizId);
        
        // Check if we have question IDs
        if (!quiz.questionIds || quiz.questionIds.length === 0) {
          setQuestions([]);
          setError("This quiz has no questions.");
          return;
        }

        // Handle questionIds in different formats
        let questionIds = quiz.questionIds || [];

        // More robust type checking
        if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
          // Check if first item is an object with an 'S' property (DynamoDB format)
          const firstItem = questionIds[0];
          if (firstItem && typeof firstItem === 'object' && firstItem !== null && 'S' in firstItem) {
            questionIds = questionIds.map((id: any) => id.S || '');
          }
        }

        // Then use questionIds in your promises with better error handling
        const questionPromises = questionIds.map(async (questionId) => {
          try {
            if (!questionId) {
              console.warn('Empty question ID encountered');
              return null;
            }
            const result = await client.models.QuizQuestion.get({
              id: questionId
            });
            if (!result) {
              console.warn(`Question not found with ID: ${questionId}`);
            }
            return result;
          } catch (err) {
            console.error(`Failed to fetch question with ID: ${questionId}`, err);
            return null; // Return null for failed fetches
          }
        });

        const questionRecords = await Promise.all(questionPromises);
        
        // Filter out any null results before transforming
        const validQuestionRecords = questionRecords.filter(record => record !== null);

        if (validQuestionRecords.length === 0) {
          setError("No valid questions could be found for this quiz.");
          setQuestions([]);
          return;
        }
        
        // Transform the quiz questions to our format with better error handling
        const transformedQuestions: QuizQuestion[] = validQuestionRecords.map((item) => {
          if (!item) {
            console.error('Null item in validQuestionRecords after filtering');
            return null;
          }
          
          // Handle options with better error checking
          let options = item.data?.options || []; // Default to empty array if undefined
          
          // More robust check for DynamoDB format
          if (options && Array.isArray(options) && options.length > 0) {
            const firstOption = options[0];
            if (firstOption && typeof firstOption === 'object' && firstOption !== null && 'S' in firstOption) {
              options = options.map((opt: any) => opt.S || '');
            }
          }
          
          // Ensure options is always an array of strings
          if (!Array.isArray(options)) {
            console.error('Options is not an array:', options);
            options = ['Option A', 'Option B', 'Option C', 'Option D']; // Fallback options
          }
          
          // Find correct answer index with better handling
          let correctIndex = -1;
          if (item.data?.answer && options && options.length > 0) {
            correctIndex = options.indexOf(item.data.answer);
            if (correctIndex === -1) {
              console.warn(`Answer "${item.data.answer}" not found in options for question ${item.data?.id}`);
              // Default to first option if answer not in options
              correctIndex = 0;
            }
          } else {
            console.warn(`Missing answer or options for question ${item.data?.id || 'unknown'}`);
            correctIndex = 0; // Default
          }
          
          return {
            id: item.data?.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
            question: item.data?.question || 'Question text unavailable',
            answerChoices: options,
            correctAnswerIndex: correctIndex,
            explanation: item.data?.explanation || 'No explanation available',
          };
        }).filter(q => q !== null) as QuizQuestion[]; // Filter out any nulls

        
        if (transformedQuestions.length === 0) {
          setError("Failed to process questions for this quiz.");
          return;
        }
        
        setQuestions(transformedQuestions);
        
        // Initialize user answers
        const initialAnswers = transformedQuestions.map(q => ({
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

  // -- Answer selection logic --
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

  // -- Navigation logic --
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

  // -- Submit / Restart
  const handleSubmitQuiz = () => {
    setIsSubmitted(true);
    handleQuizCompletion(score);
  };

  const handleRestartQuiz = () => {
    setIsSubmitted(false);
    setCurrentQuestionIndex(0);
    setUserAnswers((prev) =>
      prev.map((ans) => ({ ...ans, selectedAnswerIndex: null }))
    );
  };

  // Add a function to update user progress
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
      // Get authenticated client
      const authClient = await getAuthenticatedClient();
      
      // First, try to get the existing progress
      const { data: existingProgress } = await authClient.models.UserProgress.list({
        filter: {
          userId: { eq: user.username },
          courseId: { eq: courseId }
        }
      });
  
      const currentDate = new Date().toISOString();
  
      if (existingProgress && existingProgress.length > 0) {
        // Update existing progress
        const progress = existingProgress[0];
        
        // Safely parse existing quizScores
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
        quizScores = {
          ...quizScores,
          [quizId]: {
            score,
            completedAt: currentDate,
            passed: score >= 70
          }
        };
  
        // Update completedLectures to include current lecture
        let completedLectures = progress.completedLectures || [];
        if (!completedLectures.includes(lectureId)) {
          completedLectures = [...completedLectures, lectureId];
        }
  
        // Update the progress record
  
        const updated = await authClient.models.UserProgress.update({
          id: progress.id,
          completedLectures,
          quizScores: JSON.stringify(quizScores),
          lastAccessed: currentDate
        });
        
      } else {
        // Create new progress record
        const quizScores = {
          [quizId]: {
            score,
            completedAt: currentDate,
            passed: score >= 70
          }
        };
  
        const created = await authClient.models.UserProgress.create({
          userId: user.username,
          courseId,
          lectureId,
          completedLectures: [lectureId], // Include current lecture
          quizScores: JSON.stringify(quizScores),
          lastAccessed: currentDate
        });
        
      }
    } catch (error) {
      console.error('Error updating user progress:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  };
  

  // Modify handleQuizCompletion to update user progress
  const handleQuizCompletion = (score: number) => {
    // Update user progress when quiz is submitted
    updateUserProgress(score);
    
    // Call the parent handler if provided
    if (onQuizSubmit && quizId) {
      onQuizSubmit(score, quizId);
    }
  };

  // Check if all questions are answered
  const allQuestionsAnswered = userAnswers.every(
    (ans) => ans.selectedAnswerIndex !== null
  );

  // -- Render States --
  if (loading) {
    return <div className="quiz-loading">Loading quiz questions...</div>;
  }

  if (error) {
    return <div className="quiz-error">{error}</div>;
  }

  // Show quiz results if submitted
  if (isSubmitted) {
    return (
      <QuizResults
        questions={questions}
        userAnswers={userAnswers}
        score={score}
        isPassed={isPassed}
        onRestartQuiz={handleRestartQuiz}
        courseId={courseId} // Pass the courseId prop
      />
    );
  }

  // Add these additional checks
  if (!questions.length) {
    return <div className="quiz-empty">No questions available for this quiz</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return <div className="quiz-error">Question data is invalid</div>;
  }

  const currentAnswer = userAnswers.find(a => a.questionId === currentQuestion.id);

  // Now render the quiz components
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
