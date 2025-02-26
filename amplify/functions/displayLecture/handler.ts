import { S3 } from 'aws-sdk';

const s3 = new S3();

export const handler = async (event: any) => {
  const bucketName = process.env.STORAGE_LECTURES_BUCKETNAME;
  console.log('Bucket Name:', bucketName); // Add this line to log the bucket name
  const key = event.Records[0].s3.object.key;

  if (!bucketName) {
    console.error('Bucket name is not defined');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Bucket name is not defined' }),
    };
  }

  try {
    const params = {
      Bucket: bucketName,
      Key: key,
    };

    const data = await s3.getObject(params).promise();
    const fileContent = data.Body?.toString('utf-8');

    console.log('File content:', fileContent); // Add this line to log the file content
    return {
      statusCode: 200,
      body: JSON.stringify({ content: fileContent }),
    };
  } catch (error) {
    console.error('Error fetching file from S3:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error fetching file from S3' }),
    };
  }
};