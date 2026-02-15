// frontend/src/components/modals/AddGuardianModal.jsx

import React, { useState } from "react";
import axios from "axios"; // <-- NEW: Imported Axios
import "../../../../../styles/user/parent/manage-guardian.css";
import "../../../../../index.css";

export default function AddGuardianModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // <-- NEW: Loading state for network request
  const [isSubmitting, setIsSubmitting] = useState(false); 

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    username: "",
    password: "",
    idFile: null,
  });

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setConfirmText("");
    setShowPassword(false);
    setPreviewUrl(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "",
      username: "",
      password: "",
      idFile: null,
    });
    onClose();
  };

  // Helper to generate username
  const generateUsername = (fName, lName) => {
    if (!fName || !lName) return "";
    const initials = (fName[0] + lName[0]).toUpperCase();
    const date = new Date();
    const dateStr =
      String(date.getMonth() + 1).padStart(2, "0") +
      String(date.getDate()).padStart(2, "0") +
      String(date.getFullYear()).slice(-2);
    return `TEMP-${initials}-${dateStr}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

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
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const isStep2Valid = () => {
    return (
      formData.firstName.trim() !== "" &&
      formData.lastName.trim() !== "" &&
      formData.phone.trim() !== "" &&
      formData.role.trim() !== "" &&
      formData.password.length >= 8
    );
  };

  // ==========================================
  // --- NEW: THE SUBMISSION FUNCTION ---
  // ==========================================
  const submitGuardianRequest = async () => {
    setIsSubmitting(true);
    try {
      // 1. Create a FormData object to handle the file + text
      const dataToSend = new FormData();
      dataToSend.append("firstName", formData.firstName);
      dataToSend.append("lastName", formData.lastName);
      dataToSend.append("phone", formData.phone);
      dataToSend.append("role", formData.role);
      dataToSend.append("username", formData.username);
      dataToSend.append("password", formData.password);
      dataToSend.append("idFile", formData.idFile); // Append the image file

      // Optional: If your backend needs explicit IDs for testing right now, 
      // you can append them here. Otherwise, the backend will use the fallbacks we set.
      // dataToSend.append("parentId", "some-id"); 

      // 2. Send via Axios
      const response = await axios.post(
        "http://localhost:3000/api/parent/guardian-request",
        dataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data", // Crucial for file uploads
          },
          withCredentials: true,
        }
      );

      // 3. Success!
      alert(response.data.message);
      handleClose(); // Close the modal and reset

    } catch (error) {
      console.error("Error submitting request:", error);
      alert(
        error.response?.data?.message || 
        "An error occurred while submitting. Please try again."
      );
    } finally {
      setIsSubmitting(false); // Re-enable the button
    }
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
              <p>
                Adding a guardian grants them authorization to{" "}
                <strong>pick up and drop off</strong> your linked children. They
                will have their own login access to view pickup schedules.
              </p>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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

            <div className="form-grid-2">
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
              <div>
                <label className="modal-label">Relationship to Child</label>
                <select 
                  name="role" 
                  className="modal-input" 
                  value={formData.role}
                  onChange={handleInputChange}
                  style={{ backgroundColor: 'white' }}
                >
                  <option value="" disabled>Select role...</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Aunt/Uncle">Aunt / Uncle</option>
                  <option value="Sibling">Older Sibling</option>
                  <option value="Driver">Driver / Nanny</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #f1f5f9", margin: "8px 0" }}></div>

            <div className="form-grid-2">
              <div>
                <label className="modal-label">Temp Username (Auto)</label>
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
              <div>
                <label className="modal-label">Temp Password</label>
                <div className="password-input-wrapper">
                  <input
                    name="password"
                    className="modal-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 chars"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  <button
                    type="button"
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
            <p style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
              * The username is generated automatically. Please set a strong temporary password.
            </p>
          </div>
        );

      // --- STEP 3: ID UPLOAD ---
      case 3:
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div className="upload-section-title">
              <h4>Upload Valid ID</h4>
              <p>We need a government-issued ID (UMID, National ID, etc.) for verification.</p>
            </div>

            <label className="upload-box">
              <input
                type="file"
                hidden
                onChange={handleFileChange}
                accept="image/*"
              />
              {formData.idFile && previewUrl ? (
                <div className="preview-container">
                  <img src={previewUrl} alt="ID Preview" className="id-preview-img" />
                  <div className="preview-overlay">
                    <span className="material-symbols-outlined" style={{ fontSize: "32px", marginBottom: "8px" }}>
                      edit
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: "600" }}>
                      Click to Change Image
                    </span>
                  </div>
                </div>
              ) : (
                <div className="upload-content-default">
                  <span className="material-symbols-outlined upload-icon">cloud_upload</span>
                  <div className="upload-text">Click to upload or drag and drop</div>
                  <div className="upload-subtext">JPG or PNG (max. 5MB)</div>
                </div>
              )}
            </label>
            {!formData.idFile && (
              <p style={{ fontSize: "12px", color: "#ef4444", marginTop: "8px", textAlign: "center", opacity: 0.8 }}>
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
              <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "#10b981" }}>
                check_circle
              </span>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1e293b", marginTop: "8px" }}>
                Ready to Submit?
              </h3>
              <p style={{ fontSize: "14px", color: "#64748b" }}>
                You are about to register a new guardian. This will be sent to the admin for approval.
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
              <div className="summary-row">
                <span className="sum-label">Relationship</span>
                <span className="sum-value">{formData.role || "Not specified"}</span>
              </div>
              <div className="summary-row">
                <span className="sum-label">Password</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="sum-value">
                    {showPassword ? formData.password : "••••••••"}
                  </span>
                  <button
                    className="toggle-password-btn"
                    style={{ position: "static" }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                      {showPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
              </div>
              <div className="summary-row">
                <span className="sum-label">ID File</span>
                <span className="sum-value" style={{ color: "var(--primary-blue)" }}>
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
        <div className="modal-header">
          <h3>
            {step === 1 && "Security Check"}
            {step === 2 && "Guardian Details"}
            {step === 3 && "Verification"}
            {step === 4 && "Confirmation"}
          </h3>
          <button className="close-modal-btn" onClick={handleClose} disabled={isSubmitting}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="modal-body">{renderStepContent()}</div>

        <div className="modal-footer">
          {step > 1 && (
            <button
              className="btn btn-cancel"
              disabled={isSubmitting} // <-- Disable back button while submitting
              onClick={() => {
                setShowPassword(false);
                setStep(step - 1);
              }}
            >
              Back
            </button>
          )}

          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            // --- NEW: Handle final submission or Next step ---
            onClick={() => {
              if (step === 1 && confirmText.toLowerCase() === "i understand") setStep(2);
              else if (step === 2 && isStep2Valid()) {
                setShowPassword(false);
                setStep(step + 1);
              } else if (step === 3) {
                setShowPassword(false);
                setStep(step + 1);
              } else if (step === 4) {
                submitGuardianRequest(); // Call our new function!
              }
            }}
            // Disable if validation fails, or if currently submitting
            disabled={
              isSubmitting ||
              (step === 1 && confirmText.toLowerCase() !== "i understand") ||
              (step === 2 && !isStep2Valid()) ||
              (step === 3 && !formData.idFile)
            }
          >
            {/* Show dynamic text based on submission state */}
            {isSubmitting 
              ? "Submitting..." 
              : step === 4 
                ? "Submit Registration" 
                : "Next Step"}
          </button>
        </div>
      </div>
    </div>
  );
}