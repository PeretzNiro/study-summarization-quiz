/**
 * Data model definitions for the application's core entities.
 * These interfaces define the structure of data exchanged with the backend.
 */

/**
 * Represents an educational course in the system
 */
export interface Course {
  courseId: string;                // Unique identifier used for API operations
  title: string | null;            // Course title
  description: string | null;      // Course description
  difficulty: string | null;       // Difficulty level (e.g., "Easy", "Medium", "Hard")
  readonly id: string;             // AWS-generated unique identifier
  readonly createdAt: string;      // Timestamp when the course was created
  readonly updatedAt: string;      // Timestamp when the course was last updated
}

/**
 * Represents a lecture within a course
 */
export interface Lecture {
  lectureId: string;               // Unique identifier for the lecture within its course
  courseId: string;                // Reference to the parent course
  title: string;                   // Lecture title
  content: string;                 // Full lecture content text
  summary?: string;                // AI-generated summary of the lecture content
  difficulty?: string;             // Difficulty level specific to this lecture
  duration?: string;               // Estimated time to complete the lecture
  readonly id?: string;            // AWS-generated unique identifier
  readonly createdAt?: string;     // Timestamp when the lecture was created
  readonly updatedAt?: string;     // Timestamp when the lecture was last updated
}

/**
 * Represents a quiz associated with a lecture
 */
export interface Quiz {
  id: string;                      // Unique identifier for the quiz
  courseId: string;                // Reference to the course
  lectureId: string;               // Reference to the lecture this quiz belongs to
  quizId: string;                  // Sequential identifier within the lecture
  title: string;                   // Quiz title
  description?: string;            // Quiz description or instructions
  questionIds: string[];           // References to question records in the QuizQuestion table
  passingScore?: number;           // Minimum score required to pass (percentage)
  difficulty?: string;             // Quiz difficulty level
  order?: number;                  // Display order when multiple quizzes exist
  isPersonalized?: boolean;        // Whether this quiz was personalized for a specific user
  userId?: string;                 // Reference to user if quiz is personalized
  readonly createdAt?: string;     // Timestamp when the quiz was created
  readonly updatedAt?: string;     // Timestamp when the quiz was last updated
}

/**
 * Represents a single quiz question
 */
export interface QuizQuestion {
  id: string;                      // Unique identifier for the question
  courseId: string;                // Reference to the course
  lectureId: string;               // Reference to the lecture this question relates to
  question: string;                // The question text
  options: string[];               // Multiple choice options
  answer: string;                  // Correct answer (matches one of the options)
  explanation?: string;            // Explanation of the correct answer
  difficulty?: string;             // Question difficulty level
  topicTag?: string;               // Topic categorization for the question
  readonly createdAt?: string;     // Timestamp when the question was created
  readonly updatedAt?: string;     // Timestamp when the question was last updated
}

/**
 * Tracks a user's progress through courses and lectures
 */
export interface UserProgress {
  id?: string;                     // Unique identifier for the progress record
  userId: string;                  // Reference to the user
  courseId: string;                // Reference to the course
  lectureId: string;               // Reference to the current lecture
  completedLectures: string[];     // Array of lecture IDs that have been completed
  quizScores: {                    // Record of quiz scores by quiz ID
    [quizId: string]: number;      // Score as a percentage (0-100)
  };
  lastAccessed: string;            // Timestamp when the user last accessed this content
  readonly createdAt?: string;     // Timestamp when the progress record was created
  readonly updatedAt?: string;     // Timestamp when the progress record was last updated
}