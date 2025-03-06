import React, { useState } from 'react';
import { FileUploader } from '@aws-amplify/ui-react-storage';
import { 
  Heading, 
  Card, 
  TextField, 
  Flex, 
  Button, 
  Alert, 
  Text,
  Divider
} from '@aws-amplify/ui-react';
import './FileUploader.css';

const FileUpload: React.FC = () => {
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [folderName, setFolderName] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showUploader, setShowUploader] = useState<boolean>(false);
  const [uploadResults, setUploadResults] = useState<Array<{fileName: string, status: 'success' | 'error', message?: string}>>([]);

  // Handle folder name input
  const handleFolderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove any slashes to avoid creating nested folders unintentionally
    setFolderName(e.target.value.replace(/[/\\]/g, ''));
  };

  // Set up the upload path when the user confirms the folder
  const handlePrepareUpload = () => {
    if (!folderName.trim()) {
      setUploadStatus('Please enter a folder name');
      return;
    }
    
    // Format the path correctly - ensure it ends with a trailing slash for S3
    const formattedPath = `${folderName.trim()}/`;
    setCurrentPath(formattedPath);
    setShowUploader(true);
    setUploadStatus('');
    setUploadResults([]);
  };

  // Reset the uploader
  const handleReset = () => {
    setFolderName('');
    setCurrentPath('');
    setShowUploader(false);
    setUploadStatus('');
    setUploadResults([]);
    setIsUploading(false);
  };

  return (
    <div className='file-uploader-container'>
      <Heading level={2} marginBottom="1.5rem">Course Materials Uploader</Heading>
      
      <Card variation="elevated" className='radius'>
        <Heading level={3} marginBottom="1rem">Upload PDF & PowerPoint Files</Heading>
        <Text>Upload lecture materials that will be processed and added to courses</Text>
        
        <Divider marginTop="1rem" marginBottom="1rem" />
        
        {!showUploader ? (
          <>
            <TextField
              label="Course Folder Name"
              placeholder="e.g., python-fundamentals"
              value={folderName}
              onChange={handleFolderNameChange}
              descriptiveText="This will create or use an existing folder in S3 with this name"
              isRequired
            />
            
            <Flex justifyContent="flex-end" marginTop="1.5rem">
              <Button onClick={handlePrepareUpload} variation="primary" isDisabled={!folderName.trim()}>
                Continue to Upload
              </Button>
            </Flex>
          </>
        ) : (
          <>
            <Alert variation="info" marginBottom="1rem">
              Files will be uploaded to folder: <strong>{folderName}</strong>
            </Alert>
            
            <FileUploader
              path={currentPath}
              acceptedFileTypes={['.pdf', '.ppt', '.pptx', 'application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']}
              accessLevel="private"
              maxFileCount={10}
              maxFileSize={100000000} // 100MB max file size
              onUploadStart={() => {
                setIsUploading(true);
                setUploadStatus('Uploading...');
              }}
              onUploadSuccess={(event: any) => {
                setIsUploading(false);
                setUploadStatus('Upload successful!');
                console.log('Upload success:', event);
                
                // Add to upload results
                setUploadResults(prev => [
                  ...prev, 
                  {
                    fileName: event.key.split('/').pop() || 'file',
                    status: 'success',
                    message: `Successfully uploaded to ${folderName}/`
                  }
                ]);
              }}
              onUploadError={(error: any, { key }: { key: string }) => {
                setIsUploading(false);
                setUploadStatus('Upload failed!');
                console.error('Upload error:', error);
                
                // Add to upload results
                setUploadResults(prev => [
                  ...prev, 
                  {
                    fileName: key.split('/').pop() || 'file',
                    status: 'error',
                    message: `Error: ${error.message || 'Unknown error'}`
                  }
                ]);
              }}
            />
            
            {uploadResults.length > 0 && (
              <div className="upload-results">
                <Heading level={5} marginTop="1.5rem" marginBottom="0.5rem">Upload Results:</Heading>
                {uploadResults.map((result, index) => (
                  <Alert
                    key={index}
                    variation={result.status === 'success' ? 'success' : 'error'}
                    marginBottom="0.5rem"
                    isDismissible
                  >
                    <strong>{result.fileName}</strong>: {result.message}
                  </Alert>
                ))}
              </div>
            )}
            
            <Flex justifyContent="space-between" marginTop="1.5rem">
              <Button onClick={handleReset} variation="link" isDisabled={isUploading}>
                Change Folder
              </Button>
              {uploadResults.length > 0 && (
                <Button onClick={handleReset} variation="primary">
                  Upload More Files
                </Button>
              )}
            </Flex>
          </>
        )}
      </Card>
      
      {uploadStatus && !showUploader && (
        <Alert 
          variation={uploadStatus.includes('failed') ? 'error' : uploadStatus.includes('successful') ? 'success' : 'info'}
          marginTop="1rem"
        >
          {uploadStatus}
        </Alert>
      )}
    </div>
  );
};

export default FileUpload;