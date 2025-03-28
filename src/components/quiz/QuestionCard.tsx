import React from 'react';
import { QuizQuestion } from './types';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { shouldRenderAsMarkdown, getMarkdownComponents } from '../../components/markdown/MarkdownUtils';
interface QuestionCardProps {
  question: QuizQuestion;
  selectedAnswerIndex: number | null;
  onAnswerSelect: (answerIndex: number) => void;
  isSubmitted: boolean;
}

/**
 * Displays a single quiz question with multiple-choice options
 * Handles user selection and shows feedback after submission
 * Supports markdown formatting in question text
 */
const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedAnswerIndex,
  onAnswerSelect,
  isSubmitted
}) => {
  return (
    <div className="question-card">
      {/* Render question text as markdown */}
      <div className="question-text">
        <ReactMarkdown 
          rehypePlugins={[rehypeRaw, rehypeKatex]}
          remarkPlugins={[remarkGfm, remarkMath]}
          components={getMarkdownComponents()}
        >
          {question.question}
        </ReactMarkdown>
      </div>
      
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
                  aria-label={`Answer option ${index + 1}: ${choice.substring(0, 20)}${choice.length > 20 ? '...' : ''}`}
                />
                <span>
                  {shouldRenderAsMarkdown(choice) ? (
                    // Render as markdown if it contains markdown elements
                    <ReactMarkdown 
                      rehypePlugins={[rehypeRaw, rehypeKatex]}
                      remarkPlugins={[remarkGfm, remarkMath]}
                      components={getMarkdownComponents()}
                    >
                      {choice}
                    </ReactMarkdown>
                  ) : (
                    // Render as plain text to avoid markdown parsing
                    choice
                  )}
                </span>
              </label>
            </div>
          );
        })}
      </div>
      
      {/* Show explanation only after quiz submission */}
      {isSubmitted && (
        <div className="explanation">
          <h4>Explanation:</h4>
          {/* Render explanation as markdown */}
          <ReactMarkdown 
            rehypePlugins={[rehypeRaw, rehypeKatex]}
            remarkPlugins={[remarkGfm, remarkMath]}
            components={getMarkdownComponents()}
          >
            {question.explanation}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;