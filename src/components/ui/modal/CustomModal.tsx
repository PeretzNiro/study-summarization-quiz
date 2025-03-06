import React from 'react';
import './CustomModal.css';

// Create a custom modal component
export const CustomModal = ({ 
    isOpen, 
    onClose, 
    children 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    children: React.ReactNode;
  }) => {
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