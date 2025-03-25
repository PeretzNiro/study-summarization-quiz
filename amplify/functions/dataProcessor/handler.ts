import * as AWS from 'aws-sdk';
import { Handler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';

// Initialize AWS clients
const dynamodb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();

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

interface ProcessorInput {
  id?: string;
  courseId: string;
  lectureId: string;
  title: string;
  content: string;
  fileName?: string;
  fileType?: string;
  difficulty?: string;
  status?: string;
  statusUpdate?: boolean;
}

// This is triggered by DynamoDB Stream when status changes to approved
export const handler: Handler = async (event: any): Promise<any> => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // If this is a DynamoDB stream event
    if (event.Records && Array.isArray(event.Records)) {
      for (const record of event.Records) {
        if (record.eventName === 'MODIFY') {
          // Extract the new and old images
          const newImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
          const oldImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage);
          
          // Check if status changed to approved
          if (oldImage.status !== 'approved' && newImage.status === 'approved') {
            console.log(`Status changed to approved for lecture ${newImage.id}`);
            
            // Include title in the payload
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
    
    // Extract data from event
    const { id, courseId, lectureId, title, content, fileName, fileType, difficulty, status } = event;
    
    // Get reference to table
    const tableName = process.env.LECTURE_TABLE_NAME;
    if (!tableName) {
      throw new Error('LECTURE_TABLE_NAME environment variable not set');
    }
    
    console.log(`Writing to DynamoDB table: ${tableName}`);
    
    // Check if this is a status update operation from the UI
    const isStatusUpdate = event.statusUpdate === true && event.id;

    if (isStatusUpdate) {
      try {
        console.log('Processing status update:', event);
        
        // Get the existing lecture
        const getResult = await dynamodb.get({
          TableName: tableName,
          Key: { id: event.id }
        }).promise();
        
        if (!getResult.Item) {
          throw new Error(`Lecture with ID ${event.id} not found`);
        }
        
        console.log('Found lecture:', getResult.Item);
        
        // If status changed to approved, trigger summarization
        if (getResult.Item.status !== 'approved' && event.status === 'approved') {
          console.log('Status changed to approved, triggering summarization');
          
          // Invoke summarization Lambda
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
    
    // Check for existing items to avoid duplicates
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
    
    // Prepare item data, merging with existing if needed
    const existingItem = existingItems.length > 0 ? existingItems[0] : {};
    
    // Use existing ID if found, or provided ID, or generate new ID
    const itemId = id || (existingItems.length > 0 ? existingItem.id : uuidv4());

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
      // Set status to pending_review if not explicitly approved
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
      
      // Only invoke summarization if the item is approved
      if (item.status === 'approved') {
        await invokeSummarization({
          id: item.id,
          courseId: item.courseId,
          lectureId: item.lectureId,
          content: item.content,
          title: item.title || '' 
        });
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
    const response = await lambda.invoke({
      FunctionName: summarizationFunction,
      InvocationType: 'Event',
      Payload: JSON.stringify(params)
    }).promise();
    
    console.log('Summarization invoked successfully:', response);
    return response;
  } catch (error) {
    console.error('Error invoking summarization:', error);
    throw error;
  }
}