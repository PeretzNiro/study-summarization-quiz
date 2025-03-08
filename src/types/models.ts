// Define types for our data models
export interface Course {
  courseId: string;
  title: string | null;
  description: string | null;
  difficulty: string | null;
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Lecture {
  lectureId: string;
  courseId: string;
  title: string;
  content: string;
  summary?: string;
  difficulty?: string;
  duration?: string;
  readonly id?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

// Update your Quiz interface
export interface Quiz {
  id: string;
  courseId: string;
  lectureId: string;
  quizId: string;
  title: string;
  description?: string;
  questionIds: string[];  // This contains IDs, not the actual questions
  passingScore?: number;
  difficulty?: string;
  order?: number;
  isPersonalized?: boolean;
  userId?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

// Add a proper QuizQuestion interface
export interface QuizQuestion {
  id: string;
  courseId: string;
  lectureId: string;
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
  difficulty?: string;
  topicTag?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface UserProgress {
  id?: string;
  userId: string;
  courseId: string;
  lectureId: string;
  completedLectures: string[];
  quizScores: {
    [quizId: string]: number;
  };
  lastAccessed: string;  // ISO timestamp
  readonly createdAt?: string;
  readonly updatedAt?: string;
}