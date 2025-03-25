import { DynamoDB, Lambda } from "aws-sdk";
import { createSummary } from "./summarization";
import type { Handler } from 'aws-lambda';

/**
 * Lambda handler function
 */
export const handler: Handler = async (event: any): Promise<any> => {
  console.log("Starting summarization Lambda function");
  
  try {
    // Extract parameters from event
    let content, courseId, lectureId, itemId;
    
    if (event.Records && event.Records.length > 0 && event.Records[0].body) {
      // From SQS
      const body = JSON.parse(event.Records[0].body);
      content = body.content;
      courseId = body.courseId;
      lectureId = body.lectureId;
      itemId = body.id;
      title = body.title;
    } else if (event.body) {
      // From API Gateway
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      content = body.content;
      courseId = body.courseId;
      lectureId = body.lectureId;
      itemId = body.id;
      title = body.title;
    } else {
      // Direct invocation
      content = event.content;
      courseId = event.courseId;
      lectureId = event.lectureId;
      itemId = event.id;
      title = event.title;
    }
    
    if (!content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required parameter: content' })
      };
    }
    
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
    
    // First, verify this is an approved lecture
    const tableName = process.env.LECTURE_TABLE_NAME;
    if (!tableName) {
      throw new Error('LECTURE_TABLE_NAME environment variable not set');
    }
    
    const dynamodb = new DynamoDB.DocumentClient();
    const lectureResult = await dynamodb.get({
      TableName: tableName,
      Key: { id: itemId }
    }).promise();
    
    if (!lectureResult.Item) {
      throw new Error(`Lecture with ID ${itemId} not found`);
    }
    
    // Check the lecture status
    if (lectureResult.Item.status !== 'approved') {
      console.log(`Lecture ${itemId} is not approved (status: ${lectureResult.Item.status}). Skipping summarization.`);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Skipped summarization for non-approved lecture' })
      };
    }
    
    // Generate summary
    console.log("Generating summary...");
    const startTime = Date.now();
    const summary = await createSummary(content, apiKey);
    const endTime = Date.now();
    console.log(`Summary generated in ${(endTime - startTime) / 1000} seconds`);
    
    if (!summary || summary.startsWith("Error:")) {
      console.log(`Error generating summary: ${summary}`);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: summary || 'Failed to generate summary' })
      };
    }
    
    // Store in DynamoDB if we have the item ID
    if (itemId) {
      console.log(`Updating Lecture record for ID: ${itemId}`);
      const dynamoDB = new DynamoDB.DocumentClient();
      const tableName = process.env.LECTURE_TABLE_NAME;
      
      if (!tableName) {
        console.log("LECTURE_TABLE_NAME environment variable not set");
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'LECTURE_TABLE_NAME not configured' })
        };
      }
      
      // Update the item in DynamoDB
      try {
        const now = new Date().toISOString();
        
        const updateResult = await dynamoDB.update({
          TableName: tableName,
          Key: { id: itemId },
          UpdateExpression: "set summary = :s, updatedAt = :t",
          ExpressionAttributeValues: {
            ":s": summary,
            ":t": now  // Use ISO string format instead of epoch time
          },
          ReturnValues: "UPDATED_NEW"
        }).promise();
        
        console.log("DynamoDB update successful:", updateResult);
        
        // Invoke quiz generator if configured
        const lambda = new Lambda();
        const quizGeneratorFunction = process.env.QUIZ_GENERATOR_FUNCTION_NAME;
        
        if (quizGeneratorFunction) {
          console.log(`Invoking quiz generator function: ${quizGeneratorFunction}`);
          
          const quizPayload = {
            id: itemId,
            courseId,
            lectureId,
            content,
            summary,
            title
          };
          
          const quizResponse = await lambda.invoke({
            FunctionName: quizGeneratorFunction,
            InvocationType: 'Event',
            Payload: JSON.stringify(quizPayload)
          }).promise();
          
          console.log("Quiz generator invoke response:", quizResponse);
        }
        
      } catch (error) {
        console.error("Error updating DynamoDB:", error);
        // Continue execution - we'll still return the summary
      }
    }
    
    // Return success with the summary
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Summary generated successfully',
        summary,
        courseId,
        lectureId,
        id: itemId,
        title
      })
    };
    
  } catch (error) {
    console.error("Unexpected error in handler:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Error in summarization function: ${errorMessage}` })
    };
  }
};