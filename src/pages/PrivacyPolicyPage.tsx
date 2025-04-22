import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/PolicyPages.css';

/**
 * Privacy Policy page component
 * Displays the application's privacy policy in a structured format
 * Required for GDPR compliance and user transparency
 */
const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="policy-page">
      {/* Navigation link back to home */}
      <Link to="/" className="back-link">← Back to Home</Link>
      
      <div className="policy-container">        
        <h1>Privacy Policy</h1>
        {/* Dynamic date stamp showing when policy was last updated */}
        <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <section>
          <h2>Introduction</h2>
          <p>
            This Privacy Policy explains how AI-Powered Study Content Generator and Quiz Platform 
            ("we", "our", or "us") collects, uses, shares, and protects your personal information 
            when you use our application.
          </p>
        </section>
        
        <section>
          <h2>Data Controller</h2>
          <p>
            The data controller responsible for your personal information.
          </p>
        </section>
        
        <section>
          <h2>What Personal Data We Collect</h2>
          <ul>
            <li><strong>Account Information</strong>: Email address, and authentication details</li>
            <li><strong>User Progress Data</strong>: Completed lectures, quiz scores, and learning activity timestamps</li>
            <li><strong>Usage Information</strong>: How you interact with the platform, including features used and time spent</li>
            <li><strong>Content You Create</strong>: Any materials you upload for processing</li>
          </ul>
        </section>
        
        <section>
          <h2>How We Use Your Data</h2>
          <ul>
            <li>To provide and improve our educational services</li>
            <li>To personalize your learning experience</li>
            <li>To track and analyze your progress</li>
            <li>To process and transform educational content you upload</li>
            <li>To authenticate you and secure your account</li>
          </ul>
        </section>
        
        <section>
          <h2>Legal Basis for Processing</h2>
          <ul>
            <li>Performance of our contract with you to provide educational services</li>
            <li>Your consent, which you can withdraw at any time</li>
            <li>Our legitimate interests in improving our services and maintaining security</li>
          </ul>
        </section>
        
        <section>
          <h2>Your Rights</h2>
          <p>
            Under GDPR, you have the right to:
          </p>
          <ul>
            <li>Access your personal data</li>
            <li>Rectify inaccurate data</li>
            <li>Erase your data ("right to be forgotten")</li>
            <li>Restrict or object to processing</li>
            <li>Data portability</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </section>
        
        <section>
          <h2>Contact Information</h2>
          <p>
            If you have questions about this policy or your data, please contact us at:
            <br />
            {/* Contact email with mailto link for easy access */}
            <a href="mailto:np9769y@gre.ac.uk">np9769y@gre.ac.uk</a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;