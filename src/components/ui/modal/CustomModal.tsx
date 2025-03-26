import React from 'react';
import './CustomModal.css';

/**
 * Modal component that renders content in an overlay
 * Handles click events with propagation control for dismissal
 * @param isOpen Controls the visibility of the modal
 * @param onClose Callback function executed when closing the modal
 * @param children Content to be displayed inside the modal
 */
export const CustomModal = ({ 
    isOpen, 
    onClose, 
    children 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    children: React.ReactNode;
  }) => {
    // Don't render anything if modal is not open
    if (!isOpen) return null;
    
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div 
          className="modal-content" 
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          {children}
        </div>
      </div>
    );
  };