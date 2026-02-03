// frontend/src/components/modals/SuccessModal.jsx

import React from "react";
import "../../styles/success-modal.css"; // We will create this next

/**
 * REUSABLE SUCCESS MODAL COMPONENT
 * * Usage Instructions for Teammates:
 * 1. Import this component: import SuccessModal from '../../components/modals/SuccessModal';
 * 2. Create state for visibility: const [showSuccess, setShowSuccess] = useState(false);
 * 3. Add component to your JSX:
 * <SuccessModal
 * isOpen={showSuccess}
 * onClose={() => setShowSuccess(false)}
 * message="Your specific success message here!"
 * />
 */
const SuccessModal = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    // Overlay: Covers the whole screen. Clicking it closes the modal (Easy Close).
    <div className="success-modal-overlay" onClick={onClose}>
      {/* Modal Content: The actual white box. We stop propagation so clicking inside doesn't close it. */}
      <div
        className="success-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Checkmark Circle */}
        <div className="success-icon-container">
          <span className="material-symbols-outlined success-icon">check</span>
        </div>

        <h2 className="success-title">Success!</h2>
        <p className="success-message">
          {message || "Operation completed successfully."}
        </p>

        <button className="success-close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;
