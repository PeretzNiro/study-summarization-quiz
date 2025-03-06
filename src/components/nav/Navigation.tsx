import React, { useState, useEffect } from 'react';
import { Flex, Button} from '@aws-amplify/ui-react';
import './Navigation.css';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSignOut: () => void;
  className?: string;
  showAdminTab?: boolean; // New prop
}

const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onSignOut,
  className = '',
  showAdminTab = false // Default to false
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if we're on a mobile device
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Close menu when a tab is clicked
  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };
  
  // Handle sign out and close menu
  const handleSignOut = () => {
    setIsMobileMenuOpen(false);
    onSignOut();
  };

  return (
    <div className={`navigation-container ${className}`}>
      <Flex 
        justifyContent="space-between" 
        alignItems="center"
        className="navigation-header"
      >
        <div className="logo">
          <span>🎓 LearnApp</span>
        </div>

        {/* Hamburger icon for mobile */}
        {isMobile && (
          <button 
            className={`hamburger-menu ${isMobileMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        )}

        {/* Desktop Navigation */}
        {!isMobile && (
          <Flex className="desktop-nav">
            <div className='nav_spacing'>
              <Button
                variation={activeTab === 'main' ? 'primary' : 'link'}
                onClick={() => handleTabClick('main')}
              >
                Main
              </Button>
              <Button
                variation={activeTab === 'courses' ? 'primary' : 'link'}
                onClick={() => handleTabClick('courses')}
              >
                Courses
              </Button>
              
              {/* Only show Admin button for admin users */}
              {showAdminTab && (
                <Button
                  variation={activeTab === 'admin' ? 'primary' : 'link'}
                  onClick={() => handleTabClick('admin')}
                >
                  Admin
                </Button>
              )}
            </div>
            <Button onClick={handleSignOut} variation="link">
              Sign out
            </Button>
          </Flex>
        )}
      </Flex>

      {/* Mobile Navigation Menu */}
      {isMobile && (
        <div className={`mobile-nav ${isMobileMenuOpen ? 'open' : ''}`}>
          <Button
            className="mobile-nav-item"
            variation={activeTab === 'main' ? 'primary' : 'link'}
            onClick={() => handleTabClick('main')}
            isFullWidth
          >
            Main
          </Button>
          <Button
            className="mobile-nav-item"
            variation={activeTab === 'courses' ? 'primary' : 'link'}
            onClick={() => handleTabClick('courses')}
            isFullWidth
          >
            Courses
          </Button>
          
          {/* Only show Admin button for admin users */}
          {showAdminTab && (
            <Button
              className="mobile-nav-item"
              variation={activeTab === 'admin' ? 'primary' : 'link'}
              onClick={() => handleTabClick('admin')}
              isFullWidth
            >
              Admin
            </Button>
          )}
          
          <Button 
            className="mobile-nav-item sign-out"
            onClick={handleSignOut} 
            variation="destructive"
            isFullWidth
          >
            Sign out
          </Button>
        </div>
      )}
    </div>
  );
};

export default Navigation;