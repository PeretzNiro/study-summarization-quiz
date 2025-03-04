// Define types for our data models
export interface Course {
    courseID: string;
    title: string | null;
    description: string | null;
    difficulty: string | null;
    duration: string | null;
    readonly id: string;
    readonly createdAt: string;
    readonly updatedAt: string;
  }

export interface Lecture {
  lectureID: string;
  courseID: string;
  title: string;
  content: string;
  summary?: string;
  difficulty?: string;
  duration?: string;
}

export interface Quiz {
  id: string;
  courseID: string;
  lectureID: string;
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
  difficulty?: string;
}