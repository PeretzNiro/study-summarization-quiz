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

// Define backend with all resources at the top level
const backend = defineBackend({
  auth,
  data,
  lectures,
  fileProcessor,
  dataProcessor,
  summarization,
  quizGenerator,
});

// First set up all environment variables
(backend.fileProcessor.resources.lambda as any).addEnvironment(
  'STORAGE_LECTURES_BUCKETNAME', 
  backend.lectures.resources.bucket.bucketName
);

(backend.fileProcessor.resources.lambda as any).addEnvironment(
  'DATA_PROCESSOR_FUNCTION_NAME',
  backend.dataProcessor.resources.lambda.functionName
);

(backend.dataProcessor.resources.lambda as any).addEnvironment(
  'LECTURE_TABLE_NAME',
  backend.data.resources.tables.Lecture.tableName
);

(backend.dataProcessor.resources.lambda as any).addEnvironment(
  'SUMMARIZATION_FUNCTION_NAME',
  backend.summarization.resources.lambda.functionName
);

(backend.summarization.resources.lambda as any).addEnvironment(
  'QUIZ_GENERATOR_FUNCTION_NAME',
  backend.quizGenerator.resources.lambda.functionName
);

(backend.summarization.resources.lambda as any).addEnvironment(
  'LECTURE_TABLE_NAME',
  backend.data.resources.tables.Lecture.tableName
);

(backend.quizGenerator.resources.lambda as any).addEnvironment(
  'QUIZ_QUESTION_TABLE_NAME',
  backend.data.resources.tables.QuizQuestion.tableName
);

(backend.quizGenerator.resources.lambda as any).addEnvironment(
  'QUIZ_TABLE_NAME',
  backend.data.resources.tables.Quiz.tableName
);

// Then set up all permissions
// Grant bucket permissions
backend.lectures.resources.bucket.grantRead(backend.fileProcessor.resources.lambda);
backend.lectures.resources.bucket.grantWrite(backend.fileProcessor.resources.lambda);

// Grant Lambda invoke permissions using direct policy statements
const invokeLambdaPolicy = (arn: string) => new PolicyStatement({
  actions: ['lambda:InvokeFunction'],
  resources: [arn]
});

// Add invoke permissions
backend.fileProcessor.resources.lambda.addToRolePolicy(
  invokeLambdaPolicy(backend.dataProcessor.resources.lambda.functionArn)
);
backend.dataProcessor.resources.lambda.addToRolePolicy(
  invokeLambdaPolicy(backend.summarization.resources.lambda.functionArn)
);
backend.summarization.resources.lambda.addToRolePolicy(
  invokeLambdaPolicy(backend.quizGenerator.resources.lambda.functionArn)
);

// Grant DynamoDB permissions
backend.data.resources.tables.Lecture.grantReadWriteData(backend.dataProcessor.resources.lambda);
backend.data.resources.tables.Lecture.grantReadWriteData(backend.summarization.resources.lambda);
backend.data.resources.tables.QuizQuestion.grantReadWriteData(backend.quizGenerator.resources.lambda);
backend.data.resources.tables.Quiz.grantReadWriteData(backend.quizGenerator.resources.lambda);

// Set up secrets policies
const secretsPolicy = new PolicyStatement({
  actions: ['secretsmanager:GetSecretValue'],
  resources: ['arn:aws:secretsmanager:*:*:secret:Gemini-API*']
});

backend.summarization.resources.lambda.addToRolePolicy(secretsPolicy);
backend.quizGenerator.resources.lambda.addToRolePolicy(secretsPolicy);

// FIXED METHOD: Add DynamoDB Stream as event source
// Get the table's stream ARN
const tableStreamArn = backend.data.resources.tables.Lecture.tableStreamArn;

// If the table has a stream, add it as an event source to dataProcessor Lambda
if (tableStreamArn) {
  // Create a DynamoDB event source
  const dynamoEventSource = new DynamoEventSource(backend.data.resources.tables.Lecture, {
    startingPosition: StartingPosition.LATEST,
    batchSize: 1,
    filters: [
      {
        pattern: JSON.stringify({ eventName: ['MODIFY'] })
      }
    ]
  });

  // Add the event source to the Lambda
  backend.dataProcessor.resources.lambda.addEventSource(dynamoEventSource);
}

// Lastly, add S3 bucket notification - this needs to be last to avoid circular dependencies
backend.lectures.resources.bucket.addEventNotification(
  EventType.OBJECT_CREATED_PUT,
  new LambdaDestination(backend.fileProcessor.resources.lambda),
  { prefix: 'protected/' }
);