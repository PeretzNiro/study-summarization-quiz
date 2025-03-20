import { DynamoDB } from "aws-sdk";
import { generateQuizQuestions } from "./quizGenerator";
import type { Handler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';

/**
 * Lambda handler function for quiz generation
 */
export const handler: Handler = async (event: any) => {
  console.log("Starting quiz generator Lambda function");
  
  try {
    // Extract parameters from event
    let content, courseId, lectureId, itemId, summary;
    
    if (event.Records && event.Records.length > 0 && event.Records[0].body) {
      // From SQS
      const body = JSON.parse(event.Records[0].body);
      content = body.content;
      courseId = body.courseId;
      lectureId = body.lectureId;
      itemId = body.id;
      summary = body.summary;
    } else if (event.body) {
      // From API Gateway
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      content = body.content;
      courseId = body.courseId;
      lectureId = body.lectureId;
      itemId = body.id;
      summary = body.summary;
    } else {
      // Direct invocation
      content = event.content;
      courseId = event.courseId;
      lectureId = event.lectureId;
      itemId = event.id;
      summary = event.summary;
    }
    
    if (!content && !summary) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required parameter: content or summary' })
      };
    }

    // Use summary if available, otherwise use content
    const textToProcess = summary || content;
    
    // Access API key directly from environment
    console.log("Accessing Gemini API key from environment");
    const apiKey = process.env.GEMINI_API_KEY; // This is set by the secret() function
    
    if (!apiKey) {
      console.log("API key not found in environment");
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'API key not configured' })
      };
    }
    
    console.log("API key accessed successfully");
    
    // Generate quiz questions
    console.log("Generating quiz questions...");
    const questionCount = event.questionCount || 10;
    const startTime = Date.now();
    const quizQuestions = await generateQuizQuestions(textToProcess, apiKey, questionCount);
    const endTime = Date.now();
    console.log(`Quiz questions generated in ${(endTime - startTime) / 1000} seconds`);
    
    if (!quizQuestions || (typeof quizQuestions === 'string' && quizQuestions.startsWith("Error:"))) {
      console.log(`Error generating quiz questions: ${quizQuestions}`);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: quizQuestions || 'Failed to generate quiz questions' })
      };
    }
    
    // Store the quiz questions in DynamoDB if we have course and lecture IDs
    if (courseId && lectureId && Array.isArray(quizQuestions)) {
      console.log(`Storing ${quizQuestions.length} quiz questions for course ${courseId}, lecture ${lectureId}`);
      const dynamoDB = new DynamoDB.DocumentClient();
      const tableName = process.env.QUIZ_QUESTION_TABLE_NAME || 'QuizQuestion-dev';
      
      try {
        // Prepare quiz questions for batch write
        const questionIds: string[] = [];
        
        // Process each question
        for (const question of quizQuestions) {
          // Get current timestamp
          const now = new Date().toISOString();
          
          // Generate the ID once and store it for later use
          const questionId = uuidv4();
          questionIds.push(questionId); // Add to array immediately
          
          // Create the item to insert with the explicit ID
          const item = {
            id: questionId,
            courseId: courseId,
            lectureId: lectureId,
            question: question.question || '',
            options: question.options || [],
            answer: question.answer || '',
            explanation: question.explanation || '',
            difficulty: question.difficulty || 'medium',
            topicTag: question.topicTag || 'general',
            reviewStatus: 'pending',
            isApproved: false,
            createdAt: now,
            updatedAt: now,
            __typename: 'QuizQuestion'
          };
          
          // Put the item directly
          await dynamoDB.put({
            TableName: tableName,
            Item: item
          }).promise();
        }
        
        console.log(`Successfully stored ${quizQuestions.length} quiz questions`);
        console.log(`Question IDs: ${questionIds.join(', ')}`);
        
        // Create default quiz in Quiz table
        try {
          const quizTableName = process.env.QUIZ_TABLE_NAME || 'Quiz-dev';
          
          // Let's create a new quiz with auto-generated ID
          const quizItem = {
            id: uuidv4(), // Add an explicit ID
            courseId: courseId,
            lectureId: lectureId,
            quizId: `quiz-1`, // Always start with quiz-1 for simplicity
            title: 'Lecture Quiz',
            description: 'Automatically generated quiz for this lecture',
            questionIds: questionIds, 
            passingScore: 70,
            difficulty: 'medium',
            order: 1,
            isPersonalized: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            __typename: 'Quiz'
          };
          
          // Put the quiz item
          await dynamoDB.put({
            TableName: quizTableName,
            Item: quizItem
          }).promise();
          
          console.log('Created quiz-1 with ID:', quizItem.id);
          
        } catch (error) {
          console.error("Error creating quiz:", error);
          // Continue execution
        }
        
      } catch (error) {
        console.error("Error storing quiz questions in DynamoDB:", error);
        // Continue execution - we'll still return the questions
      }
    }
    
    // Return success with the quiz questions
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Quiz questions generated successfully',
        questions: quizQuestions,
        courseId: courseId,
        lectureId: lectureId
      })
    };
    
  } catch (error) {
    console.error("Unexpected error in handler:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Error in quiz generator function: ${errorMessage}` })
    };
  }
};