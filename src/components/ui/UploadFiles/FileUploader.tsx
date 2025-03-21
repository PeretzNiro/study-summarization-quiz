import React, { useState, useEffect, useRef } from 'react';
import { uploadData } from 'aws-amplify/storage';
import { 
  Heading, 
  Card, 
  Flex, 
  Button, 
  Alert, 
  Text,
  Divider
} from '@aws-amplify/ui-react';
import { StorageService } from '../../../services/StorageService';
import { Autocomplete } from '../common/Autocomplete';
import { CustomModal } from '../modal/CustomModal';
import './FileUploader.css';

const FileUpload: React.FC = () => {
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [folderName, setFolderName] = useState<string>('');
  const [, setCurrentPath] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showUploader, setShowUploader] = useState<boolean>(false);
  const [uploadResults, setUploadResults] = useState<Array<{fileName: string, status: 'success' | 'error', message?: string}>>([]);
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState<boolean>(false);
  
  // For duplicate file handling
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateFileName, setDuplicateFileName] = useState('');
  const [pendingFileUpload, setPendingFileUpload] = useState<any>(null);
  
  // New state to disable the uploader when checking for duplicates
  const [isUploaderDisabled, setIsUploaderDisabled] = useState<boolean>(false);
  
  // Ref to the hidden file input for custom file selection
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load available folders on component mount
  useEffect(() => {
    loadFolders();
  }, []);
  
  // Load folders from S3
  const loadFolders = async () => {
    setIsLoadingFolders(true);
    try {
      const folders = await StorageService.listFolders();
      setAvailableFolders(folders);
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  // Handle folder name change (manual input)
  const handleFolderNameChange = (value: string) => {
    // Remove any slashes to avoid creating nested folders unintentionally
    setFolderName(value.replace(/[/\\]/g, ''));
  };

  // Handle folder selection from autocomplete
  const handleFolderSelect = (selected: string) => {
    setFolderName(selected);
  };

  // Set up the upload path when the user confirms the folder
  const handlePrepareUpload = async () => {
    if (!folderName.trim()) {
      setUploadStatus('Please enter a folder name');
      return;
    }
    
    // Use the folder name directly without prefix
    const formattedPath = `${folderName.trim()}/`;
    setCurrentPath(formattedPath);
    setShowUploader(true);
    setUploadStatus('');
    setUploadResults([]);
    
    // If this is a new folder, add it to the list
    if (!availableFolders.includes(folderName.trim())) {
      setAvailableFolders(prev => [...prev, folderName.trim()]);
    }
  };

  // Reset the uploader
  const handleReset = () => {
    setFolderName('');
    setCurrentPath('');
    setShowUploader(false);
    setUploadStatus('');
    setUploadResults([]);
    setIsUploading(false);
    setPendingFileUpload(null);
    setIsUploaderDisabled(false);
  };
  
  // Custom function to handle file selection before upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]; // Get just the first file for simplicity
      const originalFileName = file.name;
      const sanitizedFileName = sanitizeFileName(originalFileName);
      
      try {
        // Disable the uploader to prevent other uploads
        setIsUploaderDisabled(true);
        
        // Check if file exists with the sanitized name
        const fileExists = await StorageService.checkFileExists(folderName, sanitizedFileName);
        
        if (fileExists) {
          // Store file info for later use with sanitized name
          const fileToUpload = new File([file], sanitizedFileName, { type: file.type });
          setPendingFileUpload({
            file: fileToUpload, 
            key: `${folderName}/${sanitizedFileName}`,
            originalName: originalFileName
          });
          setDuplicateFileName(sanitizedFileName);
          setShowDuplicateModal(true);
          
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          
          return;
        }
        
        // If no duplicate, upload directly
        await handleDirectUpload(file);
      } catch (error) {
        console.error('Error checking for duplicate file:', error);
        setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsUploaderDisabled(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };
  
  // Handle direct file upload
  const handleDirectUpload = async (file: File) => {
    setIsUploading(true);
    setUploadStatus('Uploading...');
    
    try {
      // Sanitize the file name
      const originalFileName = file.name;
      const sanitizedFileName = sanitizeFileName(originalFileName);
      
      // Create a new file with the sanitized name if needed
      let fileToUpload = file;
      let displayFileName = originalFileName;
      
      if (sanitizedFileName !== originalFileName) {
        // Create a new File object with the sanitized name
        fileToUpload = new File([file], sanitizedFileName, { type: file.type });
        displayFileName = `${originalFileName} (uploaded as ${sanitizedFileName})`;
      }
      
      const filePath = `${folderName}/${sanitizedFileName}`;
      
      await uploadData({
        key: filePath,
        data: fileToUpload,
        options: {
          accessLevel: 'protected'
        }
      });
      
      // Show success message and add to results
      setUploadStatus('Upload successful!');
      setUploadResults(prev => [
        ...prev, 
        {
          fileName: displayFileName,
          status: 'success',
          message: `Successfully uploaded to ${folderName}/`
        }
      ]);
    } catch (error: unknown) {
      // Error handling remains the same
      console.error('Error uploading file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setUploadStatus(`Upload failed: ${errorMessage}`);
      setUploadResults(prev => [
        ...prev, 
        {
          fileName: file.name,
          status: 'error',
          message: `Error: ${errorMessage}`
        }
      ]);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Confirm replacing the file
  const handleReplaceFile = async () => {
    setShowDuplicateModal(false);
    
    if (pendingFileUpload) {
      try {
        const sanitizedFileName = pendingFileUpload.file.name;
        const filePath = `${folderName}/${sanitizedFileName}`;
        const displayFileName = pendingFileUpload.originalName
          ? `${pendingFileUpload.originalName} (uploaded as ${sanitizedFileName})`
          : sanitizedFileName;
        
        setUploadStatus('Replacing file...');
        
        // Delete existing file
        await StorageService.deleteFile(filePath);
        
        // Now upload the new file directly
        await uploadData({
          key: filePath,
          data: pendingFileUpload.file,
          options: {
            accessLevel: 'protected'
          }
        });
        
        // Show success message and add to results
        setUploadStatus('File replaced successfully!');
        setUploadResults(prev => [
          ...prev, 
          {
            fileName: displayFileName,
            status: 'success',
            message: `Successfully replaced in ${folderName}/`
          }
        ]);
      } catch (error: unknown) {
        console.error('Error replacing file:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setUploadStatus('Failed to replace file: ' + errorMessage);
        
        // Add to error results
        setUploadResults(prev => [
          ...prev, 
          {
            fileName: pendingFileUpload.file.name,
            status: 'error',
            message: `Error replacing file: ${errorMessage}`
          }
        ]);
      } finally {
        setPendingFileUpload(null);
      }
    }
  };
  
  // Cancel replacing the file
  const handleCancelReplace = () => {
    setShowDuplicateModal(false);
    setUploadStatus('Upload canceled for duplicate file.');
    setPendingFileUpload(null);
  };

  // Add this function to your component
  const sanitizeFileName = (fileName: string): string => {
    // Replace spaces with underscores and remove any special characters
    return fileName
      .replace(/\s+/g, '_')                 // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9._-]/g, '')      // Remove special characters except dots, underscores, and hyphens
      .replace(/_{2,}/g, '_');              // Replace multiple consecutive underscores with a single one
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
            <Autocomplete
              options={availableFolders}
              value={folderName}
              onChange={handleFolderNameChange}
              onSelect={handleFolderSelect}
              label="Course Folder Name"
              placeholder="e.g., python-fundamentals"
              descriptiveText="Select an existing folder or create a new one"
              required
              loadingState={isLoadingFolders}
            />
            
            <Flex justifyContent="flex-end" marginTop="1.5rem">
              <Button onClick={handlePrepareUpload} variation="primary" isDisabled={!folderName.trim()}>
                Continue to Upload
              </Button>
            </Flex>
          </>
        ) : (
          <>
            <Alert className='radius-s' variation="info" marginBottom="1rem">
              Files will be uploaded to folder: <strong>{folderName}</strong>
            </Alert>
            
            {/* Hidden file input for custom file selection */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              accept=".pdf,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            />
            
            {/* Custom upload button */}
            <Button
              onClick={() => fileInputRef.current?.click()}
              variation="primary"
              isDisabled={isUploading || isUploaderDisabled}
              marginBottom="1rem"
              width="100%"
              size="large"
            >
              {isUploading ? 'Uploading...' : 'Select File to Upload'}
            </Button>

            {isUploading && (
              <Alert className='radius-s' variation="info" marginBottom="1rem">
                Uploading... Please wait.
              </Alert>
            )}
            
            {uploadResults.length > 0 && (
              <div className="upload-results">
                <Heading level={5} marginTop="1.5rem" marginBottom="0.5rem">Upload Results:</Heading>
                {uploadResults.map((result, index) => (
                  <Alert
                    className='radius-s'
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
          className='radius-s'
          variation={uploadStatus.includes('failed') || uploadStatus.includes('Error') ? 'error' : 
                    uploadStatus.includes('successful') || uploadStatus.includes('replaced') ? 'success' : 'info'}
          marginTop="1rem"
        >
          {uploadStatus}
        </Alert>
      )}
      
      {/* File duplicate confirmation modal */}
      <CustomModal isOpen={showDuplicateModal} onClose={handleCancelReplace}>
        <Heading level={3} padding="1rem 1.5rem" style={{ borderBottom: "1px solid #e0e0e0" }}>
          File Already Exists
        </Heading>
        
        <div className="modal-body">
          <Text>A file named <strong>{duplicateFileName}</strong> already exists in the folder <strong>{folderName}</strong>.</Text>
          
          <Alert className='radius-s' variation="warning" marginTop="1rem">
            Would you like to replace the existing file?
          </Alert>
        </div>
        
        <div className="modal-footer">
          <Flex justifyContent="space-between" width="100%">
            <Button variation="link" onClick={handleCancelReplace}>
              Cancel
            </Button>
            <Button variation="primary" onClick={handleReplaceFile}>
              Replace File
            </Button>
          </Flex>
        </div>
      </CustomModal>
    </div>
  );
};

export default FileUpload;