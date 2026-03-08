import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { validateAccountsEditModal } from '../../../../utils/manage-account-modal/accountModalValidation';
import FormInputRegistration from '../../../FormInputRegistration';
import axios from 'axios';
import '../../../../styles/super-admin/class-management.css'; 
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-teacher-modal.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function AccountsEditModal({ isOpen, onClose, account, onSuccess }) {
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  
  // Image States
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // --- CUSTOM DROPDOWN STATES ---
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const roleRef = useRef(null);
  const statusRef = useRef(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    role: '',
    is_active: true
  });

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (roleRef.current && !roleRef.current.contains(event.target)) setIsRoleOpen(false);
      if (statusRef.current && !statusRef.current.contains(event.target)) setIsStatusOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (account) {
      setFormData({
        username: account.username || '',
        password: '',
        first_name: account.first_name || '', 
        last_name: account.last_name || '',
        email: account.email || '',
        phone_number: account.phone_number || '',
        role: account.role || 'Student',
        is_active: !account.is_archive,
      });
      setProfileImage(null);
      setPreviewUrl(account.profile_picture ? `${BACKEND_URL}/${account.profile_picture}` : null); 
      setErrors({});
      setApiError("");
      setIsRoleOpen(false);
      setIsStatusOpen(false);
    }
  }, [account]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleDropdownSelect = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
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
    setApiError("");

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
      if (profileImage) data.append('profile_picture', profileImage);

      const response = await axios.put(`${BACKEND_URL}/api/users/${account._id}`, data, {
        withCredentials: true
      });
      
      onSuccess(response.data.msg || "Account updated successfully!");
      onClose();
    } catch (error) {
      console.error("Update Error:", error);
      setApiError(error.response?.data?.msg || "Failed to update account. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'admin', label: 'Teacher' },
    { value: 'user', label: 'Parent' },
    { value: 'superadmin', label: 'Admin' },
  ];

  const getRoleLabel = (value) => roleOptions.find(r => r.value === value)?.label || 'Select Role';

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
                <h2 className="text-cdark text-[18px]! font-bold">Edit Account</h2>
              </div>
            </div>

            {/* BODY */}
            <div className="modal-body">

              {/* Profile Photo */}
              <div className="flex flex-col gap-2">
                <label className="text-cgray text-[13px] font-medium">Profile Photo</label>
                <input type="file" name="profile_photo" id="editAccountPhoto" accept="image/*" hidden onChange={handleImageChange} />
                <div
                  className={`custom-file-upload cursor-pointer ${errors.profile_image ? 'border-red-500! bg-red-50' : ''}`}
                  onClick={() => document.getElementById('editAccountPhoto').click()}
                >
                  {!previewUrl ? (
                    <div className="text-cdark mt-2 mb-1 font-medium text-center" id="stuUploadInitial">
                      <span className="material-symbols-outlined blue-icon text-[32px]">face</span>
                      <p className="text-cdark! font-medium! text-[13px]! mt-2 mx-0 mb-1">Click to upload photo</p>
                      <p className="text-cgray! text-[12px]!">PNG, JPG (Max 5MB)</p>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center p-[5px]" id="stuUploadSelected">
                      <div className="flex items-center gap-2.5">
                        <img src={previewUrl} alt="Preview" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                        <p className="text-cdark! font-medium! text-[13px]! max-w-[250px] truncate" id="stuFileName">
                          {profileImage?.name}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-base text-[#22c55e]">check_circle</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Row 1: Role & Status */}
              <div className="grid grid-cols-2 gap-4">

                {/* ROLE CUSTOM DROPDOWN */}
                <div className="flex flex-col gap-2">
                  <label className="text-cgray text-[13px] font-medium">Account Role</label>
                  <div className="relative" ref={roleRef}>
                    <button
                      type="button"
                      onClick={() => { setIsRoleOpen(!isRoleOpen); setIsStatusOpen(false); }}
                      className={`flex items-center justify-between w-full h-[42px] px-3 rounded-xl border bg-slate-50 text-[13px] font-medium transition-all focus:outline-none ${
                        isRoleOpen
                          ? 'border-[var(--brand-blue)] ring-2 ring-blue-500/10 bg-white'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-slate-800">{getRoleLabel(formData.role)}</span>
                      <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform duration-300 ${isRoleOpen ? 'rotate-180 text-[var(--brand-blue)]' : ''}`}>
                        expand_more
                      </span>
                    </button>

                    {isRoleOpen && (
                      <div className="absolute top-[46px] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-1 flex flex-col gap-0.5 animate-[fadeIn_0.2s_ease-out]">
                        {roleOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-[var(--brand-blue)] transition-colors"
                            onClick={() => { handleDropdownSelect('role', opt.value); setIsRoleOpen(false); }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* STATUS CUSTOM DROPDOWN */}
                <div className="flex flex-col gap-2">
                  <label className="text-cgray text-[13px] font-medium">Status</label>
                  <div className="relative" ref={statusRef}>
                    <button
                      type="button"
                      onClick={() => { setIsStatusOpen(!isStatusOpen); setIsRoleOpen(false); }}
                      className={`flex items-center justify-between w-full h-[42px] px-3 rounded-xl border text-[13px] font-medium transition-all focus:outline-none ${
                        isStatusOpen
                          ? 'border-[var(--brand-blue)] ring-2 ring-blue-500/10 bg-white'
                          : formData.is_active
                          ? 'border-green-200 bg-green-50 hover:border-green-300'
                          : 'border-red-200 bg-red-50 hover:border-red-300'
                      }`}
                    >
                      <span className={formData.is_active ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {formData.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${
                        isStatusOpen ? 'rotate-180 text-[var(--brand-blue)]' : formData.is_active ? 'text-green-400' : 'text-red-400'
                      }`}>
                        expand_more
                      </span>
                    </button>

                    {isStatusOpen && (
                      <div className="absolute top-[46px] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-1 flex flex-col gap-0.5 animate-[fadeIn_0.2s_ease-out]">
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-semibold text-green-600 hover:bg-green-50 transition-colors"
                          onClick={() => { handleDropdownSelect('is_active', true); setIsStatusOpen(false); }}
                        >
                          Active
                        </button>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => { handleDropdownSelect('is_active', false); setIsStatusOpen(false); }}
                        >
                          Inactive
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <FormInputRegistration label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} error={errors.first_name} className="form-input-modal" />
                </div>
                <div className="flex flex-col gap-2">
                  <FormInputRegistration label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} error={errors.last_name} className="form-input-modal" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <FormInputRegistration label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} className="form-input-modal" />
              </div>

              <div className="flex flex-col gap-2">
                <FormInputRegistration label="Phone Number" name="phone_number" value={formData.phone_number} onChange={handleChange} error={errors.phone_number} className="form-input-modal" />
              </div>

              {/* Reset Credentials */}
              <div className="flex items-center gap-2 mt-2 pb-2 border-b border-[#f0f0f0]">
                <span className="material-symbols-outlined blue-icon">lock</span>
                <h3 className="text-cdark font-semibold text-[16px]!">Reset Credentials</h3>
              </div>

              <div className="flex flex-col gap-2">
                <FormInputRegistration label="Username" name="username" value={formData.username} onChange={handleChange} error={errors.username} className="form-input-modal" />
              </div>

              <div className="flex flex-col gap-2">
                <FormInputRegistration label="New Password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Leave blank to keep current" error={errors.password} className="form-input-modal" />
              </div>

              {/* API Error */}
              {apiError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <p className="text-red-600! text-[13px]! m-0">{apiError}</p>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-save" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
            </div>

          </div>
        </form>
      </div>
    </>,
    document.body
  );
}