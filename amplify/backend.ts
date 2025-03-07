import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { lectures } from './storage/resource';
import { displayLecture } from './functions/displayLecture/resource';
import { processS3Upload } from './functions/processS3Upload/resource';
import { storeLectureData } from './functions/storeLectureData/resource';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';

const backend = defineBackend({
  auth,
  data,
  lectures,
  processS3Upload,
  storeLectureData,
});

// // Add environment variable to the Lambda function
// (backend.displayLecture.resources.lambda as any).addEnvironment(
//   'STORAGE_LECTURES_BUCKETNAME', 
//   backend.lectures.resources.bucket.bucketName
// );

// // Add the event notification after all resources are defined
// backend.lectures.resources.bucket.addEventNotification(
//   EventType.OBJECT_CREATED_PUT,
//   new LambdaDestination(backend.displayLecture.resources.lambda),
//   { prefix: 'python/' }
// );

// // Add DynamoDB table name environment variable
// (backend.displayLecture.resources.lambda as any).addEnvironment(
//   'LECTURES_TABLE_NAME',
//   backend.data.resources.tables.Lecture.tableName
// );

// // In backend.ts after all resources are defined
// backend.lectures.resources.bucket.grantRead(backend.displayLecture.resources.lambda);

// Configure S3 upload processor
(backend.processS3Upload.resources.lambda as any).addEnvironment(
  'STORAGE_LECTURES_BUCKETNAME', 
  backend.lectures.resources.bucket.bucketName
);

(backend.processS3Upload.resources.lambda as any).addEnvironment(
  'LECTURE_STORAGE_FUNCTION',
  backend.storeLectureData.resources.lambda.functionName
);

// Add bucket notification to trigger first Lambda
backend.lectures.resources.bucket.addEventNotification(
  EventType.OBJECT_CREATED_PUT,
  new LambdaDestination(backend.processS3Upload.resources.lambda),
  { prefix: 'python/' }
);

// Configure data storage Lambda
(backend.storeLectureData.resources.lambda as any).addEnvironment(
  'LECTURES_TABLE_NAME',
  backend.data.resources.tables.Lecture.tableName
);

// Grant permissions
backend.lectures.resources.bucket.grantRead(backend.processS3Upload.resources.lambda);
backend.storeLectureData.resources.lambda.grantInvoke(backend.processS3Upload.resources.lambda);