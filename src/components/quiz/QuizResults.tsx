import React from 'react';
import { QuizQuestion, UserAnswer } from './types';

interface QuizResultsProps {
  questions: QuizQuestion[];
  userAnswers: UserAnswer[];
  score: number;
  isPassed: boolean;
  onRestartQuiz: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({
  questions,
  userAnswers,
  score,
  isPassed,
  onRestartQuiz
}) => {
  return (
    <div className="quiz-results">
      <h2>Quiz Results</h2>
      
      <div className={`score-summary ${isPassed ? 'passed' : 'failed'}`}>
        <h3>Your Score: {score.toFixed(1)}%</h3>
        <p>{isPassed ? '🎉 Congratulations! You passed!' : '❌ You did not pass. Try again!'}</p>
      </div>
      
      <button onClick={onRestartQuiz} className="btn btn-primary">
        Take Quiz Again
      </button>
      
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