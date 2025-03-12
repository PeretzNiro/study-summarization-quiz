import React from 'react';
import { Link } from 'react-router-dom';
import { QuizQuestion, UserAnswer } from './types';

interface QuizResultsProps {
  questions: QuizQuestion[];
  userAnswers: UserAnswer[];
  score: number;
  isPassed: boolean;
  onRestartQuiz: () => void;
  courseId: string; // Add this prop to pass the courseId
}

const QuizResults: React.FC<QuizResultsProps> = ({
  questions,
  userAnswers,
  score,
  isPassed,
  onRestartQuiz,
  courseId
}) => {
  const correctCount = userAnswers.filter((answer) => {
    const question = questions.find(q => q.id === answer.questionId);
    return question && answer.selectedAnswerIndex === question.correctAnswerIndex;
  }).length;
  
  return (
    <div className="quiz-results">
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
        
        <div className="action-buttons">
          <button onClick={onRestartQuiz} className="amplify-button amplify-button--primary">
            Take Quiz Again
          </button>
          
          {/* Add the Return to Course button */}
          <Link to={`/courses/${courseId}`} className="amplify-button amplify-button--primary--overlay">
            Return to Course
          </Link>
        </div>
      </div>
      
      <div className="results-details">
        <h3>Detailed Results</h3>
        
        {questions.map((question, index) => {
          const userAnswer = userAnswers.find(a => a.questionId === question.id);
          const userAnswerIndex = userAnswer?.selectedAnswerIndex;
          const isCorrect = userAnswerIndex !== null && userAnswerIndex === question.correctAnswerIndex;
          
          return (
            <div key={question.id} className={`result-item ${isCorrect ? 'correct' : 'wrong'}`}>
              <h4>Question {index + 1}: {question.question}</h4>
              
              <p>
                <strong>Your Answer:</strong>{' '}
                {userAnswerIndex !== null && userAnswerIndex !== undefined
                  ? question.answerChoices[userAnswerIndex]
                  : 'Not answered'}
              </p>
              
              <p>
                <strong>Correct Answer:</strong>{' '}
                {question.answerChoices[question.correctAnswerIndex]}
              </p>
              
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