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

        // Use the first quiz we find
        const quiz = quizzes[0];
        
        // Save the quizId for later use
        setQuizId(quiz.quizId);
        
        // Extract question IDs from the quiz
        const questionIds = quiz.questionIds || [];
        
        if (questionIds.length === 0) {
          setQuestions([]);
          setError("No questions assigned to this quiz.");
          return;
        }
        
        // Step 2: Get only the specific questions listed in the quiz
        const questionPromises = questionIds
          .filter((id): id is string => id !== null && id !== undefined) // Filter out null/undefined values
          .map(id => 
            client.models.QuizQuestion.get({ id })
          );
        
        const questionResults = await Promise.all(questionPromises);
        const questionRecords = questionResults
          .filter(result => result.data !== null)
          .map(result => result.data);
        
        if (!questionRecords || questionRecords.length === 0) {
          setQuestions([]);
          setError("Could not load questions for this quiz.");
          return;
        }
        
        // Transform the quiz questions to our format
        const transformedQuestions: QuizQuestion[] = questionRecords.map((item) => {
          return {
            id: item?.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
            question: item?.question || 'Question text unavailable',
            answerChoices: (item?.options || ['Option A', 'Option B', 'Option C', 'Option D']).filter((option): option is string => option !== null),
            correctAnswerIndex: item?.options ? item.options.indexOf(item.answer) : 0,
            explanation: item?.explanation || 'No explanation available',
          };
        });
        
        // After fetching and transforming questions, before setting them in state
        // Shuffle the questions array for randomized order
        const shuffleArray = (array: QuizQuestion[]) => {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        };

        // Randomize the questions
        const randomizedQuestions = shuffleArray(transformedQuestions);
        setQuestions(randomizedQuestions);
        
        // Initialize user answers
        const initialAnswers = randomizedQuestions.map(q => ({
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
  
        // Update the progress record without storing the return value
        await authClient.models.UserProgress.update({
          id: progress.id,
          completedLectures,
          quizScores: JSON.stringify(quizScores),
          lastAccessed: currentDate
        });
        
      } else {
        // Create new progress record without storing the return value
        const quizScores = {
          [quizId]: {
            score,
            completedAt: currentDate,
            passed: score >= 70
          }
        };
  
        await authClient.models.UserProgress.create({
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
