import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { validateRegistrationStep } from '../../../../utils/modal-validation/teacherModalValidation';
import axios from 'axios';
import FormInputRegistration from '../../../FormInputRegistration';

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
        realationship: teacherData.relationship || 'Teacher',
        houseUnit: addrParts[0] || '',
        street: addrParts[1] || '',
        barangay: addrParts[2] || '',
        city: addrParts[3] || '',
        zipCode: addrParts[4] || '',
      });
      setPreviewUrl(teacherData.profile_picture || null);
      setProfileImage(null);
      setErrors({}); // Clear old errors
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file); // Store file to send to backend
      setPreviewUrl(URL.createObjectURL(file)); // Create local URL for preview
      
      // Clear image error if it exists
      if (errors.profileImage) {
        setErrors(prev => ({ ...prev, profileImage: null }));
      }
    }
  };

  // 3. Submit Changes
  const handleSubmit = async () => {
    
    // RUN VALIDATION
    const newErrors = validateRegistrationStep(formData);

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

      await axios.put(`http://localhost:3000/api/teacher/${teacherData._id}`, data, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });

      alert("Teacher profile updated successfully!");
      if (onSuccess) onSuccess(); 
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
      {/* No Logic Yet soon to be implemented */}
      <div className="modal-overlay active" id="editStudentModal">
        <div className="modal-container">
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span class="material-symbols-outlined orange-icon text-[24px]">manage_accounts</span>
              <h2 className="text-cdark text-[18px] font-bold">Edit Teacher Profile</h2>
            </div>
          </div>

          <div className="modal-body">
            <div className="flex flex-col gap-2">
                <label className="text-cgray text-[13px] font-medium">Profile Photo</label>
                <input 
                  type="file" 
                  id="addTeacherPhoto" 
                  accept="image/*"
                  hidden
                  onChange={handleImageChange} 
                />
              
                <div className={`custom-file-upload cursor-pointer ${errors.profileImage ? 'border-red-500! bg-red-50' : ''}`} onClick={() => document.getElementById('addTeacherPhoto').click()} >
                  {!previewUrl ? (
                      <div className="text-cdark mt-2 mb-1 font-medium text-center" id="stuUploadInitial">
                        <span className="material-symbols-outlined blue-icon text-[32px]">face</span>
                        <p className="text-cdark! font-medium! mt-2 mx-0 mb-1">Click to upload photo</p>
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
                  <span className="text-red-500 text-[11px] ml-1 mt-1 block text-left">
                    {errors.profileImage}
                  </span>
                )}
              </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="editTeacherFirst" className="text-cgray text-[13px] font-medium">Contact Details</label>
              <div className="flex gap-2.5">
                <FormInputRegistration 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First Name" 
                  error={errors.firstName} // Pass Error
                  className="form-input-modal"
                />
                <FormInputRegistration 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last Name" 
                  error={errors.lastName} // Pass Error
                  className="form-input-modal" 
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="editTeacherFirst" className="text-cgray text-[13px] font-medium">Full Name</label>
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

            <div className="flex items-center gap-2 mt-2 pb-2 border-b border-[#f0f0f0]">
              <span className="material-symbols-outlined orange-icon">lock</span>
              <h3 className="text-cdark text-[16px] font-semibold">Login Credentials</h3>
            </div>

            <div className="flex flex-col gap-2">
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

          <div class="modal-footer">
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