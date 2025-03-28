import React from 'react';
import { Link } from 'react-router-dom';
import { QuizQuestion, UserAnswer } from './types';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface QuizResultsProps {
  questions: QuizQuestion[];        // List of all quiz questions
  userAnswers: UserAnswer[];        // User's submitted answers
  score: number;                    // Score as a percentage
  isPassed: boolean;                // Whether the user passed the quiz
  onRestartQuiz: () => void;        // Handler for restarting the quiz
  courseId: string;                 // Course identifier for navigation
}

/**
 * Determines if content should be treated as markdown
 * @param content - The content to check
 * @returns true if the content contains markdown elements, false otherwise
 */
const shouldRenderAsMarkdown = (content: string) => {
  // Check if the content has special markers or looks like it contains markdown
  return /```|\$\$.+\$\$|\$[^$]+\$|!\[.*\]\(.*\)|\[.*\]\(.*\)|<table>|<img>|#{1,6}\s|```[a-z]*\n/.test(content);
};

/**
  * Displays markdown or plain text based on content type
  * @param children - The content to render
  * @returns JSX element with either markdown or plain text
  */
const MarkdownOrText = ({ children }: { children: string }) => (
  shouldRenderAsMarkdown(children) ? (
    <ReactMarkdown 
      rehypePlugins={[rehypeRaw, rehypeKatex]}
      remarkPlugins={[remarkGfm, remarkMath]}
      components={{
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
      {children}
    </ReactMarkdown>
  ) : (
    // Just output as plain text if it doesn't look like markdown
    <span>{children}</span>
  )
);

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
              {/* Render question as markdown */}
              <h4>Question {index + 1}:</h4>
              <div className="question-text">
                <ReactMarkdown 
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                  remarkPlugins={[remarkGfm, remarkMath]}
                >
                  {question.question}
                </ReactMarkdown>
              </div>
              
              {/* Show user's selected answer */}
              <p>
                <strong>Your Answer:</strong>{' '}
                {userAnswerIndex !== null && userAnswerIndex !== undefined ? (
                  <div className="answer-text">
                    <MarkdownOrText>
                      {question.answerChoices[userAnswerIndex]}
                    </MarkdownOrText>
                  </div>
                ) : (
                  'Not answered'
                )}
              </p>
              
              {/* Show the correct answer */}
              <p>
                <strong>Correct Answer:</strong>{' '}
                <div className="answer-text">
                  <MarkdownOrText>
                    {question.answerChoices[question.correctAnswerIndex]}
                  </MarkdownOrText>
                </div>
              </p>
              
              {/* Show explanation for the correct answer */}
              <div className="explanation">
                <strong>Explanation:</strong>
                <ReactMarkdown 
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                  remarkPlugins={[remarkGfm, remarkMath]}
                >
                  {question.explanation}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuizResults;