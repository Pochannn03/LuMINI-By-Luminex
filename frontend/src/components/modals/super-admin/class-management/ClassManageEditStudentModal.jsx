import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import FormInputRegistration from '../../../FormInputRegistration';
import { validateStudentRegistrationStep } from '../../../../utils/class-manage-modal/studentModalValidation';
import AvatarEditor from "react-avatar-editor"; 

// --- ADDED HELPER ---
const BACKEND_URL = "http://localhost:3000";

const getImageUrl = (path, firstName) => {
  if (!path) return `https://api.dicebear.com/7.x/initials/svg?seed=${firstName || 'User'}`; 
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
};
// --------------------

export default function ClassManageEditStudentModal({ isOpen, onClose, studentData, onSuccess }) {
  // HOOKS (useState & useEffect)
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    firstName: '', 
    lastName: '',
    birthdate: '', 
    age: '',
    gender: '',
    allergies: 'None',
    medical_history: 'None',
    studentId: '', 
    invitationCode: '', 
    // --- NEW: PASSIVE PARENT FIELDS ---
    parentName: '',
    parentPhone: '',
    parentEmail: ''
  });

  // --- CROPPER STATES ---
  const editorRef = useRef(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (isOpen && studentData) {
      const std = studentData;
      
      const formattedBday = std.birthday 
        ? new Date(std.birthday).toISOString().split('T')[0] 
        : "";

      setFormData({
        firstName: std.first_name || '',
        lastName: std.last_name || '',
        birthdate: formattedBday,
        gender: std.gender || '',
        age: std.age || calculateAge(formattedBday),
        allergies: std.allergies || 'None',
        medical_history: std.medical_history || 'None',
        studentId: std.student_id || 'No ID Assigned',
        invitationCode: std.invitation_code || '',
        parentName: std.passive_parent?.name || '',
        parentPhone: std.passive_parent?.phone || '',
        parentEmail: std.passive_parent?.email || ''
      });

      setPreviewUrl(getImageUrl(std.profile_picture, std.first_name));
      setProfileImage(null);
      setErrors({});
      setShowCropModal(false);
      setTempImage(null);
    }
  }, [isOpen, studentData]);

  // HELPERS FOR CALCULATION OF AGE
  const calculateAge = (dob) => {
    if (!dob) return "";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  };

  // HANDLERS
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'birthdate') {
        newData.age = calculateAge(value);
      }
      return newData;
    });

    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

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
          const croppedFile = new File([blob], "student_photo.jpg", { type: "image/jpeg" });
          setProfileImage(croppedFile); 
          setPreviewUrl(URL.createObjectURL(croppedFile)); 
          setShowCropModal(false);
          setTempImage(null);
        }
      }, "image/jpeg", 0.95);
    }
  };

  const handleSubmit = async () => {
    const newErrors = validateStudentRegistrationStep(formData, profileImage);

    if (!profileImage) {
      delete newErrors.profileImage; 
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      
      data.append('first_name', formData.firstName);
      data.append('last_name', formData.lastName);
      data.append('birthday', formData.birthdate);
      data.append('age', formData.age);
      data.append('gender', formData.gender);
      data.append('allergies', formData.allergies);
      data.append('medical_history', formData.medical_history);
      data.append('passive_parent_name', formData.parentName);
      data.append('passive_parent_phone', formData.parentPhone);
      data.append('passive_parent_email', formData.parentEmail);

      if (profileImage) {
        data.append('profile_photo', profileImage);
      }

      const response = await axios.put(`http://localhost:3000/api/students/${studentData._id}`, data, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (response.data.success) {
        onSuccess(response.data.msg); 
      }
      onClose();

    } catch (error) {
      console.error("Update failed:", error);
      const msg = error.response?.data?.msg || "Failed to update student";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  if(!isOpen) return null;
  return createPortal(
    <>
      {/* --- CROPPER SUB-MODAL --- */}
      {showCropModal && (
        <div className="modal-overlay active" style={{ zIndex: 999999 }}>
          <div className="modal-container" style={{ padding: '24px', alignItems: 'center', maxWidth: '350px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', color: '#1e293b', fontWeight: 'bold' }}>
              Crop Student Photo
            </h3>
            
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
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b' }}>zoom_out</span>
              <input 
                type="range" 
                min="1" max="3" step="0.01" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#39a8ed', cursor: 'pointer' }}
              />
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b' }}>zoom_in</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                type="button"
                className="btn-cancel" 
                style={{ flex: 1 }} 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCropModal(false);
                  setTempImage(null);
                }}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn-save" 
                style={{ flex: 1 }} 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCropSave();
                }}
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN EDIT MODAL --- */}
      <div className="modal-overlay active" id="editStudentModal" onClick={onClose}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined header-icon blue-icon">edit_square</span>
              <h2 className="text-cdark text-[18px] font-bold">Edit Student Profile</h2>
            </div>
          </div>

          <div className="modal-body custom-scrollbar pr-2 overflow-y-auto max-h-[65vh]">
            <input type="hidden" id="editStudentDbId" />
            <div className="flex flex-col items-center gap-2">
              <img 
                className="w-[100px] h-[100px] rounded-full object-cover border-4 border-slate-50 shadow-[0_4px_12px_rgba(0,0,0,0.1)] mb-3" 
                id="editStudentPreview" 
                src={previewUrl}
                alt="Preview"
              />
              <label htmlFor="editStudentPhotoInput" className="text-cprimary-blue cursor-pointer block text-[13px] font-semibold transition-colors duration-200 hover:text-[#2c8ac4]">Change Photo</label>
              <input 
                type="file" 
                id="editStudentPhotoInput" 
                accept="image/*" 
                hidden 
                onChange={handleImageChange}
              />
              {errors.profileImage && <span className="text-red-500 text-[11px]">{errors.profileImage}</span>}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="fullName" className="text-cgray text-[13px] font-medium">Full Name</label>
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
              <div className="flex flex-col gap-2">
                <label className="text-cgray text-[13px] font-medium">Gender</label>
                <div className="relative w-full">
                  <select 
                    name="gender" 
                    value={formData.gender}
                    onChange={handleChange} 
                    className={`form-input-modal w-full bg-white h-[42px] appearance-none pr-10 ${
                      errors.gender ? 'border-red-500! bg-red-50' : ''
                    }`}
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    expand_more
                  </span>
                </div>
                {errors.gender && (
                  <span className="text-red-500 text-[11px] ml-1">{errors.gender}</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="birthdateAge" className="text-cgray text-[13px] font-medium">Birthdate & Age</label>
              <div className="flex gap-2.5 w-full">
                <div className="flex flex-col flex-1">
                  <input 
                    type="date"
                    name="birthdate"
                    value={formData.birthdate}
                    onChange={handleChange}
                    className={`form-input-modal w-full ${errors.birthdate ? 'border-red-500 bg-red-50' : ''}`}
                  />
                  {errors.birthdate && <span className="text-red-500 text-[11px] ml-1 mt-1">{errors.birthdate}</span>}
                </div>
                <div className="flex-1">
                  <input 
                    type="text"
                    name="age"
                    value={formData.age}
                    readOnly
                    className="form-input-modal w-full bg-[#f1f5f9] text-center cursor-not-allowed focus:outline-none"
                    placeholder="Age"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
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

            {/* --- NEW: PARENT DETAILS SECTION --- */}
            <div className="flex items-center gap-2 mt-4 pb-2 border-b border-[#f0f0f0]">
              <span className="material-symbols-outlined orange-icon">family_restroom</span>
              <h3 className="text-cdark text-[16px] font-bold">Parent / Guardian Details</h3>
            </div>
            <p className="text-slate-400 text-[12px] mb-2 leading-tight">Edit the parent details for the temporary unverified profile link.</p>
            
            <div className="flex flex-col gap-3">
              <FormInputRegistration 
                label="Parent's Full Name"
                name="parentName" 
                value={formData.parentName}
                onChange={handleChange} 
                placeholder="e.g. Maria Clara" 
                className="form-input-modal"
              />
              <div className="flex gap-2.5">
                <FormInputRegistration 
                  label="Contact Number"
                  name="parentPhone" 
                  value={formData.parentPhone}
                  onChange={handleChange} 
                  placeholder="e.g. 09123456789" 
                  className="form-input-modal flex-1"
                />
                <FormInputRegistration 
                  label="Email Address"
                  name="parentEmail" 
                  value={formData.parentEmail}
                  onChange={handleChange} 
                  placeholder="e.g. maria@email.com" 
                  className="form-input-modal flex-1"
                />
              </div>
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