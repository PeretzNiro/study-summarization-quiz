import { DynamoDB, Lambda } from "aws-sdk";
import { createSummary } from "./summarization";
import { estimateDuration } from "./utils";
import type { Handler } from 'aws-lambda';

/**
 * Lambda handler for lecture summarization
 * Generates AI-powered summaries from lecture content and updates DynamoDB
 */
export const handler: Handler = async (event: any): Promise<any> => {
  console.log("Starting summarization Lambda function");
  
  try {
    // Extract parameters based on event source (SQS, API Gateway, or direct invocation)
    let content, courseId, lectureId, itemId, title;
    
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
    
    // Validate content parameter
    if (!content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required parameter: content' })
      };
    }
    
    // Get API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'API key not configured' })
      };
    }
    
    // Verify the lecture exists and is in approved status
    const tableName = process.env.LECTURE_TABLE_NAME;
    if (!tableName) {
      throw new Error('LECTURE_TABLE_NAME environment variable not set');
    }
    
    // Fetch the lecture from DynamoDB
    const dynamodb = new DynamoDB.DocumentClient();
    const lectureResult = await dynamodb.get({
      TableName: tableName,
      Key: { id: itemId }
    }).promise();
    
    if (!lectureResult.Item) {
      throw new Error(`Lecture with ID ${itemId} not found`);
    }
    
    // Skip processing for lectures that aren't approved
    if (lectureResult.Item.status !== 'approved') {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Skipped summarization for non-approved lecture' })
      };
    }
    
    // Generate summary using AI model
    const summary = await createSummary(content, apiKey);
    
    // Handle errors from summarization
    if (!summary || summary.startsWith("Error:")) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: summary || 'Failed to generate summary' })
      };
    }
    
    // Calculate estimated reading duration for the summary
    const duration = estimateDuration(summary);
    
    // Store summary and duration in DynamoDB
    if (itemId) {
      try {
        const now = new Date().toISOString();
        
        // Update the lecture record
        await dynamodb.update({
          TableName: tableName,
          Key: { id: itemId },
          UpdateExpression: "set summary = :s, #dur = :d, updatedAt = :t",
          ExpressionAttributeValues: {
            ":s": summary,
            ":d": duration,
            ":t": now
          },
          ExpressionAttributeNames: {
            "#dur": "duration"  // Use alias for reserved keyword
          },
          ReturnValues: "UPDATED_NEW"
        }).promise();
        
        // Trigger quiz generation if a function is configured
        const quizGeneratorFunction = process.env.QUIZ_GENERATOR_FUNCTION_NAME;
        
        if (quizGeneratorFunction) {
          const lambda = new Lambda();
          
          // Prepare payload with all necessary data
          const quizPayload = {
            id: itemId,
            courseId,
            lectureId,
            content,
            summary,
            title,
            duration
          };
          
          // Invoke quiz generator asynchronously
          await lambda.invoke({
            FunctionName: quizGeneratorFunction,
            InvocationType: 'Event',
            Payload: JSON.stringify(quizPayload)
          }).promise();
        }
        
      } catch (error) {
        console.error("Error updating DynamoDB:", error);
        // Continue execution to still return the summary
      }
    }
    
    // Return success response with generated data
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Summary generated successfully',
        summary,
        duration,
        courseId,
        lectureId,
        id: itemId,
        title
      })
    };
    
  } catch (error) {
    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Error in summarization function: ${errorMessage}` })
    };
  }
};