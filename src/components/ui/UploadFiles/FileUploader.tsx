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

/**
 * File upload component for course materials
 * Handles uploading PDF and PowerPoint files to S3 with folder organization
 */
const FileUpload: React.FC = () => {
  // State for managing upload status and UI feedback
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [folderName, setFolderName] = useState<string>('');
  const [, setCurrentPath] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showUploader, setShowUploader] = useState<boolean>(false);
  const [uploadResults, setUploadResults] = useState<Array<{fileName: string, status: 'success' | 'error', message?: string}>>([]);
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState<boolean>(false);
  
  // State for duplicate file handling
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateFileName, setDuplicateFileName] = useState('');
  const [pendingFileUpload, setPendingFileUpload] = useState<any>(null);
  const [isUploaderDisabled, setIsUploaderDisabled] = useState<boolean>(false);
  
  // Reference to hidden file input for custom styling
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load available folders when component mounts
  useEffect(() => {
    loadFolders();
  }, []);
  
  /**
   * Fetch list of existing folders from S3 storage
   */
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

  /**
   * Handle folder name input changes with validation
   */
  const handleFolderNameChange = (value: string) => {
    // Remove slashes to prevent nested folder creation
    setFolderName(value.replace(/[/\\]/g, ''));
  };

  /**
   * Handle folder selection from autocomplete dropdown
   */
  const handleFolderSelect = (selected: string) => {
    setFolderName(selected);
  };

  /**
   * Set up the upload environment after folder selection
   */
  const handlePrepareUpload = async () => {
    if (!folderName.trim()) {
      setUploadStatus('Please enter a folder name');
      return;
    }
    
    // Format the path for S3 folder structure
    const formattedPath = `${folderName.trim()}/`;
    setCurrentPath(formattedPath);
    setShowUploader(true);
    setUploadStatus('');
    setUploadResults([]);
    
    // Add new folders to the available folders list
    if (!availableFolders.includes(folderName.trim())) {
      setAvailableFolders(prev => [...prev, folderName.trim()]);
    }
  };

  /**
   * Reset the uploader to initial state
   */
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
  
  /**
   * Process file selection and check for duplicates before upload
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]; 
      const originalFileName = file.name;
      const sanitizedFileName = sanitizeFileName(originalFileName);
      
      try {
        // Prevent additional file selection during processing
        setIsUploaderDisabled(true);
        
        // Check if file with same name exists in the folder
        const fileExists = await StorageService.checkFileExists(folderName, sanitizedFileName);
        
        if (fileExists) {
          // Store file info for potential replacement
          const fileToUpload = new File([file], sanitizedFileName, { type: file.type });
          setPendingFileUpload({
            file: fileToUpload, 
            key: `${folderName}/${sanitizedFileName}`,
            originalName: originalFileName
          });
          setDuplicateFileName(sanitizedFileName);
          setShowDuplicateModal(true);
          
          // Reset file input for next selection
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          
          return;
        }
        
        // If no duplicate, proceed with upload
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
  
  /**
   * Upload a file to S3 with proper error handling
   */
  const handleDirectUpload = async (file: File) => {
    setIsUploading(true);
    setUploadStatus('Uploading...');
    
    try {
      // Sanitize the filename for S3 compatibility
      const originalFileName = file.name;
      const sanitizedFileName = sanitizeFileName(originalFileName);
      
      // Create a new file with sanitized name if needed
      let fileToUpload = file;
      let displayFileName = originalFileName;
      
      if (sanitizedFileName !== originalFileName) {
        fileToUpload = new File([file], sanitizedFileName, { type: file.type });
        displayFileName = `${originalFileName} (uploaded as ${sanitizedFileName})`;
      }
      
      const filePath = `${folderName}/${sanitizedFileName}`;
      
      // Upload to S3 with protected access level
      await uploadData({
        key: filePath,
        data: fileToUpload,
        options: {
          accessLevel: 'protected'
        }
      });
      
      // Update UI with success status
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
      // Handle upload failures
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
  
  /**
   * Replace an existing file when confirmed by user
   */
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
        
        // Delete the existing file first
        await StorageService.deleteFile(filePath);
        
        // Upload the new version
        await uploadData({
          key: filePath,
          data: pendingFileUpload.file,
          options: {
            accessLevel: 'protected'
          }
        });
        
        // Update UI with success status
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
        // Handle replacement failures
        console.error('Error replacing file:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setUploadStatus('Failed to replace file: ' + errorMessage);
        
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
  
  /**
   * Cancel file replacement action
   */
  const handleCancelReplace = () => {
    setShowDuplicateModal(false);
    setUploadStatus('Upload canceled for duplicate file.');
    setPendingFileUpload(null);
  };

  /**
   * Sanitize filenames for S3 compatibility
   * Replaces spaces and special characters with safe alternatives
   */
  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .replace(/\s+/g, '_')                 // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9._-]/g, '')      // Remove special characters
      .replace(/_{2,}/g, '_');              // Remove duplicate underscores
  };

  return (
    <div className='file-uploader-container'>
      <Heading level={2} marginBottom="1.5rem">Course Materials Uploader</Heading>
      
      <Card variation="elevated" className='radius'>
        <Heading level={3} marginBottom="1rem">Upload PDF & PowerPoint Files</Heading>
        <Text>Upload lecture materials that will be processed and added to courses</Text>
        
        <Divider marginTop="1rem" marginBottom="1rem" />
        
        {/* Folder selection phase */}
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
            {/* File upload phase */}
            <Alert className='radius-s' variation="info" marginBottom="1rem">
              Files will be uploaded to folder: <strong>{folderName}</strong>
            </Alert>
            
            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              accept=".pdf,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              aria-label="Upload lecture document"
            />
            
            {/* Custom styled upload button */}
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

            {/* Upload progress indicator */}
            {isUploading && (
              <Alert className='radius-s' variation="info" marginBottom="1rem">
                Uploading... Please wait.
              </Alert>
            )}
            
            {/* Results display section */}
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
            
            {/* Action buttons */}
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
      
      {/* Status message display */}
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
      
      {/* Duplicate file confirmation modal */}
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