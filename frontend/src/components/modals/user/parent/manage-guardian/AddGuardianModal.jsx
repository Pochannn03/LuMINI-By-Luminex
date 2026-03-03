import React, { useState, useEffect } from "react";
import axios from "axios"; 
import "../../../../../styles/user/parent/manage-guardian.css";
import "../../../../../index.css";
import SuccessModal from "../../../../SuccessModal";

export default function AddGuardianModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); 

  const [childrenList, setChildrenList] = useState([]);

  // --- CHANGED: student_ids is now an array ---
  const [formData, setFormData] = useState({
    student_ids: [], 
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    username: "",
    password: "",
    idFile: null,
  });

  useEffect(() => {
    if (isOpen) {
      axios.get('http://localhost:3000/api/parent/children', { withCredentials: true })
        .then(response => {
          if (response.data.success || response.data.children) {
            const fetchedChildren = response.data.children || [];
            setChildrenList(fetchedChildren);
            
            // Auto-check all children by default for convenience
            if (fetchedChildren.length > 0) {
              setFormData(prev => ({ 
                ...prev, 
                student_ids: fetchedChildren.map(c => c.student_id) 
              }));
            }
          }
        })
        .catch(err => console.error("Failed to load children:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setConfirmText("");
    setShowPassword(false);
    setPreviewUrl(null);
    setFormData({
      student_ids: [], // Reset array
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

  // --- NEW: Handle Checkbox toggles ---
  const handleCheckboxChange = (studentId) => {
    setFormData(prev => {
      const isSelected = prev.student_ids.includes(studentId);
      if (isSelected) {
        // Remove from array
        return { ...prev, student_ids: prev.student_ids.filter(id => id !== studentId) };
      } else {
        // Add to array
        return { ...prev, student_ids: [...prev.student_ids, studentId] };
      }
    });
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
      formData.student_ids.length > 0 && // Must have at least 1 child selected
      formData.firstName.trim() !== "" &&
      formData.lastName.trim() !== "" &&
      formData.phone.trim() !== "" &&
      formData.role.trim() !== "" &&
      formData.password.length >= 8
    );
  };

  const submitGuardianRequest = async () => {
    setIsSubmitting(true);
    try {
      const dataToSend = new FormData();
      // Send the array as a JSON string so backend can parse it
      dataToSend.append("student_ids", JSON.stringify(formData.student_ids)); 
      dataToSend.append("firstName", formData.firstName);
      dataToSend.append("lastName", formData.lastName);
      dataToSend.append("phone", formData.phone);
      dataToSend.append("role", formData.role);
      dataToSend.append("username", formData.username);
      dataToSend.append("password", formData.password);
      dataToSend.append("idFile", formData.idFile); 

      await axios.post(
        "http://localhost:3000/api/parent/guardian-request",
        dataToSend,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );

      setShowSuccessModal(true); 
      if (onSuccess) onSuccess(); 

    } catch (error) {
      console.error("Error submitting request:", error);
      alert(error.response?.data?.message || "An error occurred while submitting.");
    } finally {
      setIsSubmitting(false); 
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="info-box">
              <h4><span className="material-symbols-outlined">info</span>What guardians can do</h4>
              <p>Adding a guardian grants them authorization to <strong>pick up and drop off</strong> your linked children.</p>
              <div className="info-note">
                <span>Note:</span>
                <span>They cannot edit student details or manage other guardians.</span>
              </div>
            </div>
            <div className="form-group">
              <label style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b", marginBottom: "8px", display: "block" }}>
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

      case 2:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* --- NEW: CHECKBOXES FOR STUDENTS --- */}
            <div className="form-group p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
              <label className="modal-label" style={{ marginBottom: "12px" }}>Assign Guardian To Student(s):</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {childrenList.map(child => (
                   <label key={child.student_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                     <input 
                       type="checkbox"
                       checked={formData.student_ids.includes(child.student_id)}
                       onChange={() => handleCheckboxChange(child.student_id)}
                       style={{ width: '18px', height: '18px', accentColor: '#39a8ed', cursor: 'pointer' }}
                     />
                     <span style={{ fontSize: '15px', color: '#1e293b', fontWeight: '500' }}>
                       {child.first_name} {child.last_name}
                     </span>
                   </label>
                ))}
              </div>
              {formData.student_ids.length === 0 && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>* Please select at least one student.</p>
              )}
            </div>

            <div className="form-grid-2">
              <div>
                <label className="modal-label">First Name</label>
                <input name="firstName" className="modal-input" placeholder="e.g. Maria" value={formData.firstName} onChange={handleInputChange} />
              </div>
              <div>
                <label className="modal-label">Last Name</label>
                <input name="lastName" className="modal-input" placeholder="e.g. Santos" value={formData.lastName} onChange={handleInputChange} />
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label className="modal-label">Phone Number</label>
                <input name="phone" className="modal-input" placeholder="0912..." value={formData.phone} onChange={handleInputChange} />
              </div>
              <div>
                <label className="modal-label">Relationship to Child</label>
                <select name="role" className="modal-input" value={formData.role} onChange={handleInputChange} style={{ backgroundColor: 'white' }}>
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
                <input name="username" className="modal-input" value={formData.username} readOnly style={{ background: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }} />
              </div>
              <div>
                <label className="modal-label">Temp Password</label>
                <div className="password-input-wrapper">
                  <input name="password" className="modal-input" type={showPassword ? "text" : "password"} placeholder="Min. 8 chars" value={formData.password} onChange={handleInputChange} />
                  <button type="button" className="toggle-password-btn" onClick={() => setShowPassword(!showPassword)}>
                    <span className="material-symbols-outlined">{showPassword ? "visibility" : "visibility_off"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div className="upload-section-title">
              <h4>Upload Valid ID</h4>
              <p>We need a government-issued ID for verification.</p>
            </div>
            <label className="upload-box">
              <input type="file" hidden onChange={handleFileChange} accept="image/*" />
              {formData.idFile && previewUrl ? (
                <div className="preview-container">
                  <img src={previewUrl} alt="ID Preview" className="id-preview-img" />
                  <div className="preview-overlay">
                    <span className="material-symbols-outlined" style={{ fontSize: "32px", marginBottom: "8px" }}>edit</span>
                    <span style={{ fontSize: "14px", fontWeight: "600" }}>Click to Change Image</span>
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
          </div>
        );

      case 4:
        // Get names of all selected children for the summary
        const selectedChildNames = childrenList
          .filter(c => formData.student_ids.includes(c.student_id))
          .map(c => `${c.first_name} ${c.last_name}`)
          .join(", ");

        return (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "#10b981" }}>check_circle</span>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1e293b", marginTop: "8px" }}>Ready to Submit?</h3>
              <p style={{ fontSize: "14px", color: "#64748b" }}>This will be sent to the teacher(s) for approval.</p>
            </div>

            <div className="summary-card">
              <div className="summary-row">
                <span className="sum-label">Assigned To</span>
                <span className="sum-value" style={{ fontWeight: "bold", color: "var(--primary-blue)" }}>
                  {selectedChildNames || "None"}
                </span>
              </div>
              <div className="summary-row">
                <span className="sum-label">Guardian Name</span>
                <span className="sum-value">{formData.firstName} {formData.lastName}</span>
              </div>
              <div className="summary-row">
                <span className="sum-label">Username</span>
                <span className="sum-value">{formData.username}</span>
              </div>

              {/* --- NEW PASSWORD ROW WITH EYE TOGGLE --- */}
              <div className="summary-row">
                <span className="sum-label">Temp Password</span>
                <div className="sum-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: showPassword ? 'inherit' : 'monospace', letterSpacing: showPassword ? 'normal' : '2px' }}>
                    {showPassword ? formData.password : "••••••••"}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      background: 'none', border: 'none', cursor: 'pointer', 
                      color: '#94a3b8', display: 'flex', padding: '2px' 
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="summary-row" style={{ borderBottom: 'none' }}>
                <span className="sum-label">Relationship</span>
                <span className="sum-value">{formData.role || "Not specified"}</span>
              </div>
            </div>
          </div>
        );

      default: return null;
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
            <button className="btn btn-cancel" disabled={isSubmitting} onClick={() => setStep(step - 1)}>Back</button>
          )}
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => {
              if (step === 1 && confirmText.toLowerCase() === "i understand") setStep(2);
              else if (step === 2 && isStep2Valid()) setStep(3);
              else if (step === 3 && formData.idFile) setStep(4);
              else if (step === 4) submitGuardianRequest(); 
            }}
            disabled={
              isSubmitting ||
              (step === 1 && confirmText.toLowerCase() !== "i understand") ||
              (step === 2 && !isStep2Valid()) ||
              (step === 3 && !formData.idFile)
            }
          >
            {isSubmitting ? "Submitting..." : step === 4 ? "Submit Registration" : "Next Step"}
          </button>
        </div>
      </div>

      <SuccessModal 
        isOpen={showSuccessModal} 
        onClose={() => {
          setShowSuccessModal(false); 
          handleClose();              
        }}
        message="Your submission was successful! However, it still needs to be verified by your child's teacher(s)."
      />  
    </div>
  );
}