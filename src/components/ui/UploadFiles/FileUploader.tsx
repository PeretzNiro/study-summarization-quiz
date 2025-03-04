import React, { useState } from 'react';
import { FileUploader } from '@aws-amplify/ui-react-storage';

interface FileUploadProps {
  // If you need to pass in props, define them here
  // e.g. folderName?: string;
}

const FileUpload: React.FC<FileUploadProps> = () => {
  const [uploadStatus, setUploadStatus] = useState<string>('');

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2 className='row_padding'>Upload Files to Lectures/python/</h2>
      <FileUploader
        /* 
          Specify the path (or "prefix") under which files will be placed in S3.
          e.g., "python/" means S3 objects go to s3://lectures/python/<filename>
        */
        path="python/"

        // Restrict file types if you wish, e.g., acceptedFileTypes={['image/*']}
        acceptedFileTypes={['*/*']} 

        // Provide user feedback via callbacks
        onUploadStart={() => {
          setUploadStatus('Uploading...');
        }}
        onUploadSuccess={(event: any) => {
          setUploadStatus('Upload successful!');
          console.log('Upload success:', event);
        }}
        onUploadError={(error: any) => {
          setUploadStatus('Upload failed!');
          console.error('Upload error:', error);
        }}

        // Additional props
        maxFileCount={5}
      />

      {uploadStatus && <p>{uploadStatus}</p>}
    </div>
  );
};

export default FileUpload;