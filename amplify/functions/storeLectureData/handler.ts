import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(ddbClient);

interface LectureData {
  courseId: string;
  lectureId: string;
  title?: string;
  content?: string;
  summary?: string;
}

export const handler = async (event: LectureData) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    // Ensure the required primary key fields are present
    if (!event.courseId || !event.lectureId) {
      throw new Error('Missing required fields: courseId and lectureId are required');
    }

    // Define the table name for easier reference
    const tableName = process.env.LECTURES_TABLE_NAME || '';
    if (!tableName) {
      throw new Error('LECTURES_TABLE_NAME environment variable is not set');
    }

    // Try to retrieve existing item
    let existingItem: Record<string, any> | undefined;
    try {
      const getCommand = new GetCommand({
        TableName: tableName,
        Key: {
          courseId: event.courseId,
          lectureId: event.lectureId,
        }
      });
      
      const response = await documentClient.send(getCommand);
      existingItem = response.Item;
      console.log('Existing item:', existingItem ? 'Found' : 'Not found');
    } catch (getError) {
      console.log('Error retrieving existing item:', getError);
      // Continue with the operation even if get fails
    }

    // Merge with existing data or use defaults
    const mergedItem = {
      courseId: event.courseId,
      lectureId: event.lectureId,
      title: event.title || existingItem?.title || '',
      content: event.content || existingItem?.content || '',
      summary: event.summary || existingItem?.summary || ''
    };

    // Store the data in DynamoDB
    const putCommand = new PutCommand({
      TableName: tableName,
      Item: mergedItem
    });

    console.log('Storing item in DynamoDB:', JSON.stringify(putCommand.input.Item, null, 2));
    
    await documentClient.send(putCommand);
    console.log('Successfully stored item in DynamoDB');

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: existingItem ? 'Updated lecture in DynamoDB' : 'Created new lecture in DynamoDB',
        courseId: event.courseId,
        lectureId: event.lectureId,
        operation: existingItem ? 'UPDATE' : 'CREATE'
      })
    };
  } catch (error) {
    console.error('Error storing data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error storing lecture data',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};