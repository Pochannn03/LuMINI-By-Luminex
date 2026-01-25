import React, { useState } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-teacher-modal.css';

export default function ClassManageAddTeacherModal({ isOpen, onClose }) {
  // HOOKS/STATES
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
    houseUnit: null,
    street: null,
    barangay: null,
    city: null,
    zipCode: null,
  })

  // HANDLERS
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 

    // Will have a Custom Validation soon
    if (!formData.firstName || !formData.lastName || !formData.username || !formData.password || !formData.email || !formData.phoneNumber) {
      alert("Please fill in all required fields and generate a code.");
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
      const response = await axios.post('http://localhost:3000/api/createTeacher', data, {
        withCredentials: true
      });

      alert("Teacher created successfully!");
      onClose();

      const resData = response.data;
      console.log("Success:", resData);

    } catch (error) {
      // 5. Check the Console for the REAL error
      console.error("Crash Details:", error);
      
      if (error.response) {
        // Server responded with 4xx or 5xx
        const errorMsg = error.response.data.msg || error.response.data.error || "Failed to create Teacher";
        
        if (error.response.data.errors) {
          alert(`Validation Error: ${error.response.data.errors[0].msg}`);
        } else {
          alert(`Error: ${errorMsg}`);
        }
      } else if (error.request) {
        // Server is down or Network blocked
        alert("Network Error. Is the backend running?");
      } else {
        // Code bug (like the variable name issue)
        alert(`Code Error: ${error.message}`); 
      }
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;
  return createPortal(
    <>
      {/* No Logic Yet */}
      <div className="modal-overlay active" id="addClassModal">
        <form onSubmit={handleSubmit}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined blue-icon text-[24px]"
                  >person_add</span
                >
                <h2 className="text-cdark text-[18px] font-bold">Add New Teacher</h2>
              </div>
            </div>

            <div className="modal-body">
              <div className="flex flex-col gap-2">
                <label htmlFor="addTeacherPhoto" className="text-cgray text-[13px] font-medium">Profile Photo</label>
                <input 
                  type="file" 
                  id="addTeacherPhoto" 
                  accept="image/*"
                  hidden
                  onChange={handleImageChange} 
                  />
              
                <div className="custom-file-upload cursor-pointer" onClick={() => document.getElementById('addTeacherPhoto').click()}>
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

              <div className="flex flex-col gap-2">
                <label htmlFor="" className="text-cgray text-[13px] font-medium">Full Name</label>
                <div className="flex gap-2.5">
                  <input 
                    type="text" 
                    name="firstName"
                    onChange={handleChange} 
                    placeholder="First Name" 
                    className="form-input-modal" />
                  <input 
                    type="text" 
                    name="lastName"
                    onChange={handleChange} 
                    placeholder="Last Name" 
                    className="form-input-modal" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="" className="text-cgray text-[13px] font-medium">Contact Info</label>
                <input 
                  type="email" 
                  name="email"
                  onChange={handleChange} 
                  className="form-input-modal" 
                  placeholder="Email"/>
                <input 
                  type="text" 
                  name="phoneNumber"
                  onChange={handleChange} 
                  className="form-input-modal mt-2" 
                  placeholder="Phone Number" />
              </div>

              <div className="flex items-center gap-2 mt-2 pb-2 border-b border-[#f0f0f0]">
                <span className="material-symbols-outlined blue-icon">lock</span>
                <h3 className="text-cdark font-semibold text-[16px]">Login Credentials</h3>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="" className="text-cgray text-[13px] font-medium">Username</label>
                <input 
                  type="text" 
                  name="username"
                  onChange={handleChange} 
                  className="form-input-modal" 
                  placeholder="e.g. Teacher_Moka"/>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="" className="text-cgray text-[13px] font-medium">Password</label>
                <input 
                  type="password" 
                  name="password"
                  onChange={handleChange}
                  className="form-input-modal"
                  placeholder="Initial Password"/>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={onClose}>Cancel</button>
              <button className="btn-save" onClick={handleSubmit} disabled={loading}>
                {loading ? "Saving..." : "Register Teacher"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}