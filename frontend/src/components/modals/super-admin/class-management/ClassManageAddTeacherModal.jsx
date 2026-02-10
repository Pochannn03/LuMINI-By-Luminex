import React, { useState } from "react";
import { createPortal } from "react-dom";
import { validateRegistrationStep } from '../../../../utils/class-manage-modal/teacherModalValidation';
import FormInputRegistration from '../../../FormInputRegistration';
import axios from 'axios';
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-teacher-modal.css';

export default function ClassManageAddTeacherModal({ isOpen, onClose }) {
  // HOOKS/STATES
  const [errors, setErrors] = useState({});
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
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
  })

  // VALIDATION
  const validateStep = () => {
    const newErrors = validateRegistrationStep(formData, profileImage);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ONCLOSE ACTION
  const resetForm = () => {
    setFormData({
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
    setProfileImage(null);
    setPreviewUrl(null);
    setErrors({});
  };

  // HANDLERS
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
    if (errors.profileImage) setErrors(prev => ({ ...prev, profileImage: null }));
  };

  const handleCloseModal = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 

    if (!validateStep()) {
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
    data.append('address', `${formData.houseUnit}, ${formData.street}, ${formData.barangay}, ${formData.city}, ${formData.zipCode}`);

    if (profileImage) {
      data.append('profile_photo', profileImage);
    }

    try {
      const response = await axios.post('http://localhost:3000/api/teachers/modal', data, {
        withCredentials: true
      });

      alert("Teacher created successfully!");
      handleCloseModal();
      console.log("Success:", response.data);

    } catch (error) {
      console.error("Crash Details:", error);
      if (error.response) {
        const errorMsg = error.response.data.msg || error.response.data.error || "Failed to create Teacher";
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
      <div className="modal-overlay active" id="addClassModal" onClick={handleCloseModal}>
        {/* FIX: Form IS the container now */}
        <form 
          className="modal-container" 
          onClick={(e) => e.stopPropagation()} 
          onSubmit={handleSubmit}
        >
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined blue-icon text-[24px]">person_add</span>
              <h2 className="text-cdark text-[18px] font-bold">Add New Teacher</h2>
            </div>
          </div>

          <div className="modal-body">
            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Profile Photo<span className='text-cbrand-blue ml-1 text-[12px]'>*</span></label>
              <input 
                type="file" 
                id="addTeacherPhoto" 
                accept="image/*"
                hidden
                onChange={handleImageChange} 
              />
              
              <div 
                className={`custom-file-upload cursor-pointer ${errors.profileImage ? 'border-red-500! bg-red-50' : ''}`} 
                onClick={() => document.getElementById('addTeacherPhoto').click()} 
              >
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

            <div className="flex flex-col gap-2 mt-2">
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

            <div className="flex flex-col gap-2">
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
              <FormInputRegistration
                label="Phone Number"
                name="phoneNumber"
                type="text"
                value={formData.phoneNumber}
                onChange={handleChange}
                error={errors.phoneNumber}
                required={true}
                className="form-input-modal" 
                placeholder="09*********"
              />
            </div>

            <div className="flex items-center gap-2 mt-2 pb-2 border-b border-[#f0f0f0]">
              <span className="material-symbols-outlined blue-icon">lock</span>
              <h3 className="text-cdark font-semibold text-[16px]">Login Credentials</h3>
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
                placeholder="Username"
              />
            </div>

            <div className="flex flex-col gap-2">
              <FormInputRegistration
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                required={true}
                className="form-input-modal" 
                placeholder="Password"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-cancel" type="button" onClick={handleCloseModal}>Cancel</button>
            <button className="btn-save" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Register Teacher"}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}