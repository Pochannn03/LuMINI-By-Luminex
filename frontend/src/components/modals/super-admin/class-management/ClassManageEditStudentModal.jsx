import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import FormInputRegistration from '../../../FormInputRegistration';
import { validateStudentRegistrationStep } from '../../../../utils/class-manage-modal/studentModalValidation';

export default function ClassManageEditStudentModal({ isOpen, onClose, studentData, onSuccess }) {
  // HOOKS (useState & useEffect)
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    firstName: '', 
    lastName: '',
    birthdate: '', // Validator expects 'birthdate'
    age: '',
    studentId: '', 
    invitationCode: '', // Included to satisfy validator structure if needed
  });

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
        age: std.age || calculateAge(formattedBday),
        studentId: std.student_id || 'No ID Assigned',
        invitationCode: std.invitation_code || '',
      });

      setPreviewUrl(
        std.profile_picture || 
        `https://api.dicebear.com/7.x/initials/svg?seed=${std.first_name || 'User'}`
      );
      setProfileImage(null);
      setErrors({});
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
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      if (errors.profileImage) setErrors(prev => ({ ...prev, profileImage: null }));
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
      data.append('allergies', formData.allergies);
      data.append('medical_history', formData.medical_history);

      // Append Image ONLY if a new one was selected
      if (profileImage) {
        data.append('profile_photo', profileImage);
      }

      await axios.put(`http://localhost:3000/api/students/${studentData._id}`, data, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });

      alert("Student profile updated successfully!");
      if (onSuccess) onSuccess(); // Refresh parent list
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
      <div className="modal-overlay active" id="editStudentModal">
        <div className="modal-container">
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span class="material-symbols-outlined header-icon blue-icon">edit_square</span>
              <h2 className="text-cdark text-[18px] font-bold">Edit Student Profile</h2>
            </div>
          </div>

          <div className="modal-body">
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
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="birthdateAge" className="text-cgray text-[13px] font-medium">Birthdate & Age</label>
              <div className="flex gap-2.5 w-full">
                <div className="flex-2">
                  <input 
                    type="date"
                    name="birthdate"
                    value={formData.birthdate}
                    onChange={handleChange}
                    className={`form-input-modal w-full ${errors.birthdate ? 'border-red-500 bg-red-50' : ''}`}
                  />
                  {errors.birthdate && <span className="text-red-500 text-[11px] ml-1">{errors.birthdate}</span>}
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

            <div className="flex flex-col gap-2">
              <label htmlFor="editStudentID" className="text-cgray text-[13px] font-medium">Student ID (Locked)</label>
              <input 
                type="text" 
                value={formData.studentId} 
                readOnly
                className="form-input-modal w-full bg-[#f1f5f9] text-cgray focus:outline-none cursor-not-allowed!"
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