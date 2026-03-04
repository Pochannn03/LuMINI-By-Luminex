import React from "react";
import { createPortal } from "react-dom"; // <-- 1. Import createPortal
import "../styles/success-modal.css"; 

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

  // 2. Wrap the return statement in createPortal
  return createPortal(
    // Overlay: Added inline style for zIndex to guarantee it stays on top of everything else
    <div className="success-modal-overlay" onClick={onClose} style={{ zIndex: 999999 }}>
      {/* Modal Content */}
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
    </div>,
    document.body // <-- 3. Attach it directly to the HTML body
  );
};

export default SuccessModal;