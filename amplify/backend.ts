import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { lectures } from './storage/resource';
import { fileProcessor } from './functions/fileProcessor/resource';
import { dataProcessor } from './functions/dataProcessor/resource';
import { summarization } from './functions/summarization/resource';
import { quizGenerator } from './functions/quiz-generator/resource';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

/**
 * Backend infrastructure definition
 * 
 * This composes all resources together and establishes:
 * 1. Environment variables for service communication
 * 2. IAM permissions between services
 * 3. Event triggers for the processing pipeline
 */
const backend = defineBackend({
  auth,                // Cognito user authentication
  data,                // DynamoDB data models
  lectures,            // S3 storage for lecture materials
  fileProcessor,       // Processes uploaded files from S3
  dataProcessor,       // Processes structured data and initiates summarization
  summarization,       // Generates lecture summaries with AI
  quizGenerator,       // Creates assessment quizzes with AI
});

// ----- Environment Variables -----
// Allows components to reference each other by name at runtime

// File Processor needs access to S3 bucket name and next Lambda in chain
(backend.fileProcessor.resources.lambda as any).addEnvironment(
  'STORAGE_LECTURES_BUCKETNAME', 
  backend.lectures.resources.bucket.bucketName
);

(backend.fileProcessor.resources.lambda as any).addEnvironment(
  'DATA_PROCESSOR_FUNCTION_NAME',
  backend.dataProcessor.resources.lambda.functionName
);

// Data Processor needs access to DynamoDB table and next Lambda
(backend.dataProcessor.resources.lambda as any).addEnvironment(
  'LECTURE_TABLE_NAME',
  backend.data.resources.tables.Lecture.tableName
);

(backend.dataProcessor.resources.lambda as any).addEnvironment(
  'SUMMARIZATION_FUNCTION_NAME',
  backend.summarization.resources.lambda.functionName
);

// Summarization needs access to Quiz Generator Lambda and Lecture table
(backend.summarization.resources.lambda as any).addEnvironment(
  'QUIZ_GENERATOR_FUNCTION_NAME',
  backend.quizGenerator.resources.lambda.functionName
);

(backend.summarization.resources.lambda as any).addEnvironment(
  'LECTURE_TABLE_NAME',
  backend.data.resources.tables.Lecture.tableName
);

// Quiz Generator needs access to all relevant DynamoDB tables
(backend.quizGenerator.resources.lambda as any).addEnvironment(
  'QUIZ_QUESTION_TABLE_NAME',
  backend.data.resources.tables.QuizQuestion.tableName
);

(backend.quizGenerator.resources.lambda as any).addEnvironment(
  'QUIZ_TABLE_NAME',
  backend.data.resources.tables.Quiz.tableName
);

(backend.quizGenerator.resources.lambda as any).addEnvironment(
  'LECTURE_TABLE_NAME',
  backend.data.resources.tables.Lecture.tableName
);

// ----- IAM Permissions -----

// Grant S3 bucket read/write permissions to File Processor
backend.lectures.resources.bucket.grantRead(backend.fileProcessor.resources.lambda);
backend.lectures.resources.bucket.grantWrite(backend.fileProcessor.resources.lambda);

// Helper for creating Lambda invocation policy
const invokeLambdaPolicy = (arn: string) => new PolicyStatement({
  actions: ['lambda:InvokeFunction'],
  resources: [arn]
});

// Configure processing pipeline permissions
// Each Lambda can invoke the next Lambda in the chain
backend.fileProcessor.resources.lambda.addToRolePolicy(
  invokeLambdaPolicy(backend.dataProcessor.resources.lambda.functionArn)
);
backend.dataProcessor.resources.lambda.addToRolePolicy(
  invokeLambdaPolicy(backend.summarization.resources.lambda.functionArn)
);
backend.summarization.resources.lambda.addToRolePolicy(
  invokeLambdaPolicy(backend.quizGenerator.resources.lambda.functionArn)
);

// Grant DynamoDB table access to relevant Lambdas
backend.data.resources.tables.Lecture.grantReadWriteData(backend.dataProcessor.resources.lambda);
backend.data.resources.tables.Lecture.grantReadWriteData(backend.summarization.resources.lambda);
backend.data.resources.tables.QuizQuestion.grantReadWriteData(backend.quizGenerator.resources.lambda);
backend.data.resources.tables.Quiz.grantReadWriteData(backend.quizGenerator.resources.lambda);

// Allow AI Lambda functions to access Google Gemini API key in Secrets Manager
const secretsPolicy = new PolicyStatement({
  actions: ['secretsmanager:GetSecretValue'],
  resources: ['arn:aws:secretsmanager:*:*:secret:Gemini-API*']
});

backend.summarization.resources.lambda.addToRolePolicy(secretsPolicy);
backend.quizGenerator.resources.lambda.addToRolePolicy(secretsPolicy);

// ----- Event Sources -----

// Configure DynamoDB Stream for Lecture table updates
// This triggers the Data Processor when a Lecture record is modified
const tableStreamArn = backend.data.resources.tables.Lecture.tableStreamArn;

if (tableStreamArn) {
  // Create a DynamoDB event source that only triggers on MODIFY events
  const dynamoEventSource = new DynamoEventSource(backend.data.resources.tables.Lecture, {
    startingPosition: StartingPosition.LATEST,  // Only process new changes
    batchSize: 1,                              // Process one record at a time
    filters: [
      {
        pattern: JSON.stringify({ eventName: ['MODIFY'] })  // Only trigger on updates
      }
    ]
  });

  // Attach the event source to the Data Processor Lambda
  backend.dataProcessor.resources.lambda.addEventSource(dynamoEventSource);
}

// Configure S3 event to trigger File Processor when a file is uploaded
// Note: This must be last to avoid circular dependencies in CloudFormation
backend.lectures.resources.bucket.addEventNotification(
  EventType.OBJECT_CREATED_PUT,                            // Trigger on file uploads
  new LambdaDestination(backend.fileProcessor.resources.lambda),
  { prefix: 'protected/' }                                // Only process files in protected path
);