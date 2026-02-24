import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { validateRegistrationStep } from '../../../../utils/class-manage-modal/teacherModalValidation';
import axios from 'axios';
import FormInputRegistration from '../../../FormInputRegistration';
import AvatarEditor from "react-avatar-editor"; // <-- ADDED CROPPER IMPORT

// --- ADDED HELPER ---
const BACKEND_URL = "http://localhost:3000";

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
        // Split by comma (handling potential spaces)
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
      
      // Use the robust helper function!
      setPreviewUrl(getImageUrl(teacherData.profile_picture, teacherData.first_name));
      
      setProfileImage(null);
      setTempImage(null);
      setShowCropModal(false);
      setErrors({}); 
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

  // --- CROPPER LOGIC ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setTempImage(imageUrl);
      setShowCropModal(true); // Open cropper instead of saving immediately
      setZoom(1);
    }
    e.target.value = null; // reset input
    if (errors.profileImage) setErrors(prev => ({ ...prev, profileImage: null }));
  };

  const handleCropSave = () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], "teacher_photo.jpg", { type: "image/jpeg" });
          setProfileImage(croppedFile); // This is what gets sent to backend
          setPreviewUrl(URL.createObjectURL(croppedFile)); // Update the UI preview
          setShowCropModal(false);
          setTempImage(null);
        }
      }, "image/jpeg", 0.95);
    }
  };

  // 3. Submit Changes
  const handleSubmit = async () => {
    const newErrors = validateRegistrationStep(formData, profileImage); // Added profileImage!

    if (!formData.password) {
      delete newErrors.password;
    }
    if (!profileImage) {
      delete newErrors.profileImage;
    }

    setErrors(newErrors);

    // If there are errors, stop here
    if (Object.keys(newErrors).length > 0) {
      console.log("Validation blocked submission. Errors:", newErrors);
      return;
    }
  // ... rest of the code stays the same

    setLoading(true);

    try {
      const data = new FormData();
      const fullAddress = `${formData.houseUnit}, ${formData.street}, ${formData.barangay}, ${formData.city}, ${formData.zipCode}`;
      
      data.append('first_name', formData.firstName);
      data.append('last_name', formData.lastName);
      data.append('email', formData.email);
      data.append('phone_number', formData.phoneNumber);
      data.append('username', formData.username);
      data.append('address', fullAddress);
      data.append('relationship', formData.relationship || 'Teacher');

      if (formData.password) {
        data.append('password', formData.password);
      }

      if (profileImage) {
        data.append('profile_photo', profileImage);
      }

      const response = await axios.put(`${BACKEND_URL}/api/teacher/${teacherData._id}`, data, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (response.data.success) {
        onSuccess(response.data.msg); 
      }
      onClose();

    } catch (error) {
      console.error("Update failed:", error);
      const msg = error.response?.data?.msg || "Failed to update teacher";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* --- CROPPER SUB-MODAL --- */}
      {showCropModal && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-[360px] flex flex-col items-center animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Crop Photo</h3>
            
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-inner">
              <AvatarEditor
                ref={editorRef}
                image={tempImage}
                width={200}
                height={200}
                border={20}
                borderRadius={100} 
                color={[15, 23, 42, 0.5]}
                scale={zoom}
                rotate={0}
              />
            </div>

            <div className="flex items-center w-full gap-3 mt-5 mb-6 px-2">
              <span className="material-symbols-outlined text-slate-400 text-[18px]">zoom_out</span>
              <input 
                type="range" 
                min="1" max="3" step="0.01" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-orange-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <span className="material-symbols-outlined text-slate-400 text-[18px]">zoom_in</span>
            </div>

            <div className="flex gap-3 w-full">
              <button type="button" className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors" onClick={() => { setShowCropModal(false); setTempImage(null); }}>
                Cancel
              </button>
              <button type="button" className="flex-1 py-2.5 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-md transition-colors" onClick={handleCropSave}>
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN EDIT MODAL --- */}
      <div className="modal-overlay active" id="editTeacherModal" onClick={onClose}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined orange-icon text-[24px]">manage_accounts</span>
              <h2 className="text-cdark text-[18px] font-bold">Edit Teacher Profile</h2>
            </div>
          </div>

          <div className="modal-body custom-scrollbar pr-2 overflow-y-auto max-h-[65vh]">
            
            {/* 1. SLEEK PROFILE PICTURE UPLOAD */}
            <div className="flex flex-col items-center justify-center mb-2 mt-2">
              <input type="file" id="editTeacherPhoto" accept="image/*" hidden onChange={handleImageChange} />
              <div 
                className="relative group cursor-pointer"
                onClick={() => document.getElementById('editTeacherPhoto').click()}
              >
                <div className={`w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-xl ${errors.profileImage ? 'ring-2 ring-red-500' : ''}`}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[40px] text-slate-300 group-hover:scale-110 transition-transform duration-300">add_a_photo</span>
                  )}
                </div>
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="material-symbols-outlined text-white text-[24px]">edit</span>
                </div>
              </div>
              <p className="text-slate-500 text-[12px] font-medium mt-3">Click to change photo</p>
              {errors.profileImage && <span className="text-red-500 text-[11px] font-bold mt-1">{errors.profileImage}</span>}
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <label htmlFor="editTeacherFirst" className="text-cgray text-[13px] font-medium">Contact Details</label>
              <div className="flex gap-2.5">
                <FormInputRegistration 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First Name" 
                  error={errors.firstName} 
                  className="form-input-modal w-full"
                />
                <FormInputRegistration 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last Name" 
                  error={errors.lastName} 
                  className="form-input-modal w-full" 
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-1">
                <FormInputRegistration 
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email Address" 
                  error={errors.email}
                  className="form-input-modal"
                />
                <FormInputRegistration 
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="Phone Number" 
                  error={errors.phoneNumber}
                  className="form-input-modal mt-1" 
                />
            </div>

            <div className="flex items-center gap-2 mt-4 pb-2 border-b border-[#f0f0f0]">
              <span className="material-symbols-outlined orange-icon">lock</span>
              <h3 className="text-cdark text-[16px] font-semibold">Login Credentials</h3>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="text-cgray text-[13px] font-medium">Username</label>
                <FormInputRegistration 
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Username"
                error={errors.username} 
                className="form-input-modal" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Password</label>
                <FormInputRegistration 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave blank to keep current password"
                error={errors.password}
                className="form-input-modal" 
              />
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
            <button className="btn-save" onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}