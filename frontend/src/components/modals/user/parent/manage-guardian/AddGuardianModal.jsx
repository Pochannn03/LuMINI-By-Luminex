// frontend/src/components/modals/user/parent/manage-guardian/AddGuardianModal.jsx

import React, { useState, useEffect, useRef } from "react";
import axios from "axios"; 
import "../../../../../styles/user/parent/manage-guardian.css";
import "../../../../../index.css";
import SuccessModal from "../../../../SuccessModal";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function AddGuardianModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); 
  const [childrenList, setChildrenList] = useState([]);

  // --- CUSTOM DROPDOWN STATE ---
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const roleRef = useRef(null);

  const [formData, setFormData] = useState({
    student_ids: [], 
    firstName: "",
    lastName: "",
    email: "",
    phone: "09",
    role: "",
    username: "",
    password: "",
    idFile: null,
  });

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (roleRef.current && !roleRef.current.contains(event.target)) setIsRoleOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      axios.get(`${BACKEND_URL}/api/parent/children`, { withCredentials: true })
        .then(response => {
          if (response.data.success || response.data.children) {
            const fetchedChildren = response.data.children || [];
            setChildrenList(fetchedChildren);
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
    setIsRoleOpen(false);
    setFormData({
      student_ids: [], 
      firstName: "",
      lastName: "",
      email: "",
      phone: "09",
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
    let newFormData = { ...formData };

    if (name === "phone") {
      let numericVal = value.replace(/\D/g, '');
      if (numericVal.length < 2) numericVal = "09"; 
      else if (!numericVal.startsWith("09")) numericVal = "09" + numericVal.substring(2);
      newFormData.phone = numericVal.slice(0, 11);
    } else {
      newFormData[name] = value;
    }

    if (name === "firstName" || name === "lastName") {
      const fName = name === "firstName" ? value : formData.firstName;
      const lName = name === "lastName" ? value : formData.lastName;
      newFormData.username = generateUsername(fName, lName);
    }
    
    setFormData(newFormData);
  };

  const handleCheckboxChange = (studentId) => {
    setFormData(prev => {
      const isSelected = prev.student_ids.includes(studentId);
      if (isSelected) {
        return { ...prev, student_ids: prev.student_ids.filter(id => id !== studentId) };
      } else {
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
      formData.student_ids.length > 0 && 
      formData.firstName.trim() !== "" &&
      formData.lastName.trim() !== "" &&
      formData.phone.length === 11 &&
      formData.role.trim() !== "" &&
      formData.password.length >= 8
    );
  };

  const submitGuardianRequest = async () => {
    setIsSubmitting(true);
    try {
      const dataToSend = new FormData();
      dataToSend.append("student_ids", JSON.stringify(formData.student_ids)); 
      dataToSend.append("firstName", formData.firstName);
      dataToSend.append("lastName", formData.lastName);
      dataToSend.append("phone", formData.phone);
      dataToSend.append("role", formData.role);
      dataToSend.append("username", formData.username);
      dataToSend.append("password", formData.password);
      dataToSend.append("idFile", formData.idFile); 

      await axios.post(
        `${BACKEND_URL}/api/parent/guardian-request`,
        dataToSend,
        { headers: { "Content-Type": "multipart/form-data" }, withCredentials: true }
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

  const roleOptions = [
    { value: "Grandparent", label: "Grandparent", icon: "elderly" },
    { value: "Aunt/Uncle", label: "Aunt / Uncle", icon: "people" },
    { value: "Sibling", label: "Older Sibling", icon: "supervisor_account" },
    { value: "Driver", label: "Driver / Nanny", icon: "directions_car" },
    { value: "Other", label: "Other", icon: "person" },
  ];

  const getRoleLabel = (value) => roleOptions.find(r => r.value === value)?.label || 'Select role...';

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

            {/* --- REVAMPED STUDENT SELECTION --- */}
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                Assign Guardian To Student(s)
              </label>

              <div className="flex flex-col gap-2">
                {childrenList.map(child => {
                  const isSelected = formData.student_ids.includes(child.student_id);
                  return (
                    <button
                      key={child.student_id}
                      type="button"
                      onClick={() => handleCheckboxChange(child.student_id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left focus:outline-none cursor-pointer ${
                        isSelected
                          ? 'border-[#39a8ed] bg-blue-50 shadow-sm shadow-blue-100'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[15px] font-black transition-colors ${
                        isSelected ? 'bg-[#39a8ed] text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {child.first_name?.[0]}{child.last_name?.[0]}
                      </div>

                      {/* Name */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={`text-[14px] font-bold leading-tight truncate transition-colors ${
                          isSelected ? 'text-[#1a7cb8]' : 'text-slate-700'
                        }`}>
                          {child.first_name} {child.last_name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">ID: {child.student_id}</span>
                      </div>

                      {/* Custom checkbox indicator */}
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                        isSelected
                          ? 'bg-[#39a8ed] border-[#39a8ed]'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && (
                          <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {formData.student_ids.length === 0 && (
                <p className="text-red-500! text-[12px]! mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  Please select at least one student.
                </p>
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
                <input name="phone" className="modal-input" placeholder="09123456789" value={formData.phone} onChange={handleInputChange} maxLength={11} />
              </div>

              {/* RELATIONSHIP CUSTOM DROPDOWN */}
              <div>
                <label className="modal-label">Relationship to Child</label>
                <div className="relative" ref={roleRef}>
                  <button
                    type="button"
                    onClick={() => setIsRoleOpen(!isRoleOpen)}
                    className={`flex items-center justify-between w-full h-[42px] px-3 rounded-xl border bg-white text-[13px] font-medium transition-all focus:outline-none ${
                      isRoleOpen
                        ? 'border-[#39a8ed] ring-2 ring-blue-500/10'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className={formData.role ? 'text-slate-800' : 'text-slate-400'}>
                      {getRoleLabel(formData.role)}
                    </span>
                    <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform duration-300 ${isRoleOpen ? 'rotate-180 text-[#39a8ed]' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  {isRoleOpen && (
                    <div className="absolute top-[46px] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-1 flex flex-col gap-0.5 animate-[fadeIn_0.2s_ease-out]">
                      {roleOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className="w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg text-[13px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-[#39a8ed] transition-colors"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, role: opt.value }));
                            setIsRoleOpen(false);
                          }}
                        >
                          <span className="material-symbols-outlined text-[16px] text-slate-400">{opt.icon}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
              <div className="summary-row">
                <span className="sum-label">Temp Password</span>
                <div className="sum-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: showPassword ? 'inherit' : 'monospace', letterSpacing: showPassword ? 'normal' : '2px' }}>
                    {showPassword ? formData.password : "••••••••"}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: '2px' }}
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
          <button
            className="text-slate-400 hover:text-red-500 transition-all duration-300 hover:rotate-90 bg-transparent border-none cursor-pointer flex items-center justify-center p-2 z-50"
            onClick={handleClose}
            disabled={isSubmitting}
          >
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
            {isSubmitting ? "Submitting..." : step === 4 ? "Submit" : "Next Step"}
          </button>
        </div>
      </div>

      <SuccessModal 
        isOpen={showSuccessModal} 
        onClose={() => { setShowSuccessModal(false); handleClose(); }}
        message="Your submission was successful! However, it still needs to be verified by your child's teacher(s)."
      />  
    </div>
  );
}