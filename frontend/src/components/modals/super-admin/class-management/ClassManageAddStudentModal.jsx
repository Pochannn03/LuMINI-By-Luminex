import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { validateStudentRegistrationStep } from '../../../../utils/class-manage-modal/studentModalValidation';
import QRCode from "react-qr-code";
import FormInputRegistration from '../../../FormInputRegistration';
import axios from 'axios';
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-student-modal.css'

export default function ClassManageAddStudentModal({ isOpen, onClose }) {
  const qrRef = useRef(null);
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthdate: '',
    age: '',
    allergies: 'None',
    medical_history: 'None',
    studentId: 'Generating...', 
    invitationCode: '',
  })

  // USE EFFECTS
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        firstName: '',
        lastName: '',
        birthdate: '',
        age: '',
        allergies: 'None',
        medical_history: 'None',
        studentId: 'Generating...', 
        invitationCode: '',
      });
      setProfileImage(null);
      setPreviewUrl(null);
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const fetchNextId = async () => {
        try {
          setFormData(prev => ({ ...prev, studentId: "Loading..." }));
          
          const response = await axios.get('http://localhost:3000/api/students/id', {
            withCredentials: true
          });

          setFormData(prev => ({ ...prev, studentId: response.data.student_id }));
        } catch (err) {
          console.error("Failed to fetch ID preview", err);
          setFormData(prev => ({ ...prev, studentId: "Error" }));
        }
      };

      fetchNextId();
    } else {
      setFormData(prev => ({ ...prev, studentId: "Generating..." }));
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.birthdate) {
      const birthDate = new Date(formData.birthdate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setFormData((prev) => ({ ...prev, age: age >= 0 ? age : 0 }));
    }
  }, [formData.birthdate]);

  const generateCode = async () => {
    setLoadingCode(true);
    try {
      const response = await axios.get('http://localhost:3000/api/students/invitation', {
        withCredentials: true
      });

      // Update state with the code from the server
      setFormData((prev) => ({ 
        ...prev, 
        invitationCode: response.data.code 
      }));

    } catch (error) {
      console.error("Error generating code:", error);
      alert("Failed to generate code. Please try again.");
    } finally {
      setLoadingCode(false);
    }
  };

  const downloadQRCode = () => {
    const svg = qrRef.current.querySelector("svg");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    // Canvas dimensions
    const qrSize = 500; 
    const padding = 60; // Space for the white border
    const textSpace = 80; // Extra height for the Student ID text
    
    canvas.width = qrSize + (padding * 2);
    canvas.height = qrSize + padding + textSpace;

    img.onload = () => {
      // 1. Draw solid white background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 2. Draw the QR code (centered horizontally)
      ctx.drawImage(img, padding, padding, qrSize, qrSize);
      
      // 3. Draw the Student ID text (XS style)
      ctx.fillStyle = "#64748b"; // slate-500 color
      ctx.font = "bold 24px monospace"; // XS size relative to 500px QR
      ctx.textAlign = "center";
      
      // Position text at the bottom
      ctx.fillText(
        formData.studentId, 
        canvas.width / 2, 
        qrSize + padding + (textSpace / 2)
      );
      
      // 4. Trigger Download
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${formData.studentId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  // HELPERS REMOVING THE DATAS AFTER USER/CLOSED MODAL
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      birthdate: '',
      age: '',
      allergies: 'None',
      medical_history: 'None',
      studentId: 'Generating...', 
      invitationCode: '',
    });
    setProfileImage(null);
    setPreviewUrl(null);
    setErrors({});
  };

  const handleCloseModal = () => {
    resetForm();
    onClose();
  };

  // VALIDATION
  const validateStep = () => {
    const newErrors = validateStudentRegistrationStep(formData, profileImage);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // HANDLERS
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
    if (errors.profileImage) setErrors(prev => ({ ...prev, profileImage: null }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 

    if (!validateStep()) {
      return;
    }

    if (!formData.invitationCode) {
      alert("Please generate an invitation code.");
      return;
    }

    setLoading(true);
    const data = new FormData();
      
    data.append('first_name', formData.firstName);
    data.append('last_name', formData.lastName);
    data.append('birthday', formData.birthdate);
    data.append('age', formData.age);
    data.append('allergies', formData.allergies)
    data.append('medical_history', formData.medical_history)
    data.append('invitation_code', formData.invitationCode);

    if (profileImage) {
      data.append('profile_photo', profileImage);
    }

    try {
      const response = await axios.post('http://localhost:3000/api/students', data, {
        withCredentials: true
      });

      alert("Student created successfully!");
      handleCloseModal();
      console.log("Success:", response.data);

    } catch (error) {
      console.error("Crash Details:", error);
      if (error.response) {
        const errorMsg = error.response.data.msg || error.response.data.error || "Failed to create student";
        if (error.response.data.errors) {
          alert(`Validation Error: ${error.response.data.errors[0].msg}`);
        } else {
          alert(`Error: ${errorMsg}`);
        }
      } else if (error.request) {
        alert("Network Error. Is the backend running?");
      } else {
        alert(`Code Error: ${error.message}`); 
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  
  return createPortal(
    <>
      <div className="modal-overlay active" id="addStudentModal" onClick={handleCloseModal}>
        {/* FIX: Form IS the container now */}
        <form 
          className="modal-container" 
          onClick={(e) => e.stopPropagation()} 
          onSubmit={handleSubmit}
        >
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined blue-icon text-[24px]">person_add</span>
              <h2 className="text-cdark text-[24px] font-bold">Register New Student</h2>
            </div>
          </div>

          <div className="modal-body">
            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Student Photo</label>
              <input 
                type="file" 
                id="addStudentPhoto" 
                accept="image/*" 
                hidden 
                onChange={handleImageChange}
              />

              <div 
                className={`custom-file-upload cursor-pointer ${errors.profileImage ? 'border-red-500! bg-red-50' : ''}`} 
                onClick={() => document.getElementById('addStudentPhoto').click()}
              >
                {!previewUrl ? (
                  <div className="text-cdark mt-2 mb-1 font-medium text-center" id="stuUploadInitial">
                    <span className="material-symbols-outlined blue-icon text-[32px]">face</span>
                    <p className={`${errors.profileImage ? 'text-red-600' : 'text-cdark'} font-medium! mt-2 mx-0 mb-1`}>
                      Click to upload photo
                    </p>
                    <span className="text-cgray text-[12px]">PNG, JPG (Max 5MB)</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center p-[5px]" id="stuUploadSelected">
                    <div className="flex items-center gap-2.5">
                      <img src={previewUrl} alt="Preview" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                      <span className="text-cdark font-medium max-w-[250px] truncate" id="stuFileName">
                        {profileImage?.name}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-base text-[#22c55e]">check_circle</span>
                  </div>
                )}
              </div>

              {errors.profileImage && (
                <span className="text-red-500 text-[11px] ml-1 mt-1 font-medium">
                  {errors.profileImage}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Student ID (Auto-generated)</label>
              <input 
                type="text" 
                value={formData.studentId}
                className="form-input-modal text-cgray cursor-not-allowed! focus:outline-none" 
                readOnly 
                placeholder="Generating..." 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Full Name</label>
              <div className="flex gap-2.5">
                <FormInputRegistration 
                  name="firstName" 
                  value={formData.firstName}
                  onChange={handleChange} 
                  placeholder="First Name" 
                  error={errors.firstName} 
                  className="form-input-modal"
                />
                <FormInputRegistration 
                  name="lastName" 
                  value={formData.lastName}
                  onChange={handleChange} 
                  placeholder="Last Name" 
                  error={errors.lastName} 
                  className="form-input-modal"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Birthdate & Age</label>
              <div className="flex gap-2.5">
                <div className="flex flex-col flex-1">
                  <input 
                    type="date"
                    name="birthdate"
                    value={formData.birthdate}
                    onChange={handleChange} 
                    className={`form-input-modal w-full ${errors.birthdate ? 'border-red-500! bg-red-50' : ''}`} 
                  />
                  {errors.birthdate && (
                    <span className="text-red-500 text-[11px] ml-1 mt-1">{errors.birthdate}</span>
                  )}
                </div>
                <input 
                  type="text"
                  name="age"
                  value={formData.age}
                  className="form-input-modal flex flex-1 text-center cursor-not-allowed! focus:outline-none" 
                  placeholder={formData.age}
                  readOnly 
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <FormInputRegistration
                label="Allergies"
                name="allergies" 
                value={formData.allergies}
                onChange={handleChange} 
                placeholder="Allergies" 
                error={errors.allergies} 
                className="form-input-modal"
              />
            </div>

            <div className="flex flex-col gap-2">
              <FormInputRegistration
                label="Medical History"
                name="medical_history"
                type="textarea"
                value={formData.medical_history}
                onChange={handleChange}
                placeholder="List any medical history..."
                rows={3} 
                error={errors.medical_history}
                className="form-input-modal"
              />
            </div>

            <div className="flex items-center gap-2 mt-2 pb-2 border-b border-[#f0f0f0]">
              <span className="material-symbols-outlined orange-icon">vpn_key</span>
              <h3>Parent Access</h3>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-cgray text-[13px] font-medium mb-0">Invitation Code</label>
                <button 
                  type="button" 
                  onClick={generateCode} 
                  className="text-cprimary-blue bg-none flex items-center border-none cursor-pointer gap-1 text-[12px] font-semibold"
                >
                  <span className="material-symbols-outlined text-[16px]">{loadingCode ? 'progress_activity' : 'refresh'}</span>
                  {loadingCode ? 'Loading...' : 'Generate New'}
                </button>
              </div>
              <input 
                type="text" 
                name="invitationCode"
                value={formData.invitationCode} 
                className="form-input-modal bg-[#f1f5f9] text-cdark tracking-[3px] font-bold text-center text-base cursor-not-allowed! focus:outline-none" 
                readOnly 
              />
              <p className="text-[11px]! text-slate-400 mt-1">
                Share this code with the parent to link accounts.
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium mb-0">Qr ID</label>
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 mb-4">
                <div className="flex justify-between items-center w-full mb-3">
                  <label className="text-cgray text-[12px] font-bold uppercase tracking-wider">Registration QR Preview</label>
                  
                  {formData.studentId && !["Loading...", "Generating..."].includes(formData.studentId) && (
                    <button 
                      type="button"
                      onClick={downloadQRCode}
                      className="text-cprimary-blue flex items-center gap-1 text-[11px] font-bold hover:underline cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      Download PNG
                    </button>
                  )}
                </div>

                {/* Visual Preview Container */}
                <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col items-center" ref={qrRef}>
                  {formData.studentId && !["Loading...", "Generating..."].includes(formData.studentId) ? (
                    <>
                      <QRCode
                        size={120}
                        value={formData.studentId}
                        viewBox={`0 0 256 256`}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      />
                      {/* XS-style ID label in preview */}
                      <p className="text-[10px] font-mono mt-2 text-slate-500 tracking-widest uppercase">
                        {formData.studentId}
                      </p>
                    </>
                  ) : (
                    <div className="w-[120px] h-[120px] flex items-center justify-center bg-slate-100 text-slate-400">
                      <span className="material-symbols-outlined text-[40px]">qr_code_2</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
          </div>

          <div className="modal-footer">
            <button className="btn-cancel" type="button" onClick={handleCloseModal}>Cancel</button>
            <button className="btn-save" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Register Student"}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}