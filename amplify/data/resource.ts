import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/**
 * Data schema definition for the application
 * 
 * This schema defines the core data models and their relationships:
 * - Course: Educational courses containing lectures
 * - Lecture: Learning content with text and summaries
 * - QuizQuestion: Individual assessment questions
 * - Quiz: Collections of questions for assessment
 * - UserProgress: Tracking user activity and completion
 * 
 * Each model includes appropriate authorization rules to control access.
 */
const schema = a.schema({
  Course: a
    .model({
      courseId: a.string().required(),     // Business identifier for the course
      title: a.string(),                   // Display title
      description: a.string(),             // Course description/overview
      difficulty: a.string(),              // Overall difficulty level
    })
    .authorization((allow) => [
      allow.publicApiKey().to(["read"]),   // Anyone can read courses
      allow.groups(["Admins"]).to(["create", "update", "delete", "read"]) // Only Admins can modify
    ]),

  Lecture: a
    .model({
      courseId: a.string().required(),     // Reference to parent course
      lectureId: a.string().required(),    // Identifier within the course
      title: a.string(),                   // Lecture title
      content: a.string(),                 // Raw lecture content
      summary: a.string(),                 // AI-generated summary
      difficulty: a.string(),              // Difficulty level
      duration: a.string(),                // Estimated completion time
      fileName: a.string(),                // Original uploaded file
      fileType: a.string(),                // File format (PDF, PPTX, etc.)
      status: a.string(),                  // Workflow status (draft, pending, approved)
    })
    .authorization((allow) => [
      allow.publicApiKey().to(["read"]),   // Anyone can read lectures
      allow.groups(["Admins"]).to(["create", "update", "delete", "read"]) // Only Admins can modify
    ]),

  QuizQuestion: a
    .model({
      courseId: a.string().required(),     // Reference to course
      lectureId: a.string().required(),    // Reference to lecture
      question: a.string().required(),     // Question text
      options: a.string().array().required(), // Multiple choice options
      answer: a.string().required(),       // Correct answer
      explanation: a.string(),             // Explanation of the answer
      difficulty: a.string().required(),   // "easy", "medium", "hard"
      topicTag: a.string(),                // Topic categorization
      reviewStatus: a.string(),            // "pending", "approved", "rejected"
      isApproved: a.boolean(),             // Flag for approved questions
    })
    .authorization((allow) => [
      allow.publicApiKey().to(["read"]),   // Anyone can read questions
      allow.groups(["Admins"]).to(["create", "update", "delete", "read"]) // Only Admins can modify
    ]),

  Quiz: a
    .model({
      courseId: a.string().required(),     // Reference to course
      lectureId: a.string().required(),    // Reference to lecture
      quizId: a.string().required(),       // Identifier within the lecture
      userId: a.string(),                  // NULL for standard quizzes, user ID for personalized quizzes
      title: a.string().required(),        // Quiz title
      description: a.string(),             // Quiz description or instructions
      questionIds: a.string().array(),     // IDs of questions from the pool
      passingScore: a.integer(),           // Minimum score to pass (percentage)
      difficulty: a.string(),              // Overall difficulty level
      order: a.integer(),                  // Sequence in lecture (1, 2, 3)
      isPersonalized: a.boolean(),         // Flag to identify personalized quizzes
    })
    .authorization((allow) => [
      allow.publicApiKey().to(["read"]),   // Anyone can read quizzes
      allow.groups(["Admins"]).to(["create", "update", "delete", "read"]) // Only Admins can modify
    ]),

  UserProgress: a
    .model({
      userId: a.string().required(),       // Reference to the user
      courseId: a.string().required(),     // Reference to the course
      lectureId: a.string().required(),    // Currently active lecture
      completedLectures: a.string().array(), // List of completed lecture IDs
      quizScores: a.json(),                // Quiz scores as {quizId: score} mapping
      lastAccessed: a.string().required(), // Timestamp of last activity
    })
    .authorization((allow) => [
      allow.owner(),                       // Users can manage their own progress
      allow.groups(["Admins"]).to(["read"]) // Admins can view all progress (for analytics)
    ]),
});

export type Schema = ClientSchema<typeof schema>;

/**
 * Data resource configuration for API access modes
 * 
 * Configures a public API key for read operations
 * while maintaining authenticated access for writes.
 */
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",    // Simplifies frontend access patterns
    apiKeyAuthorizationMode: {
      expiresInDays: 30,                   // API key rotation period
    },
  },
});
