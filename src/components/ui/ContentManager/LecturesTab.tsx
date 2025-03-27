import React, { useState, useEffect } from 'react';
import {
  Heading, 
  Flex, 
  Card, 
  Button, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody,
  Pagination,
  SearchField,
  SelectField,
  Loader,
  Alert,
  Badge,
  Accordion,
  TextField,
  TextAreaField,
} from '@aws-amplify/ui-react';
import { CustomModal } from '../../ui/modal/CustomModal';
import { ActionMessage } from './types';

interface LecturesTabProps {
  getAuthenticatedClient: () => Promise<any>;  // Function to get authenticated API client
  courses: any[];                              // Available courses data
  lectures: any[];                             // Available lectures data
  courseFilter: string;                        // Initial course filter value
  setCourseFilter: React.Dispatch<React.SetStateAction<string>>;  // Function to update course filter
  refreshLectures: () => Promise<void>;        // Function to refresh lecture data
}

/**
 * Component for managing lecture content
 * Provides filtering, editing and detailed viewing of course lecture materials
 */
const LecturesTab: React.FC<LecturesTabProps> = ({ 
  getAuthenticatedClient
}) => {
  // State for lectures data
  const [lectures, setLectures] = useState<any[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>('');
  const [courses, setCourses] = useState<any[]>([]);
  const [lectureLoading, setLectureLoading] = useState(true);
  const [lectureError, setLectureError] = useState<string | null>(null);
  const [lecturePage, setLecturePage] = useState(1);
  const [lectureSearch, setLectureSearch] = useState('');
  const lecturesPerPage = 10;

  // State for lecture editing modal
  const [editingLecture, setEditingLecture] = useState<any | null>(null);
  const [isLectureModalOpen, setIsLectureModalOpen] = useState(false);

  // User feedback messaging
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);

  // State for refreshing lectures
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Fetch course data when component mounts
   */
  useEffect(() => {
    async function fetchCourses() {
      try {
        const authClient = await getAuthenticatedClient();
        const { data } = await authClient.models.Course.list();
        if (data) {
          setCourses(data);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    }
    fetchCourses();
  }, [getAuthenticatedClient]);

  /**
   * Fetch lectures when course filter changes
   * Applies filtering on the server side for better performance
   */
  useEffect(() => {
    async function fetchLectures() {
      try {
        setLectureLoading(true);
        setLectureError(null);
        
        // Build filter based on selected course
        const filter = courseFilter ? 
          { courseId: { eq: courseFilter } } : 
          undefined;
        
        const authClient = await getAuthenticatedClient();
        const result = await authClient.models.Lecture.list({ filter });
        
        if (result.errors && result.errors.length > 0) {
          throw new Error(`Failed to fetch lectures: ${result.errors[0].message}`);
        }
        
        setLectures(result.data || []);
      } catch (error: any) {
        console.error('Error fetching lectures:', error);
        setLectureError(`Failed to load lectures: ${error.message || 'Unknown error'}`);
      } finally {
        setLectureLoading(false);
      }
    }
    
    fetchLectures();
  }, [courseFilter, getAuthenticatedClient]);

  // Filter lectures by search term
  const filteredLecturesData = lectures.filter(lecture => 
    lecture.title?.toLowerCase().includes(lectureSearch.toLowerCase()) ||
    lecture.lectureId?.toLowerCase().includes(lectureSearch.toLowerCase())
  );

  // Paginate lectures
  const paginatedLectures = filteredLecturesData.slice(
    (lecturePage - 1) * lecturesPerPage,
    lecturePage * lecturesPerPage
  );

  /**
   * Update lecture with edited form values
   * @param event Form submission event
   */
  const handleLectureUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    
    try {
      // Normalize difficulty case for consistent storage
      const formattedDifficulty = editingLecture.difficulty?.toLowerCase() === 'easy' ? 'Easy' :
                                editingLecture.difficulty?.toLowerCase() === 'medium' ? 'Medium' :
                                editingLecture.difficulty?.toLowerCase() === 'hard' ? 'Hard' :
                                'Medium'; // Default
      
      const authClient = await getAuthenticatedClient();
      await authClient.models.Lecture.update({
        id: editingLecture.id,
        courseId: editingLecture.courseId,
        lectureId: editingLecture.lectureId,
        title: editingLecture.title,
        content: editingLecture.content,
        difficulty: formattedDifficulty,
        duration: editingLecture.duration,
        summary: editingLecture.summary
      });
      
      // Update local state with the properly formatted difficulty
      const updatedLecture = {
        ...editingLecture,
        difficulty: formattedDifficulty
      };
      
      setLectures(lectures.map(lecture => 
        lecture.id === editingLecture.id ? updatedLecture : lecture
      ));
      
      // Reset UI state
      setIsLectureModalOpen(false);
      setEditingLecture(null);
      
      // Show success feedback
      setActionMessage({ text: 'Lecture updated successfully', type: 'success' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (error) {
      console.error('Error updating lecture:', error);
      setActionMessage({ text: 'Failed to update lecture', type: 'error' });
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  /**
   * Manually refresh the list of lectures
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Fetch fresh lecture data
      setLectureLoading(true);
      setLectureError(null);
      
      // Build filter based on selected course
      const filter = courseFilter ? 
        { courseId: { eq: courseFilter } } : 
        undefined;
      
      const authClient = await getAuthenticatedClient();
      const result = await authClient.models.Lecture.list({ filter });
      
      if (result.errors && result.errors.length > 0) {
        throw new Error(`Failed to fetch lectures: ${result.errors[0].message}`);
      }
      
      setLectures(result.data || []);
      
    } catch (error: any) {
      console.error('Error refreshing lectures:', error);
      setLectureError(`Failed to load lectures: ${error.message || 'Unknown error'}`);
      
      // Show error message if refresh fails
      setActionMessage({ text: `Failed to refresh lectures: ${error.message || 'Unknown error'}`, type: 'error' });
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setLectureLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Render modal for editing lecture content
   * Includes form with fields for all editable properties
   */
  const renderLectureEditModal = () => (
    <CustomModal
      isOpen={isLectureModalOpen}
      onClose={() => {
        setIsLectureModalOpen(false);
        setEditingLecture(null);
      }}
    >
      <div className="custom-modal-content">
        <Heading level={3}>Edit Lecture</Heading>
        
        {editingLecture && (
          <form onSubmit={handleLectureUpdate}>
            {/* Basic lecture metadata fields */}
            <TextField
              label="Title"
              name="title"
              value={editingLecture.title || ''}
              onChange={e => setEditingLecture({...editingLecture, title: e.target.value})}
              required
              marginBottom="1rem"
            />
            
            <SelectField
              label="Difficulty"
              name="difficulty"
              value={editingLecture.difficulty?.toLowerCase() || ''}
              onChange={e => setEditingLecture({...editingLecture, difficulty: e.target.value})}
              marginBottom="1rem"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </SelectField>
            
            <TextField
              label="Duration"
              name="duration"
              value={editingLecture.duration || '30 minutes'}
              onChange={e => setEditingLecture({...editingLecture, duration: e.target.value})}
              marginBottom="1rem"
            />
            
            {/* Lecture content fields */}
            <TextAreaField
              label="Summary"
              name="summary"
              rows={5}
              value={editingLecture.summary || ''}
              onChange={e => setEditingLecture({...editingLecture, summary: e.target.value})}
              marginBottom="1rem"
            />
            
            <TextAreaField
              label="Content"
              name="content"
              rows={10}
              value={editingLecture.content || ''}
              onChange={e => setEditingLecture({...editingLecture, content: e.target.value})}
              marginBottom="1rem"
            />
            
            {/* Action buttons */}
            <Flex justifyContent="space-between">
              <Button 
                variation="link" 
                onClick={() => {
                  setIsLectureModalOpen(false);
                  setEditingLecture(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variation="primary">Save Changes</Button>
            </Flex>
          </form>
        )}
      </div>
    </CustomModal>
  );

  return (
    <Card className='radius overflow-x-scroll'>
      <Flex direction="row" justifyContent="space-between" alignItems="center" marginBottom="1rem">
        <Heading level={4}>Lecture Content</Heading>
        
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
      
      {/* Status and error messages */}
      {actionMessage && (
        <Alert 
          className='radius-s'
          variation={actionMessage.type} 
          isDismissible={true}
          onDismiss={() => setActionMessage(null)}
          marginBottom="1rem"
        >
          {actionMessage.text}
        </Alert>
      )}
      
      {/* Filter and search controls */}
      <Flex justifyContent="space-between" marginBottom="1rem">
        <SelectField
          label="Filter by Course"
          labelHidden
          value={courseFilter}
          onChange={e => setCourseFilter(e.target.value)}
        >
          <option value="">All Courses</option>
          {courses.map(course => (
            <option key={course.courseId} value={course.courseId}>
              {course.courseId} - {course.title}
            </option>
          ))}
        </SelectField>
        
        <SearchField
          label="Search lectures"
          placeholder="Search by title or ID"
          value={lectureSearch}
          onChange={e => setLectureSearch(e.target.value)}
          onClear={() => setLectureSearch('')}
          hasSearchButton={false}
          hasSearchIcon
        />
      </Flex>

      {/* Loading, error and empty states */}
      {lectureLoading ? (
        <Flex justifyContent="center" padding="2rem">
          <Loader size="large" />
        </Flex>
      ) : lectureError ? (
        <Alert className='radius-s' variation="error">{lectureError}</Alert>
      ) : paginatedLectures.length === 0 ? (
        <Alert className='radius-s' variation="info">No lectures found</Alert>
      ) : (
        <>
          {/* Lectures data table */}
          <Table highlightOnHover>
            <TableHead>
              <TableRow>
                <TableCell as="th">Lecture ID</TableCell>
                <TableCell as="th">Title</TableCell>
                <TableCell as="th">Difficulty</TableCell>
                <TableCell as="th">Duration</TableCell>
                <TableCell as="th">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedLectures.map(lecture => (
                <TableRow key={`${lecture.courseId}-${lecture.lectureId}`}>
                  <TableCell>{lecture.lectureId}</TableCell>
                  <TableCell>{lecture.title}</TableCell>
                  <TableCell>
                    {/* Color-coded difficulty indicator */}
                    <Badge
                      variation={
                        lecture.difficulty?.toLowerCase() === 'easy' ? 'info' :
                        lecture.difficulty?.toLowerCase() === 'medium' ? 'warning' : 'error'
                      }
                    >
                      {lecture.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>{lecture.duration || 'Not set'}</TableCell>
                  <TableCell>
                    <Flex gap="1rem" alignItems="center">
                      {/* Edit button */}
                      <Button
                        variation="primary"
                        size="small"
                        onClick={() => {
                          setEditingLecture(lecture);
                          setIsLectureModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      
                      {/* Expandable content preview */}
                      <Accordion>
                        <Accordion.Container>
                          <Accordion.Item value="content">
                            <Accordion.Trigger>
                              View Content
                              <Accordion.Icon />
                            </Accordion.Trigger>
                            <Accordion.Content>
                              <div className="content-preview">
                                <h4>Summary</h4>
                                <p>{lecture.summary || 'No summary available'}</p>
                                
                                <h4>Content</h4>
                                <div className="content-text">
                                  {lecture.content || 'No content available'}
                                </div>
                              </div>
                            </Accordion.Content>
                          </Accordion.Item>
                        </Accordion.Container>
                      </Accordion>
                    </Flex>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination controls */}
          <Pagination
            currentPage={lecturePage}
            totalPages={Math.ceil(filteredLecturesData.length / lecturesPerPage)}
            onNext={() => setLecturePage(p => Math.min(p + 1, Math.ceil(filteredLecturesData.length / lecturesPerPage)))}
            onPrevious={() => setLecturePage(p => Math.max(p - 1, 1))}
            onChange={newPage => setLecturePage(newPage ?? 1)}
          />
        </>
      )}

      {/* Edit modal */}
      {renderLectureEditModal()}
    </Card>
  );
};

export default LecturesTab;