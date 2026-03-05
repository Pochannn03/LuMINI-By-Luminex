import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { validateRegistrationStep } from '../../../../utils/class-manage-modal/teacherModalValidation';
import axios from 'axios';
import FormInputRegistration from '../../../FormInputRegistration';
import AvatarEditor from "react-avatar-editor"; 
import WarningModal from '../../../WarningModal'; 

// --- ADDED HELPER ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const getImageUrl = (path, firstName) => {
  if (!path) return `https://api.dicebear.com/7.x/initials/svg?seed=${firstName || 'Teacher'}`; 
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
};
// --------------------

export default function ClassManageEditTeacherModal({ isOpen, onClose, teacherData, onSuccess }) {
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // --- ACCORDION STATES ---
  const [isPersonalInfoOpen, setIsPersonalInfoOpen] = useState(false);
  const [isLoginInfoOpen, setIsLoginInfoOpen] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstName: '', 
    lastName: '',     
    email: '',
    phoneNumber: '',  
    relationship: 'Teacher', 
    houseUnit: '',
    street: '',
    barangay: '',
    city: '',
    zipCode: '',
  });

  // --- WARNING MODAL STATE ---
  const [warningConfig, setWarningConfig] = useState({
    isOpen: false,
    title: "",
    message: ""
  });

  // --- CROPPER STATES ---
  const editorRef = useRef(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  // 1. Populate Form Data when modal opens
  useEffect(() => {
    if (isOpen && teacherData) {
      let addrParts = ["", "", "", "", ""];
      if (teacherData.address) {
        addrParts = teacherData.address.split(',').map(part => part.trim());
      }

      setFormData({
        firstName: teacherData.first_name || '',
        lastName: teacherData.last_name || '',
        email: teacherData.email || '',
        phoneNumber: teacherData.phone_number || '',
        username: teacherData.username || '',
        password: '',
        relationship: teacherData.relationship || 'Teacher',
        houseUnit: addrParts[0] || '',
        street: addrParts[1] || '',
        barangay: addrParts[2] || '',
        city: addrParts[3] || '',
        zipCode: addrParts[4] || '',
      });
      
      setPreviewUrl(getImageUrl(teacherData.profile_picture, teacherData.first_name));
      setProfileImage(null);
      setTempImage(null);
      setShowCropModal(false);
      setShowPassword(false);
      setErrors({}); 
      
      // Reset accordions when opened
      setIsPersonalInfoOpen(false);
      setIsLoginInfoOpen(false);
    }
  }, [isOpen, teacherData]);

  // HANDLERS
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // --- STRICT PHONE NUMBER HANDLER ---
  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, ''); 
    
    if (val.length > 0 && !val.startsWith('09')) {
      val = '09' + val.replace(/^0+/, ''); 
    }
    
    if (val.length > 11) {
      val = val.slice(0, 11);
    }
    
    setFormData((prev) => ({ ...prev, phoneNumber: val }));
    if (errors.phoneNumber) setErrors(prev => ({ ...prev, phoneNumber: null }));
  };

  // --- CROPPER LOGIC ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setTempImage(imageUrl);
      setShowCropModal(true); 
      setZoom(1);
    }
    e.target.value = null; 
    if (errors.profileImage) setErrors(prev => ({ ...prev, profileImage: null }));
  };

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

  // 3. Submit Changes
  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateRegistrationStep(formData, profileImage); 

    // --- BUG FIX: Scrub errors for fields we intentionally skip in the Edit Modal ---
    if (!formData.password) delete newErrors.password; 
    if (!profileImage) delete newErrors.profileImage; 
    
    // The Edit Modal no longer uses these address inputs, so we must ignore their errors!
    ['houseUnit', 'street', 'barangay', 'city', 'zipCode', 'address'].forEach(key => delete newErrors[key]);

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.firstName || newErrors.lastName || newErrors.email || newErrors.phoneNumber) {
        setIsPersonalInfoOpen(true);
      }
      if (newErrors.username || newErrors.password) {
        setIsLoginInfoOpen(true);
      }
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      
      // --- BUG FIX: Prevent sending a weird string like ", , , , " if they had no address ---
      const addressParts = [formData.houseUnit, formData.street, formData.barangay, formData.city, formData.zipCode].filter(Boolean);
      const finalAddress = addressParts.length > 0 ? addressParts.join(', ') : (teacherData.address || '');
      
      data.append('first_name', formData.firstName);
      data.append('last_name', formData.lastName);
      data.append('email', formData.email);
      data.append('phone_number', formData.phoneNumber);
      data.append('username', formData.username);
      data.append('address', finalAddress);
      data.append('relationship', formData.relationship || 'Teacher');

      if (formData.password) {
        data.append('password', formData.password);
      }

      if (profileImage) {
        data.append('profile_photo', profileImage);
      }

      const response = await axios.put(`${BACKEND_URL}/api/teacher/${teacherData._id}`, data, {
        withCredentials: true,
      });

      if (response.data.success) {
        onSuccess(response.data.msg); 
      }
      onClose();

    } catch (error) {
      console.error("Update failed:", error);
      
      let errorType = "Update Error";
      let errorMsg = "Failed to update teacher profile.";
      
      if (error.response) {
        errorMsg = error.response.data?.errors?.[0]?.msg || error.response.data?.msg || error.response.data?.error || errorMsg;
        const lowerMsg = errorMsg.toLowerCase();
        
        if (error.response.status === 409 || lowerMsg.includes('duplicate') || lowerMsg.includes('already taken')) {
            errorType = "Duplication";
        } else if (error.response.status === 400 || lowerMsg.includes('invalid')) {
            errorType = "Invalid Input";
        }
      }

      setWarningConfig({
        isOpen: true,
        title: `Update Failed: ${errorType}`,
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

      {/* --- CROPPER SUB-MODAL --- */}
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

      {/* --- MAIN EDIT MODAL --- */}
      <div className="modal-overlay active flex justify-center items-center p-4 z-[9990]" id="editTeacherModal" onClick={onClose}>
        <form 
          className="bg-white rounded-3xl w-full max-w-[480px] relative overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[95vh]" 
          onClick={(e) => e.stopPropagation()} 
          onSubmit={handleSubmit}
        >
          <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar pr-4">
            
            <style>
              {`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 5px; 
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent; 
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background-color: #cbd5e1; 
                  border-radius: 10px; 
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background-color: #94a3b8; 
                }
              `}
            </style>

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563eb] text-[24px]">manage_accounts</span>
                <h2 className="text-[20px] font-extrabold text-[#1e293b]">Edit Teacher Profile</h2>
              </div>
              <button 
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-slate-500 transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            {/* 1. SLEEK PROFILE PICTURE UPLOAD */}
            <div className="flex flex-col items-center mb-8">
              <div 
                className="relative w-[100px] h-[100px] rounded-full shadow-md group cursor-pointer border-4 hover:border-blue-100 transition-colors" 
                style={{ borderColor: errors.profileImage ? '#f87171' : 'var(--white)' }} 
                onClick={() => document.getElementById('editTeacherPhoto').click()}
              >
                <img 
                  src={previewUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${formData.firstName || 'Teacher'}`} 
                  alt="Preview" 
                  className="w-full h-full rounded-full object-cover bg-slate-100" 
                />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-white text-[28px]">edit</span>
                </div>
                
                <input 
                  type="file" 
                  id="editTeacherPhoto" 
                  accept="image/*" 
                  hidden 
                  onChange={handleImageChange} 
                />
              </div>
              <p className="text-[12px] mt-3 font-medium text-[#64748b]">Click to change photo</p>
              {errors.profileImage && (
                <span className="text-red-500 text-[11px] mt-1 block font-bold">{errors.profileImage}</span>
              )}
            </div>

            {/* 2. PERSONAL DETAILS BLOCK (ACCORDION) */}
            <div className={`bg-white rounded-2xl border border-[#e2e8f0] mb-5 shadow-sm transition-all duration-300 ${isPersonalInfoOpen ? 'p-5' : 'p-3'}`}>
              <button 
                type="button"
                className="w-full flex items-center justify-between group px-2"
                onClick={() => setIsPersonalInfoOpen(!isPersonalInfoOpen)}
              >
                <h4 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider flex items-center gap-2 transition-colors group-hover:text-[#64748b]">
                  <span className="material-symbols-outlined text-[18px] text-[#cbd5e1] group-hover:text-[#94a3b8] transition-colors">person</span> 
                  Personal Information
                </h4>
                <span className={`material-symbols-outlined text-[#cbd5e1] group-hover:text-[#94a3b8] transition-transform duration-300 ${isPersonalInfoOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              
              <div className={`grid transition-all duration-300 ease-in-out ${isPersonalInfoOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="flex flex-col gap-3 pt-4">
                    <div className="flex gap-3">
                      <FormInputRegistration 
                        label="First Name"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="First Name" 
                        error={errors.firstName} 
                        className="form-input-modal w-full"
                      />
                      <FormInputRegistration 
                        label="Last Name"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Last Name" 
                        error={errors.lastName} 
                        className="form-input-modal w-full" 
                      />
                    </div>

                    <FormInputRegistration 
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Email Address" 
                      error={errors.email}
                      className="form-input-modal"
                    />

                    <FormInputRegistration 
                      label="Phone Number"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="09XXXXXXXXX" 
                      error={errors.phoneNumber}
                      className="form-input-modal" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. LOGIN CREDENTIALS BLOCK (ACCORDION) */}
            <div className={`bg-white rounded-2xl border border-[#e2e8f0] shadow-sm transition-all duration-300 ${isLoginInfoOpen ? 'p-5' : 'p-3'}`}>
              <button 
                type="button"
                className="w-full flex items-center justify-between group px-2"
                onClick={() => setIsLoginInfoOpen(!isLoginInfoOpen)}
              >
                <h4 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider flex items-center gap-2 transition-colors group-hover:text-[#64748b]">
                  <span className="material-symbols-outlined text-[18px] text-[#cbd5e1] group-hover:text-[#94a3b8] transition-colors">lock</span> 
                  Login Credentials
                </h4>
                <span className={`material-symbols-outlined text-[#cbd5e1] group-hover:text-[#94a3b8] transition-transform duration-300 ${isLoginInfoOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              
              <div className={`grid transition-all duration-300 ease-in-out ${isLoginInfoOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="flex flex-col gap-4 pt-4">
                    <FormInputRegistration 
                      label="Username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Username"
                      error={errors.username} 
                      className="form-input-modal" 
                    />

                    <div className="flex flex-col gap-1">
                      <label className="text-[13px] font-semibold text-[#64748b] tracking-wide">
                        Password <span className="text-slate-400 font-normal text-[11px] ml-1">(Leave blank to keep current)</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className={`form-input-modal w-full pr-10 ${errors.password ? 'border-red-500 bg-red-50' : ''}`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer p-1 transition-colors"
                          tabIndex="-1"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showPassword ? "visibility" : "visibility_off"}
                          </span>
                        </button>
                      </div>
                      {errors.password && <span className="text-red-500 text-[11px]">{errors.password}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* --- PERFECTLY BALANCED EDGE-TO-EDGE BUTTONS --- */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex gap-4 w-full">
              <button 
                type="button" 
                className="flex-1 bg-white border-2 border-[#2ecc71] text-[#2ecc71] hover:bg-[#f0fdf4] font-bold py-2.5 rounded-xl transition-all active:scale-95 text-[14px] flex justify-center items-center" 
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-[14px] flex justify-center items-center" 
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>

          </div>
        </form>
      </div>
    </>,
    document.body
  );
}