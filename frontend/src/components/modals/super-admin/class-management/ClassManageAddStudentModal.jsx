import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-student-modal.css'

export default function ClassManageAddStudentModal({ isOpen, onClose }) {
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthdate: '',
    age: '',
    studentId: 'Generating...', 
    invitationCode: '',
  })

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        firstName: '',
        lastName: '',
        birthdate: '',
        age: '',
        studentId: 'Generating...', 
        invitationCode: '',
      });
      setProfileImage(null);
      setPreviewUrl(null);
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const fetchNextId = async () => {
        try {
          setFormData(prev => ({ ...prev, studentId: "Loading..." }));
          
          const response = await axios.get('http://localhost:3000/api/students', {
            withCredentials: true
          });

          setFormData(prev => ({ ...prev, studentId: response.data.student_id }));
        } catch (err) {
          console.error("Failed to fetch ID preview", err);
          setFormData(prev => ({ ...prev, studentId: "Error" }));
        }
      };

      fetchNextId();
    } else {
      setFormData(prev => ({ ...prev, studentId: "Generating..." }));
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.birthdate) {
      const birthDate = new Date(formData.birthdate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setFormData((prev) => ({ ...prev, age: age >= 0 ? age : 0 }));
    }
  }, [formData.birthdate]);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
    let result = '';

    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    setFormData((prev) => ({ ...prev, invitationCode: result }));
  };

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
    if (!formData.firstName || !formData.lastName || !formData.birthdate || !formData.invitationCode) {
      alert("Please fill in all required fields and generate a code.");
      return;
    }

    setLoading(true);
      const data = new FormData();
      
      data.append('first_name', formData.firstName);
      data.append('last_name', formData.lastName);
      data.append('birthday', formData.birthdate);
      data.append('age', formData.age);
      data.append('invitation_code', formData.invitationCode);

      if (profileImage) {
        data.append('profile_photo', profileImage);
      }

    try {
      const response = await axios.post('http://localhost:3000/api/students', data, {
        withCredentials: true
      });

      alert("Student created successfully!");
      onClose();

      const resData = response.data;
      console.log("Success:", resData);

    } catch (error) {
      // 5. Check the Console for the REAL error
      console.error("Crash Details:", error);
      
      if (error.response) {
        // Server responded with 4xx or 5xx
        const errorMsg = error.response.data.msg || error.response.data.error || "Failed to create student";
        
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
      <div className="modal-overlay active" id="addStudentModal">
        <form onSubmit={handleSubmit}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined blue-icon text-[24px]">person_add</span>
                <h2 className="text-cdark text-[24px] font-bold">Register New Student</h2>
              </div>
            </div>

            <div className="modal-body">
              <div className="flex flex-col gap-2">
                <label className="text-cgray text-[13px] font-medium">Student Photo</label>
                <input 
                  type="file" 
                  id="addStudentPhoto" 
                  accept="image/*" 
                  hidden 
                  onChange={handleImageChange} // Connected handler
                />
                <div className="custom-file-upload cursor-pointer" onClick={() => document.getElementById('addStudentPhoto').click()}>
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
                <label className="text-cgray text-[13px] font-medium">Full Name</label>
                  <div className="flex gap-2.5">
                    <input 
                      type="text" 
                      name="firstName" 
                      onChange={handleChange} 
                      placeholder="First Name" 
                      className="form-input-modal"
                    />
                    <input 
                      type="text" 
                      name="lastName" 
                      onChange={handleChange} 
                      placeholder="Last Name" 
                      className="form-input-modal"
                    />
                  </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-cgray text-[13px] font-medium">Birthdate & Age</label>
                  <div className="flex gap-2.5">
                    <input 
                      type="date"
                      name="birthdate"
                      onChange={handleChange} 
                      className="form-input-modal flex flex-2" />
                    <input 
                      type="text"
                      name="age"
                      value={formData.age}
                      className="form-input-modal flex flex-1 text-center cursor-not-allowed! focus:outline-none" 
                      placeholder={formData.age}
                      readOnly />
                  </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-cgray text-[13px] font-medium">Student ID (Auto-generated)</label>
                  <input 
                    type="text" 
                    value={formData.studentId}
                    className="form-input-modal text-cgray cursor-not-allowed! focus:outline-none" 
                    readOnly 
                    placeholder="Generating..." />
              </div>

              <div className="flex items-center gap-2 mt-2 pb-2 border-b border-[#f0f0f0]">
                <span className="material-symbols-outlined orange-icon">vpn_key</span>
                <h3>Parent Access</h3>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-cgray text-[13px] font-medium mb-0">Invitation Code</label>
                    <button type="button" onClick={generateCode} className="text-cprimary-blue bg-none flex items-center border-none cursor-pointer gap-1 text-[12px] font-semibold"
                    >
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                      Generate New
                    </button>
                </div>
                <input 
                  type="text" 
                  name="invitationCode"
                  value={formData.invitationCode} 
                  className="form-input-modal bg-[#f1f5f9] text-cdark tracking-[3px] font-bold text-center text-base cursor-not-allowed! focus:outline-none" readOnly />
                <p className="text-[11px]! text-slate-400 mt-1">
                  Share this code with the parent to link accounts.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" id="closeAddStudentBtn" onClick={onClose}>Cancel</button>
              <button className="btn-save" onClick={handleSubmit} disabled={loading}>
                {loading ? "Saving..." : "Register Student"}
              </button>
            </div>
        </div>
        </form>
      </div>
    </>,
    document.body
  );
}