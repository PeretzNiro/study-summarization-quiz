import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/PolicyPages.css';

/**
 * Terms of Service page component
 * Displays the application's terms and conditions in a structured format
 * Establishes the legal agreement between users and the platform
 */
const TermsPage: React.FC = () => {
  return (
    <div className="policy-page">
      {/* Navigation link back to home */}
      <Link to="/" className="back-link">← Back to Home</Link>
      <div className="policy-container">
        <h1>Terms of Service</h1>
        {/* Dynamic date display showing when terms were last updated */}
        <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <section>
          <h2>Introduction</h2>
          <p>
            These Terms of Service govern your use of the AI-Powered Study Content Generator and 
            Quiz Platform. By accessing or using our service, you agree to be bound by these Terms.
          </p>
        </section>
        
        <section>
          <h2>User Accounts</h2>
          <p>
            You are responsible for safeguarding the password that you use to access the Service 
            and for any activities or actions under your password.
          </p>
        </section>
        
        <section>
          <h2>Intellectual Property Rights</h2>
          <p>
            The Service and its original content, features, and functionality are and will remain 
            the exclusive property of our company and its licensors.
          </p>
        </section>
        
        <section>
          <h2>Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice or liability, 
            for any reason whatsoever, including without limitation if you breach the Terms.
          </p>
        </section>
        
        <section>
          <h2>Limitation of Liability</h2>
          <p>
            In no event shall we be liable for any indirect, incidental, special, consequential or 
            punitive damages, including without limitation, loss of profits, data, use, goodwill, or 
            other intangible losses.
          </p>
        </section>
        
        <section>
          <h2>Changes</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time.
          </p>
        </section>
        
        <section>
          <h2>Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
            <br />
            {/* Contact email with mailto link for easy access */}
            <a href="mailto:np9769y@gre.ac.uk">np9769y@gre.ac.uk</a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;