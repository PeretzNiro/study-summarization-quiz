export interface QuizQuestion {
  id: string;
  question: string;
  answerChoices: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface UserAnswer {
  questionId: string;
  selectedAnswerIndex: number | null;
}

export interface QuizState {
  questions: QuizQuestion[];
  userAnswers: UserAnswer[];
  currentQuestionIndex: number;
  isSubmitted: boolean;
  isLoading: boolean;
  error: string | null;
}

// Add this interface to match your DynamoDB schema
export interface QuizRecord {
  id: string;
  courseID: string;
  lectureID: string;
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
  difficulty?: string;
}