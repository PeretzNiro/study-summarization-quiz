import React from 'react';
import { QuizQuestion } from './types';

interface QuestionCardProps {
  question: QuizQuestion;
  selectedAnswerIndex: number | null;
  onAnswerSelect: (answerIndex: number) => void;
  isSubmitted: boolean;
}

/**
 * Displays a single quiz question with multiple-choice options
 * Handles user selection and shows feedback after submission
 */
const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedAnswerIndex,
  onAnswerSelect,
  isSubmitted
}) => {
  return (
    <div className="question-card">
      <h3 className="question-text">{question.question}</h3>
      
      <div className="answer-choices">
        {question.answerChoices.map((choice, index) => {
          // Determine visual state of each answer choice
          const isSelected = selectedAnswerIndex === index;
          const isCorrect = isSubmitted && index === question.correctAnswerIndex;
          const isWrong = isSubmitted && isSelected && index !== question.correctAnswerIndex;
          
          return (
            <div 
              key={index}
              className={`answer-choice ${isSelected ? 'selected' : ''} 
                ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
            >
              <label>
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={index}
                  checked={selectedAnswerIndex === index}
                  onChange={() => onAnswerSelect(index)}
                  disabled={isSubmitted} // Prevent changing answers after submission
                />
                <span>{choice}</span>
              </label>
            </div>
          );
        })}
      </div>
      
      {/* Show explanation only after quiz submission */}
      {isSubmitted && (
        <div className="explanation">
          <h4>Explanation:</h4>
          <p>{question.explanation}</p>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;