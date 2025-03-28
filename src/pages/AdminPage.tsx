import React from 'react';
import { Heading, View, Tabs, Divider } from '@aws-amplify/ui-react';
import JsonUploader from '../components/ui/JsonUploader/JsonUploader';
import FileUploader from '../components/ui/UploadFiles/FileUploader';
import CourseForm from '../components/ui/CourseForm/CourseForm';
import ContentManager from '../components/ui/ContentManager/ContentManager';
import '../styles/AdminPage.css';

/**
 * Admin Dashboard component providing administrative functionality
 * Contains tabs for different admin operations and content management
 */
const AdminPage: React.FC = () => {
  return (
    <View className='admin-page'>
      <Heading level={1} marginBottom="1.5rem" fontWeight="bold">Admin Dashboard</Heading>
      
      {/* Tabbed interface for content creation tools */}
      <Tabs
        defaultValue="file"
        className='admin-tabs'
        spacing="equal"
        justifyContent="flex-start"
        indicatorPosition="top"
        items={[
          { 
            label: "File Upload", 
            value: "file",
            content: <FileUploader />  // Document upload for lecture content
          },
          { 
            label: "Course Form", 
            value: "course",
            content: <CourseForm />    // Form for creating and editing course information
          },
          { 
            label: "JSON Upload", 
            value: "json",
            content: <JsonUploader />  // Direct JSON data import for advanced users
          },
        ]}
      />
      
      <Divider marginTop="2rem" marginBottom="2rem" />
      
      {/* Content management section for reviewing and moderating existing content */}
      <Heading level={3} marginBottom="1rem">Manage Uploaded Content</Heading>
      <ContentManager />
    </View>
  );
};

export default AdminPage;