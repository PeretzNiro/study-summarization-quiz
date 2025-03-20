import * as AWS from 'aws-sdk';
import * as path from 'path';
import type { Handler } from 'aws-lambda';
import { extractPdfWithTables, extractPptxContent, ExtractedData } from './src/extractors';

const s3 = new AWS.S3();
const lambda = new AWS.Lambda();

/**
 * Main handler function
 */
export const handler: Handler = async (event: any): Promise<any> => {
  try {
    // Process S3 event
    const bucket = event.Records[0].s3.bucket.name;
    const key = event.Records[0].s3.object.key;
    
    // URL decode the key
    const keyDecoded = decodeURIComponent(key);
    
    console.log(`Processing file: s3://${bucket}/${keyDecoded}`);
    
    // Extract file content
    const extractedData = await extractContentFromFile(bucket, keyDecoded);
    
    // Invoke dataProcessor Lambda to store the data
    const dataProcessorFunction = process.env.DATA_PROCESSOR_FUNCTION_NAME;
    
    if (dataProcessorFunction) {
      console.log(`Invoking data processor function: ${dataProcessorFunction}`);
      
      const response = await lambda.invoke({
        FunctionName: dataProcessorFunction,
        InvocationType: 'Event',
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
 * Extract content from file in S3
 */
async function extractContentFromFile(bucket: string, key: string): Promise<ExtractedData> {
  // Get the file from S3
  const response = await s3.getObject({ Bucket: bucket, Key: key }).promise();
  const fileBuffer = response.Body as Buffer;
  
  // Determine file type from key
  const fileExtension = path.extname(key).toLowerCase();
  
  // Extract data based on file type
  let extractedData;
  
  switch (fileExtension) {
    case '.pdf':
      // Use the enhanced PDF extraction with table detection
      extractedData = await extractPdfWithTables(fileBuffer);
      break;
    
    case '.pptx':
    case '.ppt':
      extractedData = await extractPptxContent(fileBuffer);
      break;
    
    default:
      throw new Error(`Unsupported file type: ${fileExtension}`);
  }
  
  // Add file metadata
  extractedData.fileName = path.basename(key);
  extractedData.fileType = fileExtension.substring(1); // Remove the dot
  
  return extractedData;
}