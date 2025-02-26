import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { lectures } from './storage/resource';
import { displayLecture } from './functions/displayLecture/resource';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';

const backend = defineBackend({
  auth,
  data,
  lectures,
  displayLecture,
});

// Add environment variable to the Lambda function
(backend.displayLecture.resources.lambda as any).addEnvironment('STORAGE_LECTURES_BUCKETNAME', backend.lectures.resources.bucket.bucketName);

backend.lectures.resources.bucket.addEventNotification(
  EventType.OBJECT_CREATED_PUT,
  new LambdaDestination(backend.displayLecture.resources.lambda),
  { prefix: 'python/' }
);