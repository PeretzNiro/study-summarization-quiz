import React from 'react';
import { Heading, View } from '@aws-amplify/ui-react';
import JsonUploader from '../components/ui/JsonUploader/JsonUploader';

const AdminPage: React.FC = () => {
  return (
    <View padding="1rem">
      <Heading level={1} marginBottom="1.5rem" fontWeight="bold">Admin Dashboard</Heading>
      <JsonUploader />
    </View>
  );
};

export default AdminPage;