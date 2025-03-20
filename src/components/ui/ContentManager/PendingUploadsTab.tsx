import React, { useState, useEffect } from 'react';
import {
  Card, Heading, Table, TableBody, TableCell, TableHead, TableRow,
  Button, Text, Alert, Flex, Loader, TextField, SelectField, 
  View, Divider
} from '@aws-amplify/ui-react';
import { CustomModal } from '../../ui/modal/CustomModal';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../amplify/data/resource';
import { fetchAuthSession } from 'aws-amplify/auth';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

interface PendingUploadsTabProps {
  getAuthenticatedClient: () => Promise<any>;
  courses: any[];
  refreshLectures: () => void;
}

const PendingUploadsTab: React.FC<PendingUploadsTabProps> = ({ 
  getAuthenticatedClient,
  courses,
  refreshLectures
}) => {
  const [pendingUploads, setPendingUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLecture, setSelectedLecture] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<{type: string, text: string} | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Form state
  const [editedValues, setEditedValues] = useState({
    courseId: '',
    lectureId: '',
    title: '',
    difficulty: 'Medium'
  });
  
  // Fetch pending uploads when component mounts
  useEffect(() => {
    fetchPendingUploads();
  }, []);
  
  const fetchPendingUploads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const authClient = await getAuthenticatedClient();
      
      // Get all lectures first
      const result = await authClient.models.Lecture.list();
      
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }
      
      // Filter them client-side for status
      const pendingItems = result.data?.filter(lecture => 
        lecture.status === 'pending_review'
      ) || [];
      
      console.log(`Found ${pendingItems.length} pending lectures out of ${result.data?.length || 0} total`);
      
      // Log the first few to see what they look like
      if (pendingItems.length > 0) {
        console.log('First pending item:', pendingItems[0]);
      } else {
        // Log a few regular lectures to see if status is present
        if (result.data && result.data.length > 0) {
          console.log('Sample lecture:', result.data[0]);
        }
      }
      
      setPendingUploads(pendingItems);
    } catch (error: any) {
      console.error('Error fetching pending uploads:', error);
      setError(`Failed to load pending uploads: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleReviewClick = (lecture: any) => {
    setSelectedLecture(lecture);
    setEditedValues({
      courseId: lecture.courseId || '',
      lectureId: lecture.lectureId || '',
      title: lecture.title || '',
      difficulty: lecture.difficulty || 'Medium'
    });
    setIsModalOpen(true);
  };
  
  // Update the handleInputChange function to handle both dropdown and text input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If changing courseId through the text field, update both courseId
    if (name === 'courseId') {
      setEditedValues({
        ...editedValues,
        courseId: value
      });
    } else {
      // For all other fields, update normally
      setEditedValues({
        ...editedValues,
        [name]: value
      });
    }
  };
  
  const handleApprove = async () => {
    if (!selectedLecture) return;
    
    try {
      setLoading(true);
      
      const authClient = await getAuthenticatedClient();
      
      // Update the lecture through GraphQL API
      const result = await authClient.models.Lecture.update({
        id: selectedLecture.id,
        courseId: editedValues.courseId,
        lectureId: editedValues.lectureId,
        title: editedValues.title,
        difficulty: editedValues.difficulty,
        status: 'approved' // This triggers the summarization in the backend
      });
      
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }
      
      setActionMessage({
        type: 'success',
        text: 'Document approved successfully. Summarization process started.'
      });
      
      // Close modal and refresh
      setIsModalOpen(false);
      await fetchPendingUploads();
      refreshLectures(); // Refresh parent lectures list too
      
      // Set timeout to clear message
      setTimeout(() => setActionMessage(null), 5000);
    } catch (error: any) {
      console.error('Error approving lecture:', error);
      setActionMessage({
        type: 'error',
        text: `Failed to approve: ${error.message || 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleReject = async () => {
    if (!selectedLecture) return;
    
    try {
      setLoading(true);
      
      const authClient = await getAuthenticatedClient();
      
      // Delete the lecture
      const result = await authClient.models.Lecture.delete({
        id: selectedLecture.id
      });
      
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }
      
      setActionMessage({
        type: 'info',
        text: 'Document rejected and removed.'
      });
      
      // Close modal and refresh
      setIsModalOpen(false);
      await fetchPendingUploads();
      
      // Set timeout to clear message
      setTimeout(() => setActionMessage(null), 5000);
    } catch (error: any) {
      console.error('Error rejecting lecture:', error);
      setActionMessage({
        type: 'error',
        text: `Failed to reject: ${error.message || 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPendingUploads();
    setIsRefreshing(false);
  };

  return (
    <Card className='radius overflow-x-scroll'>
      <Flex direction="row" justifyContent="space-between" alignItems="center" marginBottom="1rem">
        <Heading level={4}>Pending Uploads</Heading>
        
        <Button
          variation="link"
          size="small"
          onClick={handleRefresh}
          isLoading={isRefreshing}
          loadingText="Refreshing..."
        >
          {isRefreshing ? "Refreshing..." : "↻ Refresh"}
        </Button>
      </Flex>
      
      {actionMessage && (
        <Alert 
          variation={actionMessage.type as any} 
          isDismissible={true}
          onDismiss={() => setActionMessage(null)}
          marginBottom="1rem"
        >
          {actionMessage.text}
        </Alert>
      )}
      
      {loading && !selectedLecture ? (
        <Flex justifyContent="center" padding="2rem">
          <Loader size="large" />
        </Flex>
      ) : error ? (
        <Alert variation="error">{error}</Alert>
      ) : pendingUploads.length === 0 ? (
        <View>
          <Alert variation="info" marginBottom="1rem">No pending uploads to review</Alert>
          <Text fontSize="0.9rem" color="var(--amplify-colors-neutral-80)">
            When new documents are uploaded, they will appear here for review.
            Click the refresh button to check for new uploads.
          </Text>
        </View>
      ) : (
        <Table highlightOnHover>
          <TableHead>
            <TableRow>
              <TableCell as="th">File Name</TableCell>
              <TableCell as="th">Extracted Course ID</TableCell>
              <TableCell as="th">Extracted Lecture ID</TableCell>
              <TableCell as="th">Uploaded</TableCell>
              <TableCell as="th">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingUploads.map(lecture => (
              <TableRow key={lecture.id}>
                <TableCell>{lecture.fileName || 'Unknown'}</TableCell>
                <TableCell>{lecture.courseId || 'Not extracted'}</TableCell>
                <TableCell>{lecture.lectureId || 'Not extracted'}</TableCell>
                <TableCell>{new Date(lecture.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Button
                    variation="primary"
                    size="small"
                    onClick={() => handleReviewClick(lecture)}
                  >
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      
      {/* Review Modal */}
      <CustomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <div className="custom-modal-content">
          <Heading level={3}>Review Document</Heading>
          
          {selectedLecture && (
            <View>
              <Flex direction="column" gap="1rem">
                <Text fontWeight="bold">File Details</Text>
                <Flex className="flex-wrap" direction="row" gap="1rem">
                  <Text><strong>File Name:</strong> {selectedLecture.fileName}</Text>
                  <Text><strong>Type:</strong> {selectedLecture.fileType}</Text>
                  <Text><strong>Uploaded:</strong> {new Date(selectedLecture.createdAt).toLocaleString()}</Text>
                </Flex>
                
                <Divider />
                
                <Heading level={5}>Edit Metadata</Heading>
                <Text>
                  Please review and correct the course/lecture information below.
                </Text>
                
                <View>
                  <Text as="label" fontWeight="bold">Course ID</Text>
                  <Flex direction="column" gap="0.5rem">
                    <SelectField
                      label={null}
                      name="courseIdSelect"
                      value={editedValues.courseId}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "new") {
                          // If "Enter new course ID" is selected, don't update the value yet
                          // This will keep the field open for manual entry
                        } else {
                          // Otherwise update with the selected course
                          setEditedValues({
                            ...editedValues,
                            courseId: value
                          });
                        }
                      }}
                      descriptiveText="Select an existing course or enter a new one below"
                    >
                      <option value="">-- Select Course --</option>
                      {courses.map(course => (
                        <option key={course.courseId} value={course.courseId}>
                          {course.courseId} - {course.title}
                        </option>
                      ))}
                      <option value="new">✨ Enter new course ID</option>
                    </SelectField>
                    
                    {/* Manual entry field */}
                    <TextField
                      label={null}
                      name="courseId"
                      value={editedValues.courseId}
                      onChange={handleInputChange}
                      placeholder="Enter course ID (e.g., COMP1811)"
                      descriptiveText="Edit the course ID directly or type a new one"
                    />
                  </Flex>
                </View>
                
                <TextField
                  label="Lecture ID"
                  name="lectureId"
                  value={editedValues.lectureId}
                  onChange={handleInputChange}
                  descriptiveText="Enter a consistent lecture ID (e.g., Lecture1, Week2)"
                />
                
                <TextField
                  label="Title"
                  name="title"
                  value={editedValues.title}
                  onChange={handleInputChange}
                  descriptiveText="Enter a descriptive title for this lecture"
                />
                
                <SelectField
                  label="Difficulty"
                  name="difficulty"
                  value={editedValues.difficulty}
                  onChange={handleInputChange}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </SelectField>
                
                <Divider />
                
                <Heading level={5}>Content Preview</Heading>
                <View 
                  style={{ 
                    maxHeight: '300px', 
                    overflow: 'auto', 
                    padding: '1rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                >
                  <pre style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedLecture.content ? 
                      (selectedLecture.content.length > 2000 
                        ? selectedLecture.content.substring(0, 2000) + '...' 
                        : selectedLecture.content) 
                      : 'No content available'}
                  </pre>
                </View>
                
                <Flex justifyContent="space-between" width="100%" marginTop="1rem">
                  <Button
                    variation="destructive"
                    onClick={handleReject}
                    isLoading={loading}
                  >
                    Reject Document
                  </Button>
                  <Button
                    variation="primary"
                    onClick={handleApprove}
                    isLoading={loading}
                    isDisabled={!editedValues.courseId || !editedValues.lectureId || !editedValues.title}
                  >
                    Approve & Process
                  </Button>
                </Flex>
              </Flex>
            </View>
          )}
        </div>
      </CustomModal>
    </Card>
  );
};

export default PendingUploadsTab;