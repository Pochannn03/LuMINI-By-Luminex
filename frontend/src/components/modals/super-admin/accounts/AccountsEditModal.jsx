import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import '../../../../styles/super-admin/class-management.css'; 
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-teacher-modal.css';

export default function AccountsEditModal({ isOpen, onClose, account, onSuccess }) {
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Image States
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    role: '',
    is_active: true,
    password: '' 
  });

  useEffect(() => {
    if (account) {
      setFormData({
        first_name: account.first_name || '', 
        last_name: account.last_name || '',
        email: account.email || '',
        username: account.username || '',
        role: account.role || 'Student',
        is_active: !account.is_archive,
        password: '' 
      });

      // Reset image states
      setProfileImage(null);
      setPreviewUrl(account.profile_picture ? `http://localhost:3000/${account.profile_picture}` : null); 
      setErrors({});
    }
  }, [account]);

  // WILL WORK ON THIS DUE TO EXISTING VALIDATION ON UTILS FOLDER
  const validateStep = () => {
    const newErrors = {};
    if (!formData.first_name) newErrors.first_name = "First name is required";
    if (!formData.last_name) newErrors.last_name = "Last name is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.username) newErrors.username = "Username is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null })); 
  };

  const handleStatusChange = (e) => {
    setFormData((prev) => ({ ...prev, is_active: e.target.value === true }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
    if (errors.profileImage) setErrors(prev => ({ ...prev, profileImage: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    if (!validateStep()) return;

    setLoading(true);
    try {
      // 1. Create a FormData object (Required for files)
      const data = new FormData();

      // 2. Append text fields
      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('email', formData.email);
      data.append('username', formData.username);
      data.append('role', formData.role);
      
      // 3. Handle the Logic fields
      // Note: FormData converts booleans to strings "true"/"false". 
      // Mongoose usually handles this, but be aware.
      data.append('is_archive', !formData.is_active); 

      // 4. Handle Password (only if set)
      if (formData.password && formData.password.trim() !== "") {
        data.append('password', formData.password);
      }

      // 5. CRITICAL: Append the File
      // The name 'profile_photo' MUST match your backend: upload.single('profile_photo')
      if (profileImage) {
        data.append('profile_photo', profileImage);
      }

      // 6. Send the FormData object
      // Axios automatically sets 'Content-Type: multipart/form-data'
      await axios.put(`http://localhost:3000/api/users/${account._id}`, data, {
        withCredentials: true
      });
      
      alert("Account updated successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Update Error:", error);
      alert("Failed to update account.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !account) return null;
  
  return createPortal(
    <>
      <div className="modal-overlay active" onClick={onClose}>
        <form onSubmit={handleSubmit}>
          {/* ✅ FIX: We keep !max-w-[700px] to override the 400px default in index.css */}
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
                  id="editAccountPhoto" 
                  accept="image/*"
                  hidden
                  onChange={handleImageChange} 
                />
              
                <div 
                  className={`custom-file-upload cursor-pointer ${errors.profileImage ? 'border-red-500! bg-red-50' : ''}`} 
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
                      // 2. Add 'appearance-none' to hide default arrow
                      // 3. Add 'pr-10' to make space for custom arrow
                      className="form-input-modal cursor-pointer outline-none appearance-none pr-10 w-full"
                    >
                      <option value="admin">Teacher</option>
                      <option value="user">Parent</option>
                      <option value="superadmin">Admin</option>
                    </select>
                    
                    {/* 4. CUSTOM ICON (Sibling, not child) */}
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
                      className={`form-input-modal cursor-pointer outline-none appearance-none pr-10 w-full font-semibold
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

              {/* Row 2: Full Name & Username */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-cgray text-[13px] font-medium">Full Name</label>
                  <input
                    name="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={handleChange}
                    className={`form-input-modal outline-none transition-colors
                      ${errors.full_name ? 'border-red-500! bg-red-50' : ''}`}
                  />
                  {errors.full_name && <span className="text-red-500 text-[11px]">{errors.full_name}</span>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-cgray text-[13px] font-medium">Username</label>
                  <input
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    className={`form-input-modal outline-none transition-colors
                      ${errors.username ? 'border-red-500! bg-red-50' : ''}`}
                  />
                  {errors.username && <span className="text-red-500 text-[11px]">{errors.username}</span>}
                </div>
              </div>

              {/* Row 3: Email */}
              <div className="flex flex-col gap-2">
                <label className="text-cgray text-[13px] font-medium">Email Address</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`form-input-modal outline-none transition-colors
                    ${errors.email ? 'border-red-500! bg-red-50' : ''}`}
                />
                {errors.email && <span className="text-red-500 text-[11px]">{errors.email}</span>}
              </div>

              {/* Row 4: Security / Reset Password */}
              <div className="flex items-center gap-2 mt-2 pb-2 border-b border-[#f0f0f0]">
                <span className="material-symbols-outlined blue-icon">lock</span>
                <h3 className="text-cdark font-semibold text-[16px]">Reset Password</h3>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-cgray text-[13px] font-medium">New Password</label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current"
                  className="form-input-modal outline-none placeholder:text-gray-400"
                />
              </div>

            </div>

            {/* FOOTER */}
            {/* ✅ Matches index.css exactly (.btn-cancel & .btn-save) */}
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