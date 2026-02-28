import React from "react";
import "../styles/success-modal.css";

const WarningModal = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="success-modal-overlay" onClick={onClose}>
      <div
        className="success-modal-content"
        // style={{ borderTop: "6px solid #f59e0b" }}  <-- This line was removed
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon Container */}
        <div className="success-icon-container" style={{ backgroundColor: "#fef3c7" }}>
          <span className="material-symbols-outlined" style={{ color: "#f59e0b", fontSize: "40px" }}>
            warning
          </span>
        </div>

        <h2 className="success-title" style={{ color: "#92400e" }}>
          {title || "Not Available"}
        </h2>
        <p className="success-message">
          {message || "This action is currently restricted."}
        </p>

        <button 
          className="success-close-btn" 
          onClick={onClose}
          style={{ backgroundColor: "#f59e0b" }}
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default WarningModal;