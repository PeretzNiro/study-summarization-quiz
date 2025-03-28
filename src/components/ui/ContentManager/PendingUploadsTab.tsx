import React, { useState, useEffect } from 'react';
import {
  Card, Heading, Table, TableBody, TableCell, TableHead, TableRow,
  Button, Text, Alert, Flex, Loader, TextField, SelectField, 
  View, Divider
} from '@aws-amplify/ui-react';
import { CustomModal } from '../../ui/modal/CustomModal';

interface PendingUploadsTabProps {
  getAuthenticatedClient: () => Promise<any>;  // Function to get authenticated API client
  courses: any[];                              // Available courses data
  refreshLectures: () => void;                 // Callback to refresh lectures in parent component
}

interface Lecture {
  id: string;
  courseId?: string;
  lectureId?: string;
  title?: string;
  difficulty?: string;
  fileName?: string;
  fileType?: string;
  content?: string;
  createdAt: string;
  status?: string;
  [key: string]: any; // Allow other properties
}

/**
 * Component for reviewing and approving uploaded lecture documents
 * Allows admins to set metadata and trigger the content processing pipeline
 */
const PendingUploadsTab: React.FC<PendingUploadsTabProps> = ({ 
  getAuthenticatedClient,
  courses,
  refreshLectures
}) => {
  // State for lecture data
  const [pendingUploads, setPendingUploads] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<{type: string, text: string} | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Form state for editing lecture metadata
  const [editedValues, setEditedValues] = useState({
    courseId: '',
    lectureId: '',
    title: '',
    difficulty: 'Medium'
  });
  
  // State for lecture number
  const [lectureNumber, setLectureNumber] = useState<string>('1');

  // Function to generate lecture ID
  const generateLectureId = (courseId: string, lectureNumber: string): string => {
    const cleanCourseId = courseId.replace(/-Lecture-\d+$/, '');
    return `${cleanCourseId}-Lecture-${lectureNumber}`;
  };

  // Add this function to validate the lectureId format
  const isValidLectureId = (lectureId: string, courseId: string): boolean => {
    // Ensure lectureId starts with courseId and follows the pattern courseId-Lecture-#
    const pattern = new RegExp(`^${courseId}-Lecture-\\d+$`);
    return pattern.test(lectureId);
  };
  
  // Fetch pending uploads when component mounts
  useEffect(() => {
    fetchPendingUploads();
  }, []);
  
  /**
   * Fetch lectures with pending_review status from the database
   */
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
      const pendingItems = result.data?.filter((lecture: { status: string; }) => 
        lecture.status === 'pending_review'
      ) || [];
      
      setPendingUploads(pendingItems);
    } catch (error: any) {
      console.error('Error fetching pending uploads:', error);
      setError(`Failed to load pending uploads: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handle click on review button and populate the edit form
   */
  const handleReviewClick = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    
    // Extract lecture number from existing lectureId or default to "1"
    let extractedNumber = "1";
    if (lecture.lectureId) {
      const match = lecture.lectureId.match(/-Lecture-(\d+)$/);
      if (match && match[1]) {
        extractedNumber = match[1];
      }
    }
    
    setLectureNumber(extractedNumber);
    
    setEditedValues({
      courseId: lecture.courseId || '',
      lectureId: lecture.lectureId || generateLectureId(lecture.courseId || '', extractedNumber),
      title: lecture.title || '',
      difficulty: lecture.difficulty || 'Medium'
    });
    
    setIsModalOpen(true);
  };
  
  /**
   * Handle changes to form input fields
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'courseId') {
      // When courseId changes, update both courseId and generate a new lectureId
      setEditedValues({
        ...editedValues,
        courseId: value,
        lectureId: generateLectureId(value, lectureNumber)
      });
    } else if (name === 'lectureNumber') {
      // When lecture number changes, update the number and regenerate lectureId
      setLectureNumber(value);
      setEditedValues({
        ...editedValues,
        lectureId: generateLectureId(editedValues.courseId, value)
      });
    } else {
      // For all other fields, update normally
      setEditedValues({
        ...editedValues,
        [name]: value
      });
    }
  };
  
  /**
   * Approve lecture and start processing pipeline
   * Updates status to 'approved' which triggers backend processing
   */
  const handleApprove = async () => {
    if (!selectedLecture) return;
    
    // Validate that lectureId follows the correct format
    if (!isValidLectureId(editedValues.lectureId, editedValues.courseId)) {
      setActionMessage({
        type: 'error',
        text: 'Lecture ID must follow the format: CourseID-Lecture-#'
      });
      return;
    }
    
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
  
  /**
   * Reject and remove uploaded document from the database
   */
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
  
  /**
   * Manually refresh the list of pending uploads
   */
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
      
      {/* Status message display */}
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
      
      {/* Content loading states */}
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
      
      {/* Document review modal */}
      <CustomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <div className="custom-modal-content">
          <Heading level={3}>Review Document</Heading>
          
          {selectedLecture && (
            <View>
              <Flex direction="column" gap="1rem">
                {/* File information section */}
                <Text fontWeight="bold">File Details</Text>
                <Flex className="flex-wrap" direction="row" gap="1rem">
                  <Text><strong>File Name:</strong> {selectedLecture.fileName}</Text>
                  <Text><strong>Type:</strong> {selectedLecture.fileType}</Text>
                  <Text><strong>Uploaded:</strong> {new Date(selectedLecture.createdAt).toLocaleString()}</Text>
                </Flex>
                
                <Divider />
                
                {/* Metadata editing section */}
                <Heading level={5}>Edit Metadata</Heading>
                <Text>
                  Please review and correct the course/lecture information below.
                </Text>
                
                <Alert className='radius-s' variation="info" marginBottom="1rem">
                  <Text fontWeight="bold">Lecture ID Convention:</Text>
                  <Text>
                    Lecture IDs follow the format: <code>[CourseID]-Lecture-[Number]</code><br />
                    Example: <code>COMP-1811-Lecture-3</code>
                  </Text>
                </Alert>
                
                {/* Course selection with dropdown and manual entry */}
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
                            courseId: value,
                            lectureId: generateLectureId(value, lectureNumber)
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
                
                {/* Lecture metadata fields */}
                <View marginBottom="1rem">
                  <Text as="label" fontWeight="bold">Lecture Information</Text>
                  <Flex direction="column" gap="0.5rem">
                    <SelectField
                      label={null}
                      name="lectureNumber"
                      value={lectureNumber}
                      onChange={handleInputChange}
                      descriptiveText="Select the lecture number"
                    >
                      {[...Array(30)].map((_, i) => (
                        <option key={i+1} value={String(i+1)}>
                          Lecture {i+1}
                        </option>
                      ))}
                    </SelectField>
                    
                    <TextField
                      label="Generated Lecture ID"
                      name="lectureId"
                      value={editedValues.lectureId}
                      isReadOnly
                      variation="quiet"
                      descriptiveText="This ID is automatically generated from Course ID and Lecture Number"
                    />
                  </Flex>
                </View>
                
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
                
                {/* Content preview with scrollable container */}
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
                
                {/* Action buttons */}
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