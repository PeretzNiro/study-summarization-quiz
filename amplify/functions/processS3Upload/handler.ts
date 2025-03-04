import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const s3Client = new S3Client({});
const lambdaClient = new LambdaClient({});

export const handler = async (event: S3Event) => {
  try {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    // Get the S3 bucket and key from the event
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    
    console.log('Bucket:', bucket);
    console.log('Key:', key);

    // Get the file content from S3
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(getObjectCommand);
    const fileContent = await response.Body?.transformToString();

    if (!fileContent) {
      throw new Error('No file content found');
    }
    
    console.log('File content length:', fileContent.length);
    
    let lectureData;
    try {
      // Parse the JSON content
      lectureData = JSON.parse(fileContent);
      console.log('Successfully parsed JSON content');
      
      // Validate that the required fields exist
      if (!lectureData.courseID || !lectureData.lectureID) {
        throw new Error('JSON must contain courseID and lectureID fields');
      }
    } catch (jsonError) {
      console.error('Failed to parse JSON:', jsonError);
      throw new Error(`Invalid JSON format: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
    }

    console.log('Invoking storage function with payload:', JSON.stringify(lectureData, null, 2));
    
    // Invoke the second Lambda to store in DynamoDB
    const invokeCommand = new InvokeCommand({
      FunctionName: process.env.LECTURE_STORAGE_FUNCTION || '',
      InvocationType: 'Event', // Asynchronous invocation
      Payload: JSON.stringify(lectureData)
    });

    if (!process.env.LECTURE_STORAGE_FUNCTION) {
      console.warn('LECTURE_STORAGE_FUNCTION environment variable is not set!');
    }

    await lambdaClient.send(invokeCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully processed JSON file and invoked storage Lambda',
        courseID: lectureData.courseID,
        lectureID: lectureData.lectureID
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing file',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};