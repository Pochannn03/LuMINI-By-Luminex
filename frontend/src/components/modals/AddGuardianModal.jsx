// frontend/src/components/modals/AddGuardianModal.jsx

import React, { useState } from "react";
import "../../styles/user/parent/manage-guardian.css";

export default function AddGuardianModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    idFile: null,
  });

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setConfirmText("");
    setShowPassword(false);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      username: "",
      password: "",
      idFile: null,
    });
    onClose();
  };

  // Helper to generate username: TEMP-MS-020926
  const generateUsername = (fName, lName) => {
    if (!fName || !lName) return "";
    const initials = (fName[0] + lName[0]).toUpperCase();
    const date = new Date();
    // Format: MMDDYY (e.g., 020926)
    const dateStr =
      String(date.getMonth() + 1).padStart(2, "0") +
      String(date.getDate()).padStart(2, "0") +
      String(date.getFullYear()).slice(-2);

    return `TEMP-${initials}-${dateStr}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // 1. Update the field normally
    let newFormData = { ...formData, [name]: value };

    // 2. If Name changes, auto-generate username
    if (name === "firstName" || name === "lastName") {
      const fName = name === "firstName" ? value : formData.firstName;
      const lName = name === "lastName" ? value : formData.lastName;
      newFormData.username = generateUsername(fName, lName);
    }

    setFormData(newFormData);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData({ ...formData, idFile: file });

      // Generate Preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const isStep2Valid = () => {
    return (
      formData.firstName.trim() !== "" &&
      formData.lastName.trim() !== "" &&
      formData.phone.trim() !== "" &&
      formData.password.length >= 8
    );
  };

  const renderStepContent = () => {
    switch (step) {
      // --- STEP 1: LEGAL GATE ---
      case 1:
        return (
          <>
            <div className="info-box">
              <h4>
                <span className="material-symbols-outlined">info</span>What
                guardians can do
              </h4>
              {/* Main text */}
              <p>
                Adding a guardian grants them authorization to{" "}
                <strong>pick up and drop off</strong> your linked children. They
                will have their own login access to view pickup schedules.
              </p>

              {/* NEW: Emphasized Note separated out */}
              <div className="info-note">
                <span>Note:</span>
                <span>
                  They cannot edit student details or manage other guardians.
                </span>
              </div>
            </div>

            <div className="form-group">
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#64748b",
                  marginBottom: "8px",
                  display: "block",
                }}
              >
                Security Check
              </label>
              <input
                type="text"
                className="confirmation-input"
                placeholder="Type 'I understand'"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
            </div>
          </>
        );

      // --- STEP 2: REGISTRATION FORM ---
      case 2:
        return (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div className="form-grid-2">
              <div>
                <label className="modal-label">First Name</label>
                <input
                  name="firstName"
                  className="modal-input"
                  placeholder="e.g. Maria"
                  value={formData.firstName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="modal-label">Last Name</label>
                <input
                  name="lastName"
                  className="modal-input"
                  placeholder="e.g. Santos"
                  value={formData.lastName}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Phone Number (Full Width since Email is gone) */}
            <div>
              <label className="modal-label">Phone Number</label>
              <input
                name="phone"
                className="modal-input"
                placeholder="0912..."
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <div
              style={{ borderTop: "1px solid #f1f5f9", margin: "8px 0" }}
            ></div>

            <div className="form-grid-2">
              <div>
                <label className="modal-label">Temp Username (Auto)</label>
                {/* READ ONLY FIELD */}
                <input
                  name="username"
                  className="modal-input"
                  value={formData.username}
                  readOnly
                  style={{
                    background: "#f1f5f9",
                    color: "#64748b",
                    cursor: "not-allowed",
                  }}
                />
              </div>
              {/* PASSWORD FIELD WITH TOGGLE */}
              <div>
                <label className="modal-label">Temp Password</label>
                <div className="password-input-wrapper">
                  <input
                    name="password"
                    className="modal-input"
                    type={showPassword ? "text" : "password"} // Dynamic Type
                    placeholder="Min. 8 chars"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  <button
                    type="button" // Important so it doesn't submit form
                    className="toggle-password-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "#94a3b8",
                fontStyle: "italic",
              }}
            >
              * The username is generated automatically. Please set a strong
              temporary password.
            </p>
          </div>
        );

      // --- STEP 3: ID UPLOAD ---
      case 3:
        return (
          <div
            style={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
            <div className="upload-section-title">
              <h4>Upload Valid ID</h4>
              <p>
                We need a government-issued ID (UMID, National ID, etc.) for
                verification.
              </p>
            </div>

            <label className="upload-box">
              <input
                type="file"
                hidden
                onChange={handleFileChange}
                accept="image/*"
              />

              {formData.idFile && previewUrl ? (
                // --- STATE 2: IMAGE PREVIEW ---
                <div className="preview-container">
                  <img
                    src={previewUrl}
                    alt="ID Preview"
                    className="id-preview-img"
                  />

                  {/* Overlay on Hover */}
                  <div className="preview-overlay">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "32px", marginBottom: "8px" }}
                    >
                      edit
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: "600" }}>
                      Click to Change Image
                    </span>
                  </div>
                </div>
              ) : (
                // --- STATE 1: DEFAULT UPLOAD UI ---
                <div className="upload-content-default">
                  <span className="material-symbols-outlined upload-icon">
                    cloud_upload
                  </span>
                  <div className="upload-text">
                    Click to upload or drag and drop
                  </div>
                  <div className="upload-subtext">JPG or PNG (max. 5MB)</div>
                </div>
              )}
            </label>

            {/* Validation Message (Optional) */}
            {!formData.idFile && (
              <p
                style={{
                  fontSize: "12px",
                  color: "#ef4444",
                  marginTop: "8px",
                  textAlign: "center",
                  opacity: 0.8,
                }}
              >
                * An ID image is required to proceed.
              </p>
            )}
          </div>
        );

      // --- STEP 4: CONFIRMATION ---
      case 4:
        return (
          <div>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "48px", color: "#10b981" }}
              >
                check_circle
              </span>
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#1e293b",
                  marginTop: "8px",
                }}
              >
                Ready to Submit?
              </h3>
              <p style={{ fontSize: "14px", color: "#64748b" }}>
                You are about to register a new guardian. This will be sent to
                the admin for approval.
              </p>
            </div>

            <div className="summary-card">
              <div className="summary-row">
                <span className="sum-label">Name</span>
                <span className="sum-value">
                  {formData.firstName} {formData.lastName}
                </span>
              </div>
              <div className="summary-row">
                <span className="sum-label">Username</span>
                <span className="sum-value">{formData.username}</span>
              </div>

              {/* NEW PASSWORD ROW */}
              <div className="summary-row">
                <span className="sum-label">Password</span>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span className="sum-value">
                    {showPassword ? formData.password : "••••••••"}
                  </span>
                  <button
                    className="toggle-password-btn"
                    style={{ position: "static" }} // Override absolute pos for this row
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px" }}
                    >
                      {showPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="summary-row">
                <span className="sum-label">ID File</span>
                <span
                  className="sum-value"
                  style={{ color: "var(--primary-blue)" }}
                >
                  {formData.idFile ? formData.idFile.name : "No file uploaded"}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay active" onClick={handleClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="modal-header">
          <h3>
            {step === 1 && "Security Check"}
            {step === 2 && "Guardian Details"}
            {step === 3 && "Verification"}
            {step === 4 && "Confirmation"}
          </h3>
          <button className="close-modal-btn" onClick={handleClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">{renderStepContent()}</div>

        {/* FOOTER */}
        <div className="modal-footer">
          {step > 1 && (
            <button
              className="btn btn-cancel"
              onClick={() => setStep(step - 1)}
            >
              Back
            </button>
          )}

          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => {
              // ... Validation Logic ...
              if (step === 1 && confirmText.toLowerCase() === "i understand")
                setStep(2);
              else if (step === 2 && isStep2Valid()) {
                setShowPassword(false); // Reset visibility when entering Step 3
                setStep(step + 1);
              } else if (step === 3) {
                setShowPassword(false); // Reset visibility (Asterisk default) for Step 4
                setStep(step + 1);
              } else if (step === 4) {
                alert("Submitting to Admin for Review...");
                handleClose();
              }
            }}
            // Disable logic
            disabled={
              (step === 1 && confirmText.toLowerCase() !== "i understand") ||
              (step === 2 && !isStep2Valid()) ||
              (step === 3 && !formData.idFile)
            }
          >
            {step === 4 ? "Submit Registration" : "Next Step"}
          </button>
        </div>
      </div>
    </div>
  );
}
