import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  Course: a
    .model({
      courseId: a.string().required(),
      title: a.string(),
      description: a.string(),
      difficulty: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  Lecture: a
    .model({
      courseId: a.string().required(),
      lectureId: a.string().required(),
      title: a.string(),
      content: a.string(),
      summary: a.string(),
      difficulty: a.string(),
      duration: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  QuizQuestion: a
    .model({
      courseId: a.string().required(),
      lectureId: a.string().required(),
      question: a.string().required(),
      options: a.string().array().required(),
      answer: a.string().required(),
      explanation: a.string(),
      difficulty: a.string().required(),  // "easy", "medium", "hard"
      topicTag: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  Quiz: a
    .model({
      courseId: a.string().required(),
      lectureId: a.string().required(),
      quizId: a.string().required(),       // e.g., "quiz1", "quiz2", "quiz3"
      userId: a.string(),                  // NULL for standard quizzes, user ID for personalized quizzes
      title: a.string().required(),        // e.g., "Basic Concepts Quiz"
      description: a.string(),             // e.g., "Test your understanding of basic concepts"
      questionIds: a.string().array(),     // IDs of questions from the pool
      passingScore: a.integer(),           // e.g., 70 (percent)
      difficulty: a.string(),              // Overall difficulty level
      order: a.integer(),                  // Sequence in lecture (1, 2, 3)
      isPersonalized: a.boolean(),         // Flag to identify personalized quizzes
    })
    .authorization((allow) => [allow.publicApiKey()]),

  UserProgress: a
    .model({
      userId: a.string().required(),
      courseId: a.string().required(),
      lectureId: a.string().required(),
      completedLectures: a.string().array(),
      quizScores: a.json(), // Store quiz scores as JSON object
      lastAccessed: a.string().required(),
    })
    .authorization((allow) => [
      // Allow owners to read/write their own progress
      allow.owner(),
      // Allow admins to read all progress
      allow.groups(["admin"]).to(["read"]),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
