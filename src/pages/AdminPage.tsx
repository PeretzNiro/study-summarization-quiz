import React from 'react';
import { Heading, View, Tabs, Divider } from '@aws-amplify/ui-react';
import JsonUploader from '../components/ui/JsonUploader/JsonUploader';
import FileUploader from '../components/ui/UploadFiles/FileUploader';
import CourseForm from '../components/ui/CourseForm/CourseForm';
import ContentManager from '../components/ui/ContentManager/ContentManager';
import '../styles/AdminPage.css';

const AdminPage: React.FC = () => {
  return (
    <View>
      <Heading level={1} marginBottom="1.5rem" fontWeight="bold">Admin Dashboard</Heading>
      
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
            content: <FileUploader />
          },
          { 
            label: "Course Form", 
            value: "course",
            content: <CourseForm />
          },
          { 
            label: "JSON Upload", 
            value: "json",
            content: <JsonUploader />
          },
        ]}
      />
      
      <Divider marginTop="2rem" marginBottom="2rem" />
      <Heading level={3} marginBottom="1rem">Manage Uploaded Content</Heading>
      <ContentManager />
    </View>
  );
};

export default AdminPage;