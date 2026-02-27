import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { validateOverrideForm } from '../../../../utils/override-modal/overrideModalValidation';
import axios from 'axios';
import FormInputRegistration from '../../../FormInputRegistration';
import AvatarEditor from "react-avatar-editor";
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-class-modal.css';

export default function AdminEmergencyOverrideModal({ isOpen, onClose, onSuccess }) {
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState([]);
    const [authorizedGuardians, setAuthorizedGuardians] = useState([]);
    const [isRegistered, setIsRegistered] = useState(true);
    
    // --- PHOTO & CROPPER STATES ---
    const [profileImage, setProfileImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [tempImage, setTempImage] = useState(null);
    const [zoom, setZoom] = useState(1);
    const editorRef = useRef(null);

    const [formData, setFormData] = useState({
        studentId: '',
        guardianId: '',
        manualGuardianName: '',
        purpose: 'Drop off'
    });

    useEffect(() => {
        if (isOpen) {
            const fetchMyStudents = async () => {
              try {
                  const res = await axios.get('http://localhost:3000/api/teacher/students', 
                    { withCredentials: true });
                  
                  if (res.data.success) {
                      setStudents(res.data.students || []);
                  }
              } catch (err) {
                  console.error("Failed to fetch students", err);
              }
            };
            fetchMyStudents();
        } else {
            resetForm();
        }
    }, [isOpen]);

    useEffect(() => {
        if (formData.studentId && isRegistered) {
            const selectedStudent = students.find(s => s.student_id === formData.studentId);
            setAuthorizedGuardians(selectedStudent?.user_details || []);
        }
    }, [formData.studentId, isRegistered, students]);

    useEffect(() => {
        setErrors({});
    }, [isRegistered, isOpen]);

    const resetForm = () => {
      setFormData({ studentId: '', guardianId: '', manualGuardianName: '', purpose: 'Drop off' });
      setProfileImage(null);
      setPreviewUrl(null);
      setIsRegistered(true);
      setErrors({});
    };

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
                    const croppedFile = new File([blob], "guest_id.jpg", { type: "image/jpeg" });
                    setProfileImage(croppedFile);
                    setPreviewUrl(URL.createObjectURL(croppedFile));
                    setShowCropModal(false);
                    setTempImage(null);
                    setErrors(prev => ({ ...prev, profileImage: null }));
                }
            }, "image/jpeg", 0.95);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        const newErrors = validateOverrideForm(formData, isRegistered, profileImage);
        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            return; 
        }

        setLoading(true);

        const submitData = new FormData();
        submitData.append('studentId', formData.studentId);
        submitData.append('purpose', formData.purpose);
        submitData.append('isRegistered', isRegistered);

        if (isRegistered) {
            submitData.append('guardianId', formData.guardianId);
        } else {
            submitData.append('manualGuardianName', formData.manualGuardianName);
            if (profileImage) {
                submitData.append('idPhoto', profileImage);
            }
        }

        try {
            const res = await axios.post('http://localhost:3000/api/transfer/override', submitData, {
                withCredentials: true,
                timeout: 5000
            });
            onSuccess(res.data.msg || "Emergency transfer completed.");
            onClose();
        } catch (err) {
          console.error("Full Error Object:", err); // ALWAYS log this while developing
          
          const errorMessage = err.response?.data?.error 
                              || err.response?.data?.message 
                              || err.message 
                              || "An unexpected error occurred";
                              
          alert(errorMessage);
          
          if (err.response?.data?.errors) {
              setErrors(err.response.data.errors);
          }
      } finally {
        setLoading(false);
      }
    };

    if (!isOpen) return null;

    return createPortal(
        <>
            {/* --- CROPPER SUB-MODAL --- */}
            {showCropModal && (
                <div className="modal-overlay active z-999999!">
                    <div className="modal-container p-6 flex flex-col items-center max-w-[350px]">
                        <h3 className="mb-4 text-[18px] text-[#1e293b] font-bold">
                            Crop ID Verification
                        </h3>
                        <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                            <AvatarEditor
                                ref={editorRef}
                                image={tempImage}
                                width={220}
                                height={220}
                                border={20}
                                borderRadius={10}
                                scale={zoom}
                            />
                        </div>
                        <div className="flex items-center w-full gap-3 my-5">
                            <input 
                                type="range" 
                                min="1" max="3" step="0.01" 
                                value={zoom} 
                                onChange={(e) => setZoom(parseFloat(e.target.value))} 
                                className="flex-1 accent-[#39a8ed] cursor-pointer" 
                            />
                        </div>
                        <div className="flex gap-3 w-full">
                            <button type="button" className="btn-cancel flex-1" onClick={() => setShowCropModal(false)}>Cancel</button>
                            <button type="button" className="btn-save flex-1" onClick={handleCropSave}>Apply</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MAIN MODAL --- */}
            <div className="modal-overlay active">
                <div className="modal-container max-w-[450px]" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-red-600">e911_emergency</span>
                            <h2 className="text-cdark text-[18px] font-bold">Manual Process Override</h2>
                        </div>
                    </div>

                    <div className="modal-body custom-scrollbar pr-2 overflow-y-auto max-h-[65vh]">
                        <form id="emergencyOverrideForm" onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button 
                                    type="button" 
                                    className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all ${isRegistered ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`} 
                                    onClick={() => setIsRegistered(true)}
                                >
                                    Registered
                                </button>
                                <button 
                                    type="button" 
                                    className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all ${!isRegistered ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`} 
                                    onClick={() => setIsRegistered(false)}
                                >
                                    Guest
                                </button>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-cgray text-[13px] font-semibold mb-2">Activity Type</label>
                                <div className="flex gap-2">
                                    <button 
                                        type="button" 
                                        className={`flex-1 p-2 rounded-lg border text-[13px] font-semibold transition-all ${formData.purpose === 'Drop off' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-200 text-slate-500'}`} 
                                        onClick={() => setFormData(p => ({...p, purpose: 'Drop off'}))}
                                    >
                                        Drop Off
                                    </button>
                                    <button 
                                        type="button" 
                                        className={`flex-1 p-2 rounded-lg border text-[13px] font-semibold transition-all ${formData.purpose === 'Pick up' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-white border-slate-200 text-slate-500'}`} 
                                        onClick={() => setFormData(p => ({...p, purpose: 'Pick up'}))}
                                    >
                                        Pick Up
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col w-full">
                                <label className='text-cgray text-[13px] font-semibold mb-2'>Select Student</label>
                                <select 
                                    name="studentId" 
                                    value={formData.studentId} 
                                    onChange={handleChange} 
                                    className="form-input-modal" 
                                >
                                    <option value="" disabled>Select Student</option>
                                    {students.map(s => <option key={s.student_id} value={s.student_id}>{s.last_name}, {s.first_name}</option>)}
                                </select>
                                {errors.studentId && <span className="text-red-500 text-[11px] mt-1 ml-1">{errors.studentId}</span>}
                            </div>

                            {isRegistered ? (
                                <div className="flex flex-col w-full">
                                    <label className='text-cgray text-[13px] font-semibold mb-2'>Authorized Guardian</label>
                                    <select 
                                        name="guardianId" 
                                        value={formData.guardianId} 
                                        onChange={handleChange}
                                        className="form-input-modal" 
                                    >
                                        <option value="" disabled>Select Authorized Person</option>
                                        {authorizedGuardians.map(g => (
                                            <option key={g.user_id} value={g.user_id}>
                                                {g.first_name} {g.last_name} ({g.relationship})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.guardianId && <span className="text-red-500 text-[11px] mt-1 ml-1">{errors.guardianId}</span>}
                                </div>
                            ) : (
                                <>
                                    <FormInputRegistration 
                                        label="Guest Guardian Name" 
                                        name="manualGuardianName" 
                                        value={formData.manualGuardianName} 
                                        onChange={handleChange}
                                        placeholder="Enter full name" 
                                        error={errors.manualGuardianName}
                                        className="form-input-modal" 
                                        required 
                                    />
                                    
                                    <div className="flex flex-col w-full mb-1">
                                        <label className='text-cgray text-[13px] font-semibold mb-2'>
                                            Verify ID Document
                                            <span className='text-cbrand-blue ml-1 text-[12px]'>*</span>
                                        </label>
                                        <div className="flex flex-col items-center gap-2 mt-2">
                                            {previewUrl ? (
                                                <img className="w-[120px] h-[120px] rounded-xl object-cover border-4 border-slate-50 shadow-md mb-2" src={previewUrl} alt="ID Preview" />
                                            ) : (
                                                <div className="w-[120px] h-[120px] bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300 text-slate-400 mb-2">
                                                    <span className="material-symbols-outlined text-[40px]">add_a_photo</span>
                                                </div>
                                            )}
                                            <label 
                                                htmlFor="guestIdPhotoInput" 
                                                className="text-cprimary-blue cursor-pointer block text-[13px] font-semibold hover:underline"
                                            >
                                                {previewUrl ? 'Change ID Photo' : 'Upload ID Document'}
                                            </label>
                                            <input 
                                                type="file" 
                                                id="guestIdPhotoInput" 
                                                accept="image/*" 
                                                hidden 
                                                onChange={handleImageChange} 
                                            />
                                        </div>
                                        {errors.profileImage && <span className="text-red-500 text-[11px] mt-2 text-center">{errors.profileImage}</span>}
                                    </div>
                                </>
                            )}
                        </form>
                    </div>
                        
                    <div className="modal-footer">
                        <button className="btn-cancel" type="button" onClick={onClose}>Cancel</button>
                        <button 
                            className="btn-save" 
                            form="emergencyOverrideForm" 
                            type="submit" 
                            disabled={loading}
                        >
                            {loading ? "Saving..." : `Confirm ${formData.purpose}`}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}