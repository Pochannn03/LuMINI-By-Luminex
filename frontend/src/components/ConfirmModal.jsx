import React from "react";
import "../styles/confirm-modal.css";

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Are you sure?", 
  message = "Do you want to proceed with this action?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="confirm-icon-container">
          {/* Dynamically turns yellow for warnings, red for destructive actions */}
          <span className="material-symbols-outlined confirm-icon" style={{ color: isDestructive ? "var(--accent-red)" : "var(--accent-yellow)" }}>
            {isDestructive ? "warning" : "help"}
          </span>
        </div>

        <h2 className="confirm-title">{title}</h2>
        <p className="confirm-message">{message}</p>
        
        <div className="confirm-actions">
          <button className="btn-cancel-modal" onClick={onClose}>
            {cancelText}
          </button>
          <button 
            className={`btn-confirm-modal ${isDestructive ? 'destructive' : ''}`} 
            onClick={() => {
              onConfirm(); // Fire the action
              onClose();   // Close the modal
            }}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmModal;