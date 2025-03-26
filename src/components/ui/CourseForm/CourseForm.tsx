import React, { useState, useEffect } from 'react';
import {
  Card,
  Flex,
  Button,
  Heading,
  TextAreaField,
  TextField,
  SelectField,
  Alert,
  Loader,
  Text,
  Divider
} from '@aws-amplify/ui-react';
import JsonUploadService, { UploadResult } from '../../../services/JsonUploadService';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';
import './CourseForm.css';
import { CustomModal } from '../modal/CustomModal';
import { Autocomplete } from '../common/Autocomplete';
import { CourseService } from '../../../services/CourseService';

const client = generateClient<Schema>();

/**
 * Course management form that handles creation and updates of courses
 * Includes autocomplete functionality and validation for existing courses
 */
const CourseForm: React.FC = () => {
  // Form state for course data
  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    description: '',
    difficulty: '' 
  });
  
  // UI state management
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  // Modal state for confirming course updates
  const [showModal, setShowModal] = useState(false);
  const [existingCourse, setExistingCourse] = useState<any>(null);
  
  // Autocomplete functionality state
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [isLoadingCourseIds, setIsLoadingCourseIds] = useState(false);
  
  // Load all course IDs when component mounts
  useEffect(() => {
    loadCourseIds();
  }, []);
  
  /**
   * Fetch all course IDs for autocomplete functionality
   */
  const loadCourseIds = async () => {
    setIsLoadingCourseIds(true);
    try {
      const ids = await CourseService.getAllCourseIds();
      setCourseIds(ids);
    } catch (err) {
      console.error('Error loading course IDs:', err);
    } finally {
      setIsLoadingCourseIds(false);
    }
  };
  
  /**
   * Handle selection of a course ID from autocomplete
   * Pre-fills form with existing course data if available
   */
  const handleAutocompleteSelect = async (courseId: string) => {
    setFormData({ ...formData, courseId });
    
    if (courseId) {
      setIsChecking(true);
      try {
        const course = await CourseService.getCourseById(courseId);
        if (course) {
          // Pre-fill form with existing values
          setFormData({
            courseId: course.courseId,
            title: course.title || '',
            description: course.description || '',
            difficulty: course.difficulty || 'easy'
          });
          
          setExistingCourse(course);
        } else {
          setExistingCourse(null);
        }
      } catch (err) {
        console.error('Error fetching course details:', err);
        setExistingCourse(null);
      } finally {
        setIsChecking(false);
      }
    } else {
      setExistingCourse(null);
    }
  };
  
  /**
   * Update form state for all form elements except course ID
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Reset result display when form is modified
    if (showResult) {
      setShowResult(false);
      setUploadResult(null);
    }
  };
  
  /**
   * Update course ID field and reset result display
   */
  const handleCourseIdChange = (value: string) => {
    setFormData({
      ...formData,
      courseId: value
    });
    
    if (showResult) {
      setShowResult(false);
      setUploadResult(null);
    }
  };
  
  /**
   * Check if a course with the given ID already exists in the database
   */
  const checkIfCourseExists = async (courseId: string) => {
    setIsChecking(true);
    try {
      const { data: courses } = await client.models.Course.list({
        filter: { courseId: { eq: courseId } }
      });
      
      return courses && courses.length > 0 ? courses[0] : null;
    } catch (err) {
      console.error("Error checking if course exists:", err);
      throw err;
    } finally {
      setIsChecking(false);
    }
  };
  
  /**
   * Handle form submission
   * Validates course existence and either creates new course or prompts for update
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if course already exists
      const existingCourse = await checkIfCourseExists(formData.courseId);
      
      if (existingCourse) {
        // Course exists, show confirmation modal
        setExistingCourse(existingCourse);
        setShowModal(true);
        setIsLoading(false);
        return;
      }
      
      // Course doesn't exist, proceed with creation
      const result = await JsonUploadService.uploadToTable('Course', formData);
      setUploadResult(result);
      setShowResult(true);
      
      // Reset form if successful
      if (result.success) {
        setFormData({
          courseId: '',
          title: '',
          description: '',
          difficulty: 'easy'
        });
        
        // Refresh course IDs list
        loadCourseIds();
      }
    } catch (err: any) {
      console.error('Error uploading course:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Update an existing course with new form data
   * Called when user confirms update in modal
   */
  const handleUpdateExisting = async () => {
    setIsLoading(true);
    setShowModal(false);
    
    try {
      // Validate required data
      if (!existingCourse || !existingCourse.id) {
        throw new Error("Cannot update course: missing course data");
      }
      
      if (!formData.title && !formData.description && !formData.difficulty) {
        throw new Error("Please provide at least one field to update");
      }
      
      // Only include fields with values in update operation
      const updateData: any = {
        id: existingCourse.id,
      };
      
      if (formData.title) updateData.title = formData.title;
      if (formData.description) updateData.description = formData.description;
      if (formData.difficulty) updateData.difficulty = formData.difficulty;
      
      // Update the existing course
      const updateResult = await client.models.Course.update(updateData);
            
      setUploadResult({
        success: true,
        message: "Course successfully updated!",
        data: updateResult
      });
      setShowResult(true);
      
      // Reset form after successful update
      setFormData({
        courseId: '',
        title: '',
        description: '',
        difficulty: 'easy'
      });
    } catch (err: any) {
      console.error('Error updating course:', err);
      setError(`Update failed: ${err.message}`);
      
      setUploadResult({
        success: false,
        message: `Update failed: ${err.message}`,
        errors: err
      });
      setShowResult(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Reset form to initial state
   */
  const handleReset = () => {
    setFormData({
      courseId: '',
      title: '',
      description: '',
      difficulty: 'easy'
    });
    setError(null);
    setUploadResult(null);
    setShowResult(false);
  };
  
  return (
    <div className="course-form-container">
      <Heading level={2} marginBottom="1.5rem">Course Upload System</Heading>
      <Card variation="elevated" className="radius">
        <Heading level={3} marginBottom="1rem">Add New Course</Heading>
        <Text>Fill in the course details to add a new course to the database</Text>
        
        <form onSubmit={handleSubmit}>
          {/* Course ID field with autocomplete */}
          <Autocomplete
            label="Course ID"
            placeholder="e.g., COMP-1811"
            value={formData.courseId}
            onChange={handleCourseIdChange}
            onSelect={handleAutocompleteSelect}
            options={courseIds}
            isLoading={isLoadingCourseIds}
            isRequired={true}
            descriptiveText="Enter a unique course ID or select an existing one to update"
            name="courseId"
            className="margin-top-1"
          />
          
          {/* Course metadata fields */}
          <TextField
            label="Course Title"
            name="title"
            placeholder="e.g., Introduction to Computer Science"
            value={formData.title}
            onChange={handleInputChange}
            marginTop="1rem"
          />
          
          <TextAreaField
            label="Description"
            name="description"
            placeholder="Describe the course content and objectives..."
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            marginTop="1rem"
          />
          
          <SelectField 
            label="Difficulty Level"
            name="difficulty"
            value={formData.difficulty}
            onChange={handleInputChange}
            marginTop="1rem"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </SelectField>
          
          {/* Error display */}
          {error && (
            <Alert className='radius-s' variation="error" marginTop="1rem">{error}</Alert>
          )}
          
          {/* Operation result display */}
          {showResult && uploadResult && (
            <>
              <Divider marginTop="1.5rem" marginBottom="1rem" />
              {uploadResult.success ? (
                <Alert className='radius-s' variation="success">
                  {uploadResult.message || "Course successfully added to the database!"}
                </Alert>
              ) : (
                <Alert className='radius-s' variation="error">
                  {uploadResult.message}
                </Alert>
              )}
            </>
          )}
          
          {/* Action buttons */}
          <Flex justifyContent="space-between" marginTop="1.5rem">
            <Button 
              type="button" 
              onClick={handleReset} 
              variation="link"
              isDisabled={isLoading || isChecking}
            >
              Reset Form
            </Button>
            <Button 
              type="submit" 
              variation="primary"
              isLoading={isLoading || isChecking}
              loadingText={isChecking ? "Checking..." : "Saving..."}
              isDisabled={!formData.courseId.trim() || isLoading || isChecking}
            >
              Add Course
            </Button>
          </Flex>
        </form>
        
        {/* Loading indicator */}
        {isLoading && (
          <Flex direction="column" alignItems="center" marginTop="1rem">
            <Loader size="large" />
            <Text marginTop="0.5rem">Saving course...</Text>
          </Flex>
        )}
      </Card>
      
      {/* Confirmation modal for updating existing courses */}
      <CustomModal isOpen={showModal} onClose={() => setShowModal(false)}>
        <Heading level={3} padding="1rem 1.5rem" style={{ borderBottom: "1px solid #e0e0e0" }}>
          Course Already Exists
        </Heading>
        
        <div className="modal-body">
          <Text>A course with ID "{formData.courseId}" already exists.</Text>
          <Divider margin="1rem 0" />
          
          <Heading level={5} marginBottom="0.5rem">Existing Course Details:</Heading>
          <Text><strong>Title:</strong> {existingCourse?.title || "N/A"}</Text>
          <Text><strong>Description:</strong> {existingCourse?.description || "N/A"}</Text>
          <Text><strong>Difficulty:</strong> {existingCourse?.difficulty || "N/A"}</Text>
          
          <Alert className='radius-s' variation="warning" marginTop="1rem">
            Would you like to update this course with your new information?
          </Alert>
        </div>
        
        <div className="modal-footer">
          <Flex justifyContent="space-between" width="100%">
            <Button variation="link" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variation="primary" onClick={handleUpdateExisting}>
              Update Existing Course
            </Button>
          </Flex>
        </div>
      </CustomModal>
    </div>
  );
};

export default CourseForm;