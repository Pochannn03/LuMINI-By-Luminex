import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import AvatarEditor from "react-avatar-editor"; 
import { validateRegistrationStep } from '../../../../utils/class-manage-modal/teacherModalValidation';
import FormInputRegistration from '../../../FormInputRegistration';
import WarningModal from '../../../WarningModal'; 
import axios from 'axios';
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-teacher-modal.css';

export default function ClassManageAddTeacherModal({ isOpen, onClose, onSuccess }) {
  // HOOKS/STATES
  const [step, setStep] = useState(1); 
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // <-- NEW: Password toggle state

  // THE FIX: Set phoneNumber default to '09'
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstName: '', 
    lastName: '',     
    email: '',
    phoneNumber: '09', // <-- Default value set
    relationship: 'Teacher', 
    houseUnit: '',
    street: '',
    barangay: '',
    city: '',
    zipCode: '',
  });

  // --- CROPPER & IMAGE STATES ---
  const editorRef = useRef(null);
  const [profileImage, setProfileImage] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(null); 
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState(null); 
  const [zoom, setZoom] = useState(1);

  // --- WARNING MODAL STATE ---
  const [warningConfig, setWarningConfig] = useState({
    isOpen: false,
    title: "",
    message: ""
  });

  // VALIDATION FOR WHOLE FORM
  const validateFullForm = () => {
    const newErrors = validateRegistrationStep(formData, profileImage);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // VALIDATION FOR STEP 1 ONLY
  const handleNextStep = () => {
    const allErrors = validateRegistrationStep(formData, profileImage);
    const step1Errors = {};
    
    ['firstName', 'lastName', 'email', 'phoneNumber', 'profileImage'].forEach(field => {
      if (allErrors[field]) step1Errors[field] = allErrors[field];
    });

    if (Object.keys(step1Errors).length > 0) {
      setErrors(step1Errors);
      return;
    }
    
    setErrors({});
    setStep(2); 
  };

  // ONCLOSE ACTION
  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      firstName: '', 
      lastName: '',     
      email: '',
      phoneNumber: '09', // <-- Reset back to '09'
      relationship: 'Teacher', 
      address: '---'
    });
    setProfileImage(null);
    setPreviewUrl(null);
    setTempImage(null);
    setZoom(1);
    setErrors({});
    setShowPassword(false); // Reset password visibility
    setStep(1); 
  };

  // HANDLERS
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // --- NEW: STRICT PHONE NUMBER HANDLER ---
  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, ''); // Strip out all non-numeric characters
    
    // Force '09' at the start
    if (!val.startsWith('09')) {
      val = '09' + val.replace(/^0+/, ''); // Append '09' and remove extra accidental zeros
    }
    
    // Lock to exactly 11 digits
    if (val.length > 11) {
      val = val.slice(0, 11);
    }
    
    setFormData((prev) => ({ ...prev, phoneNumber: val }));
    if (errors.phoneNumber) setErrors(prev => ({ ...prev, phoneNumber: null }));
  };

  // --- IMAGE SELECTION HANDLER ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTempImage(URL.createObjectURL(file));
      setShowCropModal(true);
      setZoom(1);
    }
    e.target.value = null; 
    if (errors.profileImage) setErrors(prev => ({ ...prev, profileImage: null }));
  };

  // --- CROP SAVE HANDLER ---
  const handleCropSave = () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], "teacher_photo.jpg", { type: "image/jpeg" });
          setProfileImage(croppedFile);
          setPreviewUrl(URL.createObjectURL(croppedFile));
          setShowCropModal(false);
          setTempImage(null);
        }
      }, "image/jpeg", 0.95);
    }
  };

  const handleCloseModal = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 

    if (!validateFullForm()) {
      return; 
    }

    setLoading(true);
    const data = new FormData();
      
    data.append('username', formData.username);
    data.append('password', formData.password);
    data.append('first_name', formData.firstName);
    data.append('last_name', formData.lastName);
    data.append('email', formData.email);
    data.append('phone_number', formData.phoneNumber);
    data.append('relationship', formData.relationship);
    data.append('address', formData.address);

    if (profileImage) {
      data.append('profile_photo', profileImage);
    }

    try {
      const response = await axios.post('http://localhost:3000/api/teachers/modal', data, {
        withCredentials: true
      });

      handleCloseModal();
      if (onSuccess) {
        onSuccess("Teacher registered successfully!"); 
      }

    } catch (error) {
      console.error("Crash Details:", error);
      
      let errorType = "Error";
      let errorMsg = "Failed to create Teacher.";
      
      if (error.response) {
        errorMsg = error.response.data?.errors?.[0]?.msg || error.response.data?.msg || error.response.data?.error || errorMsg;
        const lowerMsg = errorMsg.toLowerCase();
        
        if (error.response.status === 409 || lowerMsg.includes('duplicate') || lowerMsg.includes('already exists') || lowerMsg.includes('taken')) {
            errorType = "Duplication";
        } else if (error.response.status === 400 || lowerMsg.includes('invalid') || lowerMsg.includes('required')) {
            errorType = "Invalid Input";
        } else {
            errorType = "Server Error";
        }
      } else if (error.request) {
        errorType = "Network Error";
        errorMsg = "Could not connect to the server. Is the backend running?";
      } else {
        errorType = "System Error";
        errorMsg = error.message; 
      }

      setWarningConfig({
        isOpen: true,
        title: `Registration Failed: ${errorType}`,
        message: errorMsg
      });

    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  
  return createPortal(
    <>
      <WarningModal 
        isOpen={warningConfig.isOpen}
        onClose={() => setWarningConfig({ ...warningConfig, isOpen: false })}
        title={warningConfig.title}
        message={warningConfig.message}
      />

      {/* --- IMAGE CROPPER MODAL OVERLAY --- */}
      {showCropModal && (
        <div className="modal-overlay active" style={{ zIndex: 999999 }}>
          <div className="modal-container" style={{ padding: '24px', alignItems: 'center', maxWidth: '350px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--text-dark)', fontWeight: 'bold' }}>Crop Profile Photo</h3>
            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
              <AvatarEditor 
                ref={editorRef} 
                image={tempImage} 
                width={220} 
                height={220} 
                border={20} 
                borderRadius={110} 
                color={[15, 23, 42, 0.6]} 
                scale={zoom} 
                rotate={0} 
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px', margin: '20px 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-gray)' }}>zoom_out</span>
              <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.01" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))} 
                style={{ flex: 1, accentColor: '#39a8ed', cursor: 'pointer' }} 
              />
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-gray)' }}>zoom_in</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button type="button" className="btn-cancel" style={{ flex: 1 }} onClick={() => { setShowCropModal(false); setTempImage(null); }}>Cancel</button>
              <button type="button" className="btn-save" style={{ flex: 1, background: '#39a8ed', border: 'none' }} onClick={handleCropSave}>Apply Crop</button>
            </div>
          </div>
        </div>
      )}

      <div className="modal-overlay active" id="addClassModal" onClick={handleCloseModal}>
        <form 
          className="modal-container" 
          onClick={(e) => e.stopPropagation()} 
          onSubmit={handleSubmit}
        >
          <div className="modal-header border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined blue-icon text-[24px]">person_add</span>
              <div>
                <h2 className="text-cdark text-[18px] font-bold leading-tight">Add New Teacher</h2>
                <p className="text-[12px] text-cgray font-medium mt-0.5">
                  Step {step} of 2: {step === 1 ? 'Personal Information' : 'Account Credentials'}
                </p>
              </div>
            </div>
          </div>

          <div className="modal-body">
            
            {/* ==========================================
                STEP 1: PERSONAL INFORMATION
                ========================================== */}
            {step === 1 && (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                
                {/* --- MODERN CIRCULAR UPLOAD UI --- */}
                <div className="flex flex-col items-center mb-6 mt-2">
                  <div 
                    className="relative w-[100px] h-[100px] rounded-full shadow-md group cursor-pointer border-4 hover:border-blue-100 transition-colors" 
                    style={{ borderColor: errors.profileImage ? '#f87171' : 'var(--white)' }} 
                    onClick={() => document.getElementById('addTeacherPhoto').click()}
                  >
                    <img 
                      src={previewUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${formData.firstName || 'Teacher'}`} 
                      alt="Preview" 
                      className="w-full h-full rounded-full object-cover bg-slate-100" 
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white text-[28px]">photo_camera</span>
                    </div>
                    
                    <input 
                      type="file" 
                      id="addTeacherPhoto" 
                      accept="image/*" 
                      hidden 
                      onChange={handleImageChange} 
                    />
                  </div>
                  <p className="text-xs mt-2 font-medium" style={{ color: 'var(--text-light)' }}>Upload Profile Photo</p>
                  {errors.profileImage && (
                    <span className="text-red-500 text-[11px] mt-1 block">{errors.profileImage}</span>
                  )}
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <div className="flex gap-2.5">
                    <FormInputRegistration
                      label="First Name"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleChange}
                      error={errors.firstName}
                      required={true}
                      placeholder="John"
                      className="form-input-modal"
                    />
                    <FormInputRegistration
                      label="Last Name"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange}
                      error={errors.lastName}
                      required={true}
                      placeholder="Doe"
                      className="form-input-modal"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <FormInputRegistration
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    required={true}
                    className="form-input-modal" 
                    placeholder="Johndoe@gmail.com"
                  />
                  {/* THE FIX: Replaced onChange with handlePhoneChange */}
                  <FormInputRegistration
                    label="Phone Number"
                    name="phoneNumber"
                    type="text"
                    value={formData.phoneNumber}
                    onChange={handlePhoneChange} 
                    error={errors.phoneNumber}
                    required={true}
                    className="form-input-modal" 
                    placeholder="09XXXXXXXXX"
                  />
                </div>
              </div>
            )}

            {/* ==========================================
                STEP 2: LOGIN CREDENTIALS
                ========================================== */}
            {step === 2 && (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#f0f0f0]">
                  <span className="material-symbols-outlined blue-icon">lock</span>
                  <h3 className="text-cdark font-semibold text-[16px]">Set Login Credentials</h3>
                </div>

                <div className="flex flex-col gap-2">
                  <FormInputRegistration
                    label="Username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    error={errors.username}
                    required={true}
                    className="form-input-modal" 
                    placeholder="Teacher_Tessa"
                  />
                </div>

                {/* THE FIX: Custom Password Input wrapper to allow for absolute positioned eye icon */}
                <div className="flex flex-col gap-1 mt-2">
                  <label className="text-[13px] font-semibold text-[#64748b] tracking-wide">
                    Password <span className="text-[#39a8ed]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`form-input-modal w-full pr-10 ${errors.password ? 'border-red-500 bg-red-50' : ''}`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer p-1 transition-colors"
                      tabIndex="-1" // Prevents tab stopping on the eye icon
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                  </div>
                  {errors.password && <span className="text-red-500 text-[11px]">{errors.password}</span>}
                </div>
              </div>
            )}

          </div>

          <div className="modal-footer mt-6">
            {step === 1 ? (
              <>
                <button className="btn-cancel" type="button" onClick={handleCloseModal}>Cancel</button>
                <button className="btn-save flex items-center justify-center gap-1.5" type="button" onClick={handleNextStep}>
                  Next <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </>
            ) : (
              <>
                <button className="btn-cancel" type="button" onClick={() => setStep(1)}>Back</button>
                <button className="btn-save" type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Register Teacher"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}