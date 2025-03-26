import * as AWS from 'aws-sdk';
import * as path from 'path';
import type { Handler } from 'aws-lambda';
import { extractPdfWithTables, extractPptxContent, ExtractedData } from './src/extractors';

// Initialize AWS clients
const s3 = new AWS.S3();
const lambda = new AWS.Lambda();

/**
 * Lambda handler for processing files uploaded to S3
 * Extracts content from PDF/PPTX files and forwards to data processor
 */
export const handler: Handler = async (event: any): Promise<any> => {
  try {
    // Extract S3 event information
    const bucket = event.Records[0].s3.bucket.name;
    const key = event.Records[0].s3.object.key;
    
    // URL decode the key (S3 events pass URL-encoded keys)
    const keyDecoded = decodeURIComponent(key);
    
    console.log(`Processing file: s3://${bucket}/${keyDecoded}`);
    
    // Extract file content based on file type
    const extractedData = await extractContentFromFile(bucket, keyDecoded);
    
    // Get reference to the next function in processing pipeline
    const dataProcessorFunction = process.env.DATA_PROCESSOR_FUNCTION_NAME;
    
    if (dataProcessorFunction) {
      console.log(`Invoking data processor function: ${dataProcessorFunction}`);
      
      // Asynchronously invoke data processor to handle the extracted content
      const response = await lambda.invoke({
        FunctionName: dataProcessorFunction,
        InvocationType: 'Event', // Non-blocking invocation
        Payload: JSON.stringify(extractedData)
      }).promise();
      
      console.log('Data processor invocation response:', response);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'File processed successfully',
          extractedData 
        })
      };
    } else {
      console.log('No data processor function specified. Returning data directly.');
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'File processed successfully, but no data processor specified',
          extractedData 
        })
      };
    }
  } catch (error) {
    console.error('Error in file processor:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Error processing file: ${error}` })
    };
  }
};

/**
 * Extracts content from a file in S3 based on file type
 * @param bucket S3 bucket name
 * @param key Object key/path in S3
 * @returns Structured data with extracted content and metadata
 */
async function extractContentFromFile(bucket: string, key: string): Promise<ExtractedData> {
  // Download file from S3
  const response = await s3.getObject({ Bucket: bucket, Key: key }).promise();
  const fileBuffer = response.Body as Buffer;
  
  // Parse file extension to determine type
  const fileExtension = path.extname(key).toLowerCase();
  
  // Process content based on file extension
  let extractedData;
  
  switch (fileExtension) {
    case '.pdf':
      // Extract text and table content from PDF
      extractedData = await extractPdfWithTables(fileBuffer);
      break;
    
    case '.pptx':
    case '.ppt':
      // Extract text and slide content from PowerPoint
      extractedData = await extractPptxContent(fileBuffer);
      break;
    
    default:
      throw new Error(`Unsupported file type: ${fileExtension}`);
  }
  
  // Enhance extracted data with file metadata
  extractedData.fileName = path.basename(key);
  extractedData.fileType = fileExtension.substring(1); // Remove the leading dot
  
  // Extract course and lecture identifiers from the file path if present
  // Format: /protected/USERID/courseId/lectureId/filename.ext
  const pathParts = key.split('/');
  if (pathParts.length >= 5) {
    // Extract course and lecture IDs from the path structure
    extractedData.courseId = extractedData.courseId || pathParts[pathParts.length - 3];
    extractedData.lectureId = extractedData.lectureId || pathParts[pathParts.length - 2];
  }
  
  return extractedData;
}