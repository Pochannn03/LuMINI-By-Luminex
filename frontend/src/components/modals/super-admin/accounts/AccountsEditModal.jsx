import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { validateAccountsEditModal } from '../../../../utils/manage-account-modal/accountModalValidation';
import FormInputRegistration from '../../../FormInputRegistration';
import axios from 'axios';
import '../../../../styles/super-admin/class-management.css'; 
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-teacher-modal.css';

export default function AccountsEditModal({ isOpen, onClose, account, onSuccess }) {
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(""); // <-- NEW: API Error state
  
  // Image States
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '' ,
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    role: '',
    is_active: true
  });

  useEffect(() => {
    if (account) {
      setFormData({
        username: account.username || '',
        password: '' ,
        first_name: account.first_name || '', 
        last_name: account.last_name || '',
        email: account.email || '',
        phone_number: account.phone_number || '',
        role: account.role || 'Student',
        is_active: !account.is_archive,
      });

      setProfileImage(null);
      setPreviewUrl(account.profile_picture ? `http://localhost:3000/${account.profile_picture}` : null); 
      setErrors({});
      setApiError(""); // Clear errors on load
    }
  }, [account]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleStatusChange = (e) => {
    setFormData((prev) => ({ 
      ...prev, 
      is_active: e.target.value === 'true' 
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
    if (errors.profile_image) setErrors(prev => ({ ...prev, profile_image: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setApiError(""); // Clear old errors

    const validationErrors = validateAccountsEditModal(formData, profileImage);

    if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return; 
    }

    setLoading(true);
    try {
      const data = new FormData();

      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('email', formData.email);
      data.append('username', formData.username);
      data.append('role', formData.role);
      data.append('phone_number', formData.phone_number);
      
      data.append('is_archive', !formData.is_active); 

      if (formData.password && formData.password.trim() !== "") {
        data.append('password', formData.password);
      }

      if (profileImage) {
        data.append('profile_picture', profileImage);
      }

      const response = await axios.put(`http://localhost:3000/api/users/${account._id}`, data, {
        withCredentials: true
      });
      
      // Pass the success message up to trigger the SuccessModal
      onSuccess(response.data.msg || "Account updated successfully!");
      onClose();
    } catch (error) {
      console.error("Update Error:", error);
      setApiError(error.response?.data?.msg || "Failed to update account. Please check your connection."); // <-- Removed alert
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !account) return null;
  
  return createPortal(
    <>
      <div className="modal-overlay active">
        <form onSubmit={handleSubmit}>
          <div className="modal-container w-full" onClick={(e) => e.stopPropagation()}>
            
            {/* HEADER */}
            <div className="modal-header">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined blue-icon text-[24px]">edit_square</span>
                <h2 className="text-cdark text-[18px] font-bold">Edit Account</h2>
              </div>
            </div>

            {/* BODY */}
            <div className="modal-body">

              {/* Profile Photo Section */}
              <div className="flex flex-col gap-2">
                <label className="text-cgray text-[13px] font-medium">Profile Photo</label>
                <input 
                  type="file"
                  name="profile_photo"
                  id="editAccountPhoto" 
                  accept="image/*"
                  hidden
                  onChange={handleImageChange} 
                />
              
                <div 
                  className={`custom-file-upload cursor-pointer ${errors.profile_image ? 'border-red-500! bg-red-50' : ''}`} 
                  onClick={() => document.getElementById('editAccountPhoto').click()} 
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
              </div>
              
              {/* Row 1: Role & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-cgray text-[13px] font-medium">Account Role</label>
                  <div className="relative">
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="form-input-modal cursor-pointer outline-none appearance-none pr-10 w-full"
                    >
                      <option value="admin">Teacher</option>
                      <option value="user">Parent</option>
                      <option value="superadmin">Admin</option>
                    </select>
                    
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-cgray text-[13px] font-medium">Status</label>
                    <div className="relative">
                    <select
                      name="is_active"
                      value={formData.is_active.toString()}
                      onChange={handleStatusChange}
                      className={`form-input-modal cursor-pointer outline-none appearance-none pr-10 w-full
                        ${formData.is_active ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                    
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <FormInputRegistration 
                    label="First Name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    error={errors.first_name}
                    className="form-input-modal" 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <FormInputRegistration 
                    label="Last Name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    error={errors.last_name}
                    className="form-input-modal"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <FormInputRegistration 
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  className="form-input-modal"
                />
              </div>

              <div className="flex flex-col gap-2">
                <FormInputRegistration 
                  label="Phone Number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  error={errors.phone_number}
                  className="form-input-modal"
                />
              </div>

              {/* Row 4: Security / Reset Password */}
              
              <div className="flex items-center gap-2 mt-2 pb-2 border-b border-[#f0f0f0]">
                <span className="material-symbols-outlined blue-icon">lock</span>
                <h3 className="text-cdark font-semibold text-[16px]">Reset Credentials</h3>
              </div>

              <div className="flex flex-col gap-2">
                <FormInputRegistration 
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  error={errors.username}
                  className="form-input-modal"
                />
              </div>

              <div className="flex flex-col gap-2">
                <FormInputRegistration 
                  label="New Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current"
                  error={errors.password}
                  className="form-input-modal"
                />
              </div>

              {/* INLINE API ERROR DISPLAY */}
              {apiError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {apiError}
                </div>
              )}

            </div>

            {/* FOOTER */}
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-save" 
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