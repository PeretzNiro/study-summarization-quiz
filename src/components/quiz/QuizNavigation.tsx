import React from 'react';

interface QuizNavigationProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  goToNextQuestion: () => void;
  goToPreviousQuestion: () => void;
  canSubmit: boolean;
  onSubmit: () => void;
  isSubmitted: boolean;
}

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
      <div className="quiz-progress">
        Question {currentQuestionIndex + 1} of {totalQuestions}
      </div>
      
      <div className="quiz-buttons">
        <button 
          onClick={goToPreviousQuestion}
          disabled={currentQuestionIndex === 0 || isSubmitted}
          className="amplify-button amplify-button--primary--overlay"
        >
          Previous
        </button>
        
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