import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const s3Client = new S3Client({});
const ddbClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event: S3Event) => {
  try {
    // Get the S3 bucket and key from the event
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

    // Extract courseId and lectureId from the key
    // Assuming the key format is "python/courseId/lectureId.txt"
    const [_, courseId, lectureIdWithExt] = key.split('/');
    const lectureId = lectureIdWithExt.split('.')[0];

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

    // Store the data in DynamoDB
    const putCommand = new PutCommand({
      TableName: process.env.LECTURES_TABLE_NAME, // You'll need to set this environment variable
      Item: {
        courseId,
        lectureId,
        title: lectureIdWithExt, // You might want to modify this
        content: fileContent,
        summary: '', // You can add a summary later if needed
      }
    });

    await documentClient.send(putCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully processed file and stored in DynamoDB',
        courseId,
        lectureId
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
