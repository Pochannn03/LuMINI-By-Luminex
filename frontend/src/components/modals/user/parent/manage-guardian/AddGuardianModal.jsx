// frontend/src/components/modals/AddGuardianModal.jsx

import React, { useState } from "react";
import "../../../../../styles/user/parent/manage-guardian.css";

export default function AddGuardianModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");

  if (!isOpen) return null;

  // Reset state when closing
  const handleClose = () => {
    setStep(1);
    setConfirmText("");
    onClose();
  };

  return (
    <div className="modal-overlay active" onClick={handleClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "500px" }}
      >
        {/* HEADER */}
        <div className="modal-header">
          <h3>{step === 1 ? "Add New Guardian" : "Generate Invitation"}</h3>
          <button className="close-modal-btn" onClick={handleClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {/* BODY */}
        <div className="modal-body">
          {/* --- STEP 1: LEGAL WARNING --- */}
          {step === 1 && (
            <>
              <div className="info-box">
                <h4>
                  <span className="material-symbols-outlined">info</span>
                  What guardians can do
                </h4>
                <p>
                  Adding a guardian grants them authorization to{" "}
                  <strong>pick up and drop off</strong> your linked children.
                  They will have their own login access to view pickup
                  schedules.
                  <br />
                  <br />
                  <strong>Note:</strong> They cannot edit student details or
                  manage other guardians.
                </p>
              </div>

              <div className="form-group">
                <label style={{ color: "#ef4444", fontWeight: "bold" }}>
                  Security Check
                </label>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    marginBottom: "8px",
                  }}
                >
                  Please type <strong>I understand</strong> below to proceed.
                </p>
                <input
                  type="text"
                  className="confirmation-input"
                  placeholder="Type 'I understand'"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
              </div>
            </>
          )}

          {/* --- STEP 2: GENERATE CODE (Polished) --- */}
          {step === 2 && (
            <div className="code-generator-container">
              <p className="code-instruction">
                Click the button below to generate a unique{" "}
                <strong>6-digit invitation code</strong>.
              </p>

              <div className="code-display">------</div>

              <div className="expiry-text">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
                >
                  timer
                </span>
                Code expires in 24 hours
              </div>
            </div>
          )}
        </div>
        {/* FOOTER (Balanced Buttons) */}
        <div className="modal-footer">
          <button className="btn btn-cancel" onClick={handleClose}>
            Cancel
          </button>

          {step === 1 ? (
            <button
              className="btn btn-primary"
              disabled={confirmText.toLowerCase() !== "i understand"}
              onClick={() => setStep(2)}
              style={{
                opacity: confirmText.toLowerCase() !== "i understand" ? 0.5 : 1,
              }}
            >
              Next Step
            </button>
          ) : (
            <button className="btn btn-primary btn-generate-pulse">
              Generate Code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
