import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import FormInputRegistration from '../../../FormInputRegistration';
import { validateStudentRegistrationStep } from '../../../../utils/class-manage-modal/studentModalValidation';
import AvatarEditor from "react-avatar-editor"; 
import WarningModal from '../../../WarningModal'; // <-- ADDED FOR BETTER ERROR FEEDBACK

const BACKEND_URL = "http://localhost:3000";

const getImageUrl = (path, firstName) => {
  if (!path) return `https://api.dicebear.com/7.x/initials/svg?seed=${firstName || 'User'}`; 
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
};

export default function ClassManageEditStudentModal({ isOpen, onClose, studentData, onSuccess }) {
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // --- WARNING MODAL STATE ---
  const [warningConfig, setWarningConfig] = useState({
    isOpen: false,
    title: "",
    message: ""
  });

  // --- ACCORDION STATES ---
  const [isPersonalInfoOpen, setIsPersonalInfoOpen] = useState(true);
  const [isMedicalInfoOpen, setIsMedicalInfoOpen] = useState(false);
  const [isParentInfoOpen, setIsParentInfoOpen] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '', 
    lastName: '',
    birthdate: '', 
    age: '',
    gender: '',
    allergies: 'None',
    medical_history: 'None',
    studentId: '', 
    parentName: '',
    parentPhone: '',
    parentEmail: ''
  });

  const editorRef = useRef(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (isOpen && studentData) {
      const std = studentData;
      const formattedBday = std.birthday ? new Date(std.birthday).toISOString().split('T')[0] : "";

      setFormData({
        firstName: std.first_name || '',
        lastName: std.last_name || '',
        birthdate: formattedBday,
        gender: std.gender || '',
        age: std.age || calculateAge(formattedBday),
        allergies: std.allergies || 'None',
        medical_history: std.medical_history || 'None',
        studentId: std.student_id || '', 
        parentName: std.passive_parent?.name || '',
        parentPhone: std.passive_parent?.phone || '',
        parentEmail: std.passive_parent?.email || ''
      });

      setPreviewUrl(getImageUrl(std.profile_picture, std.first_name));
      setProfileImage(null);
      setErrors({});
      setShowCropModal(false);
      
      setIsPersonalInfoOpen(true);
      setIsMedicalInfoOpen(false);
      setIsParentInfoOpen(false);
    }
  }, [isOpen, studentData]);

  const calculateAge = (dob) => {
    if (!dob) return "";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? age : 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'birthdate') newData.age = calculateAge(value);
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
        }
      }, "image/jpeg", 0.95);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateStudentRegistrationStep(formData, profileImage);
    
    // Scrub errors for fields we skip in Edit
    if (!profileImage) delete newErrors.profileImage; 
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.firstName || newErrors.lastName || newErrors.gender || newErrors.birthdate) setIsPersonalInfoOpen(true);
      if (newErrors.allergies || newErrors.medical_history) setIsMedicalInfoOpen(true);
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      // --- BUG FIX: Map fields correctly and include student_id ---
      data.append('student_id', formData.studentId); // Crucial for backend validation
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

      const response = await axios.put(`${BACKEND_URL}/api/students/${studentData._id}`, data, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (response.data.success) {
        onSuccess(response.data.msg); 
        onClose();
      }
    } catch (error) {
      console.error("Update failed:", error);
      
      // --- BUG FIX: Extract specific error from backend response ---
      let errorMsg = "Failed to update student profile.";
      if (error.response) {
        errorMsg = error.response.data?.errors?.[0]?.msg || error.response.data?.msg || errorMsg;
      }

      setWarningConfig({
        isOpen: true,
        title: "Update Failed",
        message: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  if(!isOpen) return null;

  return createPortal(
    <>
      {/* --- WARNING MODAL INSTANCE --- */}
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
            <h3 style={{ marginBottom: '16px', fontSize: '18px', color: '#1e293b', fontWeight: 'bold' }}>Crop Student Photo</h3>
            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
              <AvatarEditor ref={editorRef} image={tempImage} width={220} height={220} border={20} borderRadius={110} color={[15, 23, 42, 0.6]} scale={zoom} rotate={0} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px', margin: '20px 0' }}>
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} style={{ flex: 1, accentColor: '#39a8ed', cursor: 'pointer' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button type="button" className="btn-cancel flex-1" onClick={() => setShowCropModal(false)}>Cancel</button>
              <button type="button" className="btn-save flex-1" onClick={handleCropSave}>Apply Crop</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN EDIT MODAL --- */}
      <div className="modal-overlay active flex justify-center items-center p-4 z-[9990]" id="editStudentModal" onClick={onClose}>
        <form 
          className="bg-white rounded-3xl w-full max-w-[480px] relative overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[95vh]" 
          onClick={(e) => e.stopPropagation()} 
          onSubmit={handleSubmit}
        >
          <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar pr-4">
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }`}</style>

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563eb] text-[24px]">manage_accounts</span>
                <h2 className="text-[20px] font-extrabold text-[#1e293b]">Edit Student Profile</h2>
              </div>
              <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-slate-500 transition-colors shrink-0">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* 1. PROFILE PICTURE SECTION */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative w-[100px] h-[100px] rounded-full shadow-md group cursor-pointer border-4 border-white hover:border-blue-100 transition-colors" onClick={() => document.getElementById('editStudentPhotoInput').click()}>
                <img src={previewUrl} alt="Preview" className="w-full h-full rounded-full object-cover bg-slate-100" />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-white text-[28px]">edit</span>
                </div>
                <input type="file" id="editStudentPhotoInput" accept="image/*" hidden onChange={handleImageChange} />
              </div>
              <p className="text-[12px] mt-3 font-medium text-[#64748b]">Click to change photo</p>
              {errors.profileImage && <span className="text-red-500 text-[11px] mt-1 font-bold">{errors.profileImage}</span>}
            </div>

            {/* 2. PERSONAL INFORMATION ACCORDION */}
            <div className={`bg-white rounded-2xl border border-[#e2e8f0] mb-5 transition-all duration-300 ${isPersonalInfoOpen ? 'p-5 shadow-sm' : 'p-3'}`}>
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
                  <div className="flex flex-col gap-4 pt-4">
                    <div className="flex gap-3">
                      <FormInputRegistration label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First Name" error={errors.firstName} className="form-input-modal w-full" />
                      <FormInputRegistration label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last Name" error={errors.lastName} className="form-input-modal w-full" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[13px] font-semibold text-[#64748b] tracking-wide mb-1.5">Gender</label>
                      <div className="relative w-full">
                        <select name="gender" value={formData.gender} onChange={handleChange} className={`form-input-modal w-full appearance-none pr-10 ${errors.gender ? 'border-red-500 bg-red-50' : ''}`}>
                          <option value="" disabled>Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
                      </div>
                      {errors.gender && <span className="text-red-500 text-[11px] mt-1">{errors.gender}</span>}
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-[13px] font-semibold text-[#64748b] tracking-wide mb-1.5">Birthdate</label>
                        <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} className={`form-input-modal w-full ${errors.birthdate ? 'border-red-500 bg-red-50' : ''}`} />
                        {errors.birthdate && <span className="text-red-500 text-[11px] mt-1">{errors.birthdate}</span>}
                      </div>
                      <div className="w-1/3">
                        <FormInputRegistration label="Age" name="age" value={formData.age} readOnly className="form-input-modal w-full bg-[#f8fafc] text-center" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. HEALTH & MEDICAL ACCORDION */}
            <div className={`bg-white rounded-2xl border border-[#e2e8f0] mb-5 transition-all duration-300 ${isMedicalInfoOpen ? 'p-5 shadow-sm' : 'p-3'}`}>
              <button 
                type="button"
                className="w-full flex items-center justify-between group px-2"
                onClick={() => setIsMedicalInfoOpen(!isMedicalInfoOpen)}
              >
                <h4 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider flex items-center gap-2 transition-colors group-hover:text-[#64748b]">
                  <span className="material-symbols-outlined text-[18px] text-red-300 group-hover:text-red-400 transition-colors">medical_services</span> 
                  Health & Medical
                </h4>
                <span className={`material-symbols-outlined text-[#cbd5e1] group-hover:text-[#94a3b8] transition-transform duration-300 ${isMedicalInfoOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              
              <div className={`grid transition-all duration-300 ease-in-out ${isMedicalInfoOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="flex flex-col gap-4 pt-4">
                    <FormInputRegistration label="Allergies" name="allergies" value={formData.allergies} onChange={handleChange} placeholder="e.g. Peanuts" error={errors.allergies} className="form-input-modal" />
                    <div className="flex flex-col gap-1">
                      <label className="text-[13px] font-semibold text-[#64748b] tracking-wide mb-1.5">Medical History</label>
                      <textarea name="medical_history" value={formData.medical_history} onChange={handleChange} placeholder="List medical history..." rows={3} className="form-input-modal w-full resize-none leading-normal"></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. PARENT CONNECTION ACCORDION */}
            <div className={`bg-white rounded-2xl border border-[#e2e8f0] transition-all duration-300 ${isParentInfoOpen ? 'p-5 shadow-sm' : 'p-3'}`}>
              <button 
                type="button"
                className="w-full flex items-center justify-between group px-2"
                onClick={() => setIsParentInfoOpen(!isParentInfoOpen)}
              >
                <h4 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider flex items-center gap-2 transition-colors group-hover:text-[#64748b]">
                  <span className="material-symbols-outlined text-[18px] text-orange-300 group-hover:text-orange-400 transition-colors">family_restroom</span> 
                  Parent Connection
                </h4>
                <span className={`material-symbols-outlined text-[#cbd5e1] group-hover:text-[#94a3b8] transition-transform duration-300 ${isParentInfoOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              
              <div className={`grid transition-all duration-300 ease-in-out ${isParentInfoOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="flex flex-col gap-4 pt-4">
                    <FormInputRegistration label="Parent's Full Name" name="parentName" value={formData.parentName} onChange={handleChange} placeholder="e.g. Maria Clara" className="form-input-modal" />
                    <div className="flex gap-3">
                      <FormInputRegistration label="Phone Number" name="parentPhone" value={formData.parentPhone} onChange={handleChange} placeholder="09XXXXXXXXX" className="form-input-modal flex-1" />
                      <FormInputRegistration label="Email Address" name="parentEmail" value={formData.parentEmail} onChange={handleChange} placeholder="parent@email.com" className="form-input-modal flex-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* --- FOOTER BUTTONS --- */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex gap-4 w-full">
              <button type="button" className="flex-1 bg-white border-2 border-[#2ecc71] text-[#2ecc71] hover:bg-[#f0fdf4] font-bold py-2.5 rounded-xl transition-all active:scale-95 text-[14px] flex justify-center items-center" onClick={onClose}>Cancel</button>
              <button type="submit" className="flex-1 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-[14px] flex justify-center items-center" disabled={loading}>
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