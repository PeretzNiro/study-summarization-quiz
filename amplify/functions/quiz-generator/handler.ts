import { DynamoDB } from "aws-sdk";
import { generateQuizQuestions } from "./quizGenerator";
import type { Handler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';

/**
 * Lambda handler function for quiz generation
 * Processes events from SQS, API Gateway, or direct invocation
 * Generates quiz questions and stores them in DynamoDB
 */
export const handler: Handler = async (event: any) => {
  console.log("Starting quiz generator Lambda function");
  
  try {
    // Extract parameters from event based on source
    let content, courseId, lectureId, itemId, summary, title, duration;
    
    if (event.Records && event.Records.length > 0 && event.Records[0].body) {
      // From SQS queue (typically triggered by summarization)
      const body = JSON.parse(event.Records[0].body);
      content = body.content;
      courseId = body.courseId;
      lectureId = body.lectureId;
      itemId = body.id;
      summary = body.summary;
      title = body.title;
      duration = body.duration;
    } else if (event.body) {
      // From API Gateway (direct HTTP request)
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      content = body.content;
      courseId = body.courseId;
      lectureId = body.lectureId;
      itemId = body.id;
      summary = body.summary;
      title = body.title;
      duration = body.duration;
    } else {
      // Direct Lambda invocation (function-to-function)
      content = event.content;
      courseId = event.courseId;
      lectureId = event.lectureId;
      itemId = event.id;
      summary = event.summary;
      title = event.title;
      duration = event.duration;
    }
    
    // Validate required parameters
    if (!content && !summary) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required parameter: content or summary' })
      };
    }

    // Prefer using summary over raw content for better questions
    const textToProcess = summary || content;
    
    // Get the API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.log("API key not found in environment");
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'API key not configured' })
      };
    }
    
    // Generate questions with AI
    const questionCount = event.questionCount || 10;
    const startTime = Date.now();
    const quizQuestions = await generateQuizQuestions(textToProcess, apiKey, questionCount);
    const endTime = Date.now();
    console.log(`Quiz questions generated in ${(endTime - startTime) / 1000} seconds`);
    
    // Handle errors from quiz generation
    if (!quizQuestions || (typeof quizQuestions === 'string' && quizQuestions.startsWith("Error:"))) {
      console.log(`Error generating quiz questions: ${quizQuestions}`);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: quizQuestions || 'Failed to generate quiz questions' })
      };
    }
    
    // Store questions in DynamoDB if identifiers are available
    if (courseId && lectureId && Array.isArray(quizQuestions)) {
      console.log(`Storing ${quizQuestions.length} quiz questions for course ${courseId}, lecture ${lectureId}`);
      const dynamoDB = new DynamoDB.DocumentClient();
      const tableName = process.env.QUIZ_QUESTION_TABLE_NAME || 'QuizQuestion-dev';
      
      try {
        // Track question IDs for creating a quiz
        const questionIds: string[] = [];
        
        // Store each question individually
        for (const question of quizQuestions) {
          const now = new Date().toISOString();
          const questionId = uuidv4();
          questionIds.push(questionId);
          
          // Prepare question data with required fields
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
          
          // Insert into DynamoDB
          await dynamoDB.put({
            TableName: tableName,
            Item: item
          }).promise();
        }
        
        console.log(`Successfully stored ${quizQuestions.length} quiz questions`);
        
        // Create a default quiz that includes all questions
        try {
          const quizTableName = process.env.QUIZ_TABLE_NAME || 'Quiz-dev';
          
          // Format quiz data
          const quizItem = {
            id: uuidv4(),
            courseId: courseId,
            lectureId: lectureId,
            quizId: `${courseId}-${lectureId}-quiz`, // Default identifier for the first quiz
            title: title ? `${title} Quiz` : 'Lecture Quiz',
            description: 'Main quiz for this lecture',
            questionIds: questionIds, 
            passingScore: 70,
            difficulty: 'Medium',
            order: 1,
            isPersonalized: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            __typename: 'Quiz'
          };
          
          // Insert quiz into DynamoDB
          await dynamoDB.put({
            TableName: quizTableName,
            Item: quizItem
          }).promise();
          
          console.log('Created quiz-1 with ID:', quizItem.id);
          
        } catch (error) {
          console.error("Error creating quiz:", error);
          // Continue execution even if quiz creation fails
        }
        
      } catch (error) {
        console.error("Error storing quiz questions in DynamoDB:", error);
        // Continue execution to still return generated questions
      }
    }
    
    // Return success response with generated questions
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