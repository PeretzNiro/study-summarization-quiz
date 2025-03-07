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

const CourseForm: React.FC = () => {
  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    description: '',
    difficulty: 'easy' // Default value
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  // For handling the confirmation modal
  const [showModal, setShowModal] = useState(false);
  const [existingCourse, setExistingCourse] = useState<any>(null);
  
  // For autocomplete functionality
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [isLoadingCourseIds, setIsLoadingCourseIds] = useState(false);
  
  // Load all course IDs on component mount
  useEffect(() => {
    loadCourseIds();
  }, []);
  
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
  
  const handleAutocompleteSelect = async (courseId: string) => {
    setFormData({ ...formData, courseId });
    
    // When a course ID is selected, fetch details but don't show modal
    if (courseId) {
      setIsChecking(true);
      try {
        const course = await CourseService.getCourseById(courseId);
        if (course) {
          // Pre-fill the form with existing values
          setFormData({
            courseId: course.courseId,
            title: course.title || '',
            description: course.description || '',
            difficulty: course.difficulty || 'easy'
          });
          
          // Store existing course data but don't show modal yet
          setExistingCourse(course);
        } else {
          // Clear existing course data if no course found
          setExistingCourse(null);
        }
      } catch (err) {
        console.error('Error fetching course details:', err);
        // Clear existing course data on error
        setExistingCourse(null);
      } finally {
        setIsChecking(false);
      }
    } else {
      // Reset existing course data when no courseId is selected
      setExistingCourse(null);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Reset result state when form is being edited
    if (showResult) {
      setShowResult(false);
      setUploadResult(null);
    }
  };
  
  const handleCourseIdChange = (value: string) => {
    setFormData({
      ...formData,
      courseId: value
    });
    
    // Reset result state when form is being edited
    if (showResult) {
      setShowResult(false);
      setUploadResult(null);
    }
  };
  
  const checkIfCourseExists = async (courseId: string) => {
    setIsChecking(true);
    try {
      const { data: courses } = await client.models.Course.list({
        filter: { courseId: { eq: courseId } }
      });
      
      if (courses && courses.length > 0) {
        return courses[0];
      }
      return null;
    } catch (err) {
      console.error("Error checking if course exists:", err);
      throw err;
    } finally {
      setIsChecking(false);
    }
  };
  
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
  
  const handleUpdateExisting = async () => {
    setIsLoading(true);
    setShowModal(false);
    
    try {
      // Make sure we have the required data
      if (!existingCourse || !existingCourse.id) {
        throw new Error("Cannot update course: missing course data");
      }
      
      // Make sure we have at least some data to update
      if (!formData.title && !formData.description && !formData.difficulty) {
        throw new Error("Please provide at least one field to update");
      }
      
      // Prepare update data - only include fields that have values
      const updateData: any = {
        id: existingCourse.id,
      };
      
      if (formData.title) updateData.title = formData.title;
      if (formData.description) updateData.description = formData.description;
      if (formData.difficulty) updateData.difficulty = formData.difficulty;
      
      console.log("Updating course with data:", updateData);
  
      // Update the existing course with new data
      const updateResult = await client.models.Course.update(updateData);
      
      console.log("Update result:", updateResult);
      
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
          
          {error && (
            <Alert variation="error" marginTop="1rem">{error}</Alert>
          )}
          
          {showResult && uploadResult && (
            <>
              <Divider marginTop="1.5rem" marginBottom="1rem" />
              {uploadResult.success ? (
                <Alert variation="success">
                  {uploadResult.message || "Course successfully added to the database!"}
                </Alert>
              ) : (
                <Alert variation="error">
                  {uploadResult.message}
                </Alert>
              )}
            </>
          )}
          
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
        
        {isLoading && (
          <Flex direction="column" alignItems="center" marginTop="1rem">
            <Loader size="large" />
            <Text marginTop="0.5rem">Saving course...</Text>
          </Flex>
        )}
      </Card>
      
      {/* Confirmation Modal */}
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
          
          <Alert variation="warning" marginTop="1rem">
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