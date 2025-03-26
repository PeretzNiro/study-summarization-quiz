import React from 'react';
import { Link } from 'react-router-dom';
import { QuizQuestion, UserAnswer } from './types';

interface QuizResultsProps {
  questions: QuizQuestion[];        // List of all quiz questions
  userAnswers: UserAnswer[];        // User's submitted answers
  score: number;                    // Score as a percentage
  isPassed: boolean;                // Whether the user passed the quiz
  onRestartQuiz: () => void;        // Handler for restarting the quiz
  courseId: string;                 // Course identifier for navigation
}

/**
 * Displays quiz results with scoring information and detailed feedback
 * Shows correct/incorrect answers and provides explanations
 */
const QuizResults: React.FC<QuizResultsProps> = ({
  questions,
  userAnswers,
  score,
  isPassed,
  onRestartQuiz,
  courseId
}) => {
  // Calculate number of correct answers
  const correctCount = userAnswers.filter((answer) => {
    const question = questions.find(q => q.id === answer.questionId);
    return question && answer.selectedAnswerIndex === question.correctAnswerIndex;
  }).length;
  
  return (
    <div className="quiz-results">
      {/* Score summary section with pass/fail indicator */}
      <div className={`score-summary ${isPassed ? 'passed' : 'failed'}`}>
        <h2>Quiz Complete!</h2>
        <p className="score">
          Your Score: <strong>{Math.round(score)}%</strong>
        </p>
        <p>
          You answered {correctCount} out of {questions.length} questions correctly.
        </p>
        <p className="status">
          {isPassed ? '🎉 Congratulations! You passed the quiz.' : '😔 You did not pass the quiz. Try again!'}
        </p>
        
        {/* Navigation options */}
        <div className="action-buttons">
          <button onClick={onRestartQuiz} className="amplify-button amplify-button--primary">
            Take Quiz Again
          </button>
          
          <Link to={`/courses/${courseId}`} className="amplify-button amplify-button--primary--overlay">
            Return to Course
          </Link>
        </div>
      </div>
      
      {/* Detailed results section showing each question with feedback */}
      <div className="results-details">
        <h3>Detailed Results</h3>
        
        {questions.map((question, index) => {
          // Find user's answer for this question
          const userAnswer = userAnswers.find(a => a.questionId === question.id);
          const userAnswerIndex = userAnswer?.selectedAnswerIndex;
          const isCorrect = userAnswerIndex !== null && userAnswerIndex === question.correctAnswerIndex;
          
          return (
            <div key={question.id} className={`result-item ${isCorrect ? 'correct' : 'wrong'}`}>
              <h4>Question {index + 1}: {question.question}</h4>
              
              {/* Show user's selected answer */}
              <p>
                <strong>Your Answer:</strong>{' '}
                {userAnswerIndex !== null && userAnswerIndex !== undefined
                  ? question.answerChoices[userAnswerIndex]
                  : 'Not answered'}
              </p>
              
              {/* Show the correct answer */}
              <p>
                <strong>Correct Answer:</strong>{' '}
                {question.answerChoices[question.correctAnswerIndex]}
              </p>
              
              {/* Show explanation for the correct answer */}
              <div className="explanation">
                <strong>Explanation:</strong>
                <p>{question.explanation}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuizResults;