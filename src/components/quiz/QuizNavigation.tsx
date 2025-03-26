import React from 'react';

interface QuizNavigationProps {
  currentQuestionIndex: number;     // Zero-based index of the current question
  totalQuestions: number;           // Total number of questions in the quiz
  goToNextQuestion: () => void;     // Handler for navigating to the next question
  goToPreviousQuestion: () => void; // Handler for navigating to the previous question
  canSubmit: boolean;               // Whether all questions are answered and quiz can be submitted
  onSubmit: () => void;             // Handler for submitting the completed quiz
  isSubmitted: boolean;             // Whether the quiz has been submitted
}

/**
 * Quiz navigation component that provides controls for moving between questions
 * and submitting the quiz when complete
 */
const QuizNavigation: React.FC<QuizNavigationProps> = ({
  currentQuestionIndex,
  totalQuestions,
  goToNextQuestion,
  goToPreviousQuestion,
  canSubmit,
  onSubmit,
  isSubmitted
}) => {
  return (
    <div className="quiz-navigation">
      {/* Display the current question number and total */}
      <div className="quiz-progress">
        Question {currentQuestionIndex + 1} of {totalQuestions}
      </div>
      
      <div className="quiz-buttons">
        {/* Previous button - disabled on first question or after submission */}
        <button 
          onClick={goToPreviousQuestion}
          disabled={currentQuestionIndex === 0 || isSubmitted}
          className="amplify-button amplify-button--primary--overlay"
        >
          Previous
        </button>
        
        {/* 
          Show Next button if not on last question
          Show Submit button if on last question and not yet submitted
          Show no button if already submitted
        */}
        {currentQuestionIndex < totalQuestions - 1 ? (
          <button 
            onClick={goToNextQuestion}
            className="amplify-button amplify-button--primary"
            disabled={isSubmitted}
          >
            Next
          </button>
        ) : !isSubmitted ? (
          <button 
            onClick={onSubmit}
            disabled={!canSubmit}
            className="btn btn-success"
          >
            Submit Quiz
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default QuizNavigation;