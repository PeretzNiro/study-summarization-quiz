import React from 'react';
import { Flex, Button } from '@aws-amplify/ui-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSignOut: () => void;
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onSignOut,
  className = ''
}) => {
  return (
    <Flex
      justifyContent="space-between"
      alignItems="center"
      className={className}
    >
      <div className='nav_spacing'>
        <Button
          variation={activeTab === 'main' ? 'primary' : 'link'}
          onClick={() => setActiveTab('main')}
        >
          Main
        </Button>
        <Button
          variation={activeTab === 'courses' ? 'primary' : 'link'}
          onClick={() => setActiveTab('courses')}
        >
          Courses
        </Button>
        <Button
          variation={activeTab === 'admin' ? 'primary' : 'link'}
          onClick={() => setActiveTab('admin')}
        >
          Admin
        </Button>
      </div>
      <Button onClick={onSignOut} variation="link">
        Sign out
      </Button>
    </Flex>
  );
};

export default Navigation;