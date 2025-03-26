/**
 * Type definitions for the quiz component system
 */

/**
 * Represents a single quiz question with its content and metadata
 */
export interface QuizQuestion {
  id: string;                       // Unique identifier for the question
  question: string;                 // The actual question text
  answerChoices: string[];          // Array of possible answers
  correctAnswerIndex: number;       // Zero-based index of the correct answer in answerChoices
  explanation: string;              // Explanation of why the correct answer is right
}

/**
 * Tracks a user's response to a specific question
 */
export interface UserAnswer {
  questionId: string;               // References the question being answered
  selectedAnswerIndex: number | null; // The user's selected answer (null if unanswered)
}

/**
 * Manages the overall state of an active quiz session
 */
export interface QuizState {
  questions: QuizQuestion[];        // All questions in the current quiz
  userAnswers: UserAnswer[];        // User's answers to each question
  currentQuestionIndex: number;     // Index of the currently displayed question
  isSubmitted: boolean;             // Whether the quiz has been submitted for grading
  isLoading: boolean;               // Loading state for async operations
  error: string | null;             // Error message if something goes wrong
}

/**
 * Represents the database schema for quiz questions
 * Used for data fetching and persistence operations
 */
export interface QuizRecord {
  id: string;                       // Unique identifier
  courseId: string;                 // Associated course
  lectureId: string;                // Associated lecture
  question: string;                 // Question text
  options: string[];                // Answer choices
  answer: string;                   // The correct answer (text)
  explanation?: string;             // Optional explanation
  difficulty?: string;              // Optional difficulty level
}