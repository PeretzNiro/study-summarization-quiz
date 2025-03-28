import React from 'react';
import { QuizQuestion } from './types';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface QuestionCardProps {
  question: QuizQuestion;
  selectedAnswerIndex: number | null;
  onAnswerSelect: (answerIndex: number) => void;
  isSubmitted: boolean;
}

/**
 * Determines if content should be treated as markdown
 * @param content - The content to check
 * @returns true if the content contains markdown elements, false otherwise
 */
const shouldRenderAsMarkdown = (content: string) => {
  // Check if the content has special markers or looks like it contains markdown
  // This regex checks for common markdown patterns
  return /```|\$\$.+\$\$|\$[^$]+\$|!\[.*\]\(.*\)|\[.*\]\(.*\)|<table>|<img>|#{1,6}\s|```[a-z]*\n/.test(content);
};

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
          components={{
            // Add responsive table wrapper
            table: ({node, children, ...props}) => (
              <div className="table-wrapper">
                <table {...props}>{children}</table>
              </div>
            ),
            // Syntax highlighting for code blocks
            code({node, inline, className, children, ...props}: {
              node?: any;
              inline?: boolean;
              className?: string;
              children?: React.ReactNode;
              [key: string]: any;
            }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    borderRadius: '8px'
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
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
                />
                <span>
                  {shouldRenderAsMarkdown(choice) ? (
                    // Render as markdown if it contains markdown elements
                    <ReactMarkdown 
                      rehypePlugins={[rehypeRaw, rehypeKatex]}
                      remarkPlugins={[remarkGfm, remarkMath]}
                      components={{
                        // Syntax highlighting for code blocks in answers
                        code({node, inline, className, children, ...props}: {
                          node?: any;
                          inline?: boolean;
                          className?: string;
                          children?: React.ReactNode;
                          [key: string]: any;
                        }) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{
                                borderRadius: '6px',
                                margin: '0.5rem 0'
                              }}
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
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
          >
            {question.explanation}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;