import React, { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

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
        
        const { data: quizRecords, errors } = await client.models.Quiz.list({
          filter: {
            courseId: { eq: courseId },
            lectureId: { eq: lectureId },
          },
        }) as { data: any[], errors?: any };

        if (errors) {
          throw new Error('Failed to load quiz data');
        }
        
        // Add this check for empty quiz records
        if (!quizRecords || quizRecords.length === 0) {
          setQuestions([]);
          setError("No quiz questions found for this lecture.");
          return;
        }

        const transformedQuestions: QuizQuestion[] = quizRecords.map((item) => {
          // Add additional validation for required fields
          if (!item.question || !item.options) {
            console.warn(`Quiz item missing required fields:`, item);
          }
          
          const correctIndex = item.options?.indexOf(item.answer) ?? -1;
          return {
            id: item.id || `question-${Math.random().toString(36).substr(2, 9)}`,
            question: item.question || 'Question text unavailable',
            answerChoices: item.options || [],
            correctAnswerIndex: correctIndex >= 0 ? correctIndex : 0,
            explanation: item.explanation || 'No explanation available',
          };
        });

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

  const handleQuizCompletion = (score: number) => {
    // Existing logic...
    
    // Call the parent handler if provided
    if (onQuizSubmit) {
      onQuizSubmit(score, courseId);
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
