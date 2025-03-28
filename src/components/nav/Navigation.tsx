import React, { useState, useEffect } from 'react';
import { Flex, Button} from '@aws-amplify/ui-react';
import { Link } from 'react-router-dom';
import './Navigation.css';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSignOut: () => void;
  className?: string;
  showAdminTab?: boolean; // Controls visibility of admin functionality
}

/**
 * Navigation component that adapts to both mobile and desktop layouts
 * Provides tab navigation and user authentication controls
 */
const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onSignOut,
  className = '',
  showAdminTab = false // Default to false
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect viewport size changes to toggle between mobile and desktop layouts
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
  
  // Close mobile menu when navigating between tabs
  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };
  
  // Handle sign out and close mobile menu
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
          <Link to="/" onClick={() => handleTabClick('main')}>
            <span>🎓 LearnApp</span>
          </Link>
        </div>

        {/* Hamburger menu button (mobile only) */}
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

        {/* Desktop Navigation - horizontal layout */}
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
              
              {/* Conditional admin tab based on user permissions */}
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

      {/* Mobile Navigation - collapsible vertical menu */}
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
          
          {/* Conditional admin tab based on user permissions */}
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