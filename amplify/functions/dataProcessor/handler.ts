import * as AWS from 'aws-sdk';
import { Handler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';

// Initialize AWS clients
const dynamodb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();

/**
 * Structure of a lecture item in DynamoDB
 */
interface LectureItem {
  id?: string;
  courseId: string;
  lectureId: string;
  title: string;
  content: string;
  fileName?: string;
  fileType?: string;
  summary?: string;
  __typename: string;
  difficulty: string;
  duration: string;
  createdAt: string;
  updatedAt: string;
  status?: string;
}

/**
 * Lambda handler that processes lecture data and manages workflow state
 * Supports multiple trigger types:
 * 1. DynamoDB stream events for status change detection
 * 2. Direct invocation from FileProcessor with lecture content
 * 3. Status update operations from admin UI
 */
export const handler: Handler = async (event: any): Promise<any> => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // Handle DynamoDB Stream events (triggered when lecture status changes)
    if (event.Records && Array.isArray(event.Records)) {
      for (const record of event.Records) {
        if (record.eventName === 'MODIFY') {
          // Convert DynamoDB format to regular JavaScript objects
          const newImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
          const oldImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage);
          
          // Detect status transitions to 'approved'
          if (oldImage.status !== 'approved' && newImage.status === 'approved') {
            console.log(`Status changed to approved for lecture ${newImage.id}`);
            
            // Trigger AI summarization when approved
            await invokeSummarization({
              id: newImage.id,
              courseId: newImage.courseId,
              lectureId: newImage.lectureId,
              content: newImage.content,
              title: newImage.title || '' 
            });
          }
        }
      }
      return { statusCode: 200, body: JSON.stringify({ message: 'Processed stream events' }) };
    }
    
    // Extract data from event payload
    const { id, courseId, lectureId, title, content, fileName, fileType, difficulty, status } = event;
    
    // Get reference to DynamoDB table from environment
    const tableName = process.env.LECTURE_TABLE_NAME;
    if (!tableName) {
      throw new Error('LECTURE_TABLE_NAME environment variable not set');
    }
    
    console.log(`Writing to DynamoDB table: ${tableName}`);
    
    // Special case: Handle status update operations from admin UI
    const isStatusUpdate = event.statusUpdate === true && event.id;

    if (isStatusUpdate) {
      try {
        console.log('Processing status update:', event);
        
        // Retrieve existing lecture record
        const getResult = await dynamodb.get({
          TableName: tableName,
          Key: { id: event.id }
        }).promise();
        
        if (!getResult.Item) {
          throw new Error(`Lecture with ID ${event.id} not found`);
        }
        
        console.log('Found lecture:', getResult.Item);
        
        // Check if this status update transitions to 'approved'
        if (getResult.Item.status !== 'approved' && event.status === 'approved') {
          console.log('Status changed to approved, triggering summarization');
          
          // Start AI processing pipeline
          await invokeSummarization({
            id: event.id,
            courseId: getResult.Item.courseId,
            lectureId: getResult.Item.lectureId,
            content: getResult.Item.content,
            title: getResult.Item.title
          });
        } else {
          console.log('No status change to approved or already approved');
        }
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Status update processed',
            id: event.id
          })
        };
      } catch (error) {
        console.error(`Error processing status update: ${error}`);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            message: `Error processing status update: ${error}` 
          })
        };
      }
    }
    
    // Check for existing lecture entries to avoid duplicates
    let existingItems: string | any[] = [];
    try {
      const response = await dynamodb.scan({
        TableName: tableName,
        FilterExpression: 'courseId = :cid AND lectureId = :lid',
        ExpressionAttributeValues: {
          ':cid': courseId,
          ':lid': lectureId
        }
      }).promise();
      
      existingItems = response.Items || [];
      console.log(`Found ${existingItems.length} existing items with courseId=${courseId} and lectureId=${lectureId}`);
    } catch (error) {
      console.log(`Error scanning for existing items: ${error}`);
    }
    
    // Get current timestamp in ISO format
    const now = new Date().toISOString();
    
    // Prepare item data, merging with existing if found
    const existingItem = existingItems.length > 0 ? existingItems[0] : {};
    
    // Use existing ID if found, or provided ID, or generate new ID
    const itemId = id || (existingItems.length > 0 ? existingItem.id : uuidv4());

    // Create or update the lecture record
    const item: LectureItem = {
      id: itemId,
      courseId,
      lectureId,
      title: title || existingItem.title || '',
      content: content || existingItem.content || '',
      fileName: fileName || existingItem.fileName || '',
      fileType: fileType || existingItem.fileType || '',
      summary: existingItem.summary || '',
      __typename: 'Lecture',
      difficulty: difficulty || existingItem.difficulty || 'Medium',
      duration: existingItem.duration || '30 minutes',
      // Default to 'pending_review' unless explicitly approved
      status: status || 'pending_review',
      updatedAt: now,
      createdAt: existingItems.length > 0 && existingItem.createdAt 
        ? existingItem.createdAt 
        : now
    };
    
    // Write to DynamoDB
    try {
      const response = await dynamodb.put({
        TableName: tableName,
        Item: item
      }).promise();
      
      console.log(`DynamoDB put_item response:`, response);
      
      // Only start summarization immediately if already approved
      if (item.status === 'approved') {
        if (item.id) {
          await invokeSummarization({
            id: item.id,
            courseId: item.courseId,
            lectureId: item.lectureId,
            content: item.content,
            title: item.title || '' 
          });
        } else {
          console.error('Cannot invoke summarization: item.id is undefined');
        }
      } else {
        console.log('Item is in pending_review state - not invoking summarization');
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Data processing completed successfully',
          id: item.id,
          courseId: item.courseId,
          lectureId: item.lectureId,
          status: item.status
        })
      };
    } catch (error) {
      console.error('Error storing item in DynamoDB:', error);
      throw error;
    }
  } catch (error) {
    console.error(`Error processing data: ${error}`);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: `Error processing data: ${error}`
      })
    };
  }
};

/**
 * Invokes the summarization Lambda function to process lecture content
 * @param params Lecture data required for summarization
 */
async function invokeSummarization(params: {
  id: string;
  courseId: string;
  lectureId: string;
  content: string;
  title: string;
}) {
  const summarizationFunction = process.env.SUMMARIZATION_FUNCTION_NAME;
  
  if (!summarizationFunction) {
    console.log('SUMMARIZATION_FUNCTION_NAME not configured');
    return;
  }
  
  console.log(`Invoking summarization function: ${summarizationFunction}`);
  
  try {
    // Use Event invocation type for asynchronous processing
    const response = await lambda.invoke({
      FunctionName: summarizationFunction,
      InvocationType: 'Event',  // Async call that doesn't wait for completion
      Payload: JSON.stringify(params)
    }).promise();
    
    console.log('Summarization invoked successfully:', response);
    return response;
  } catch (error) {
    console.error('Error invoking summarization:', error);
    throw error;
  }
}