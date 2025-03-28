import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

interface FooterProps {
  className?: string;  // Optional CSS class for additional styling
}

/**
 * Footer component displayed across all pages
 * Contains links to legal pages and copyright information
 */
const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  // Dynamically get current year for copyright notice
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={`footer-container ${className}`}>
      <div className="footer-content">
        {/* Legal and policy links */}
        <div className="footer-links">
          <Link to="/privacy-policy">Privacy Policy</Link>
          <span className="footer-divider">|</span>
          <Link to="/terms">Terms of Service</Link>
        </div>
        
        {/* Copyright notice */}
        <p className="copyright">
          &copy; {currentYear} AI-Powered Study Content Generator. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;