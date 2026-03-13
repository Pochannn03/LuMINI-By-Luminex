import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { validateOverrideForm } from '../../../../utils/override-modal/overrideModalValidation';
import WarningModal from "../../../WarningModal";
import axios from 'axios';
import AvatarEditor from "react-avatar-editor";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function AdminEmergencyOverrideModal({ isOpen, onClose, onSuccess }) {
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState([]);
    const [authorizedGuardians, setAuthorizedGuardians] = useState([]);
    const [isRegistered, setIsRegistered] = useState(true);

    // --- CUSTOM DROPDOWN STATES ---
    const [isStudentOpen, setIsStudentOpen] = useState(false);
    const [isGuardianOpen, setIsGuardianOpen] = useState(false);
    const [warningModal, setWarningModal] = useState({ isOpen: false, title: "", message: "" });
    const studentRef = useRef(null);
    const guardianRef = useRef(null);

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

    // Click outside listener for custom dropdowns
    useEffect(() => {
        function handleClickOutside(event) {
            if (studentRef.current && !studentRef.current.contains(event.target)) setIsStudentOpen(false);
            if (guardianRef.current && !guardianRef.current.contains(event.target)) setIsGuardianOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            const fetchMyStudents = async () => {
              try {
                  const res = await axios.get(`${BACKEND_URL}/api/teacher/students`, 
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
        setIsStudentOpen(false);
        setIsGuardianOpen(false);
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
        if (Object.keys(newErrors).length > 0) return;

        setLoading(true);

        const submitData = new FormData();
        submitData.append('studentId', formData.studentId);
        submitData.append('purpose', formData.purpose);
        submitData.append('isRegistered', isRegistered);

        if (isRegistered) {
            submitData.append('guardianId', formData.guardianId);
        } else {
            submitData.append('manualGuardianName', formData.manualGuardianName);
            if (profileImage) submitData.append('idPhoto', profileImage);
        }

        try {
            const res = await axios.post(`${BACKEND_URL}/api/transfer/override`, submitData, {
                withCredentials: true,
                timeout: 5000
            });
            onSuccess(res.data.msg || "Emergency transfer completed.");
            onClose();
        } catch (err) {
            const errorMessage = err.response?.data?.error
                || err.response?.data?.message
                || err.message
                || "An unexpected error occurred";
            
            setWarningModal({ isOpen: true, title: "Transfer Not Allowed", message: errorMessage }); // ✅
            
            if (err.response?.data?.errors) setErrors(err.response.data.errors);
            } finally {
            setLoading(false);
        }
    };

    // Helpers for display labels
    const selectedStudentLabel = formData.studentId
        ? students.find(s => s.student_id === formData.studentId)
            ? `${students.find(s => s.student_id === formData.studentId).last_name}, ${students.find(s => s.student_id === formData.studentId).first_name}`
            : 'Select Student'
        : 'Select Student';

    const selectedGuardianLabel = formData.guardianId
        ? authorizedGuardians.find(g => String(g.user_id) === String(formData.guardianId))
            ? (() => { const g = authorizedGuardians.find(g => String(g.user_id) === String(formData.guardianId)); return `${g.first_name} ${g.last_name} (${g.relationship})`; })()
            : 'Select Authorized Person'
        : 'Select Authorized Person';

    if (!isOpen) return null;

    return createPortal(
        <>
            {/* --- CROPPER SUB-MODAL --- */}
            {showCropModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white rounded-3xl p-6 flex flex-col items-center max-w-[380px] shadow-2xl animate-[slideUp_0.2s_ease-out]">
                        <h3 className="mb-4 text-[18px] text-slate-800 font-black tracking-tight">
                            Crop ID Verification
                        </h3>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-inner">
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
                        <div className="flex items-center w-full gap-3 my-5 px-2">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">zoom_out</span>
                            <input
                                type="range"
                                min="1" max="3" step="0.01"
                                value={zoom}
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none focus:outline-none"
                            />
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">zoom_in</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <button type="button" className="flex-1 py-3 text-[14px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors focus:outline-none" onClick={() => setShowCropModal(false)}>Cancel</button>
                            <button type="button" className="flex-1 py-3 text-[14px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-200 focus:outline-none" onClick={handleCropSave}>Apply Crop</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MAIN MODAL --- */}
            <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" onClick={onClose}>
                <div className="bg-white rounded-3xl w-full max-w-[550px] overflow-hidden shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>

                    {/* --- HEADER --- */}
                    <div className="bg-[#ef4444] p-5 sm:p-6 flex items-start justify-between relative overflow-hidden">
                        <div className="relative z-10 w-full">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="material-symbols-outlined text-[28px] text-white">e911_emergency</span>
                                <h2 className="text-[20px] sm:text-[22px] font-black tracking-tight m-0" style={{ color: 'white' }}>Manual Process Override</h2>
                            </div>
                            <p className="text-[13px] sm:text-[14px] font-medium m-0 max-w-[90%] sm:max-w-[85%]" style={{ color: 'white', opacity: 0.9 }}>
                                Bypass standard QR scanning for emergency manual student transfer.
                            </p>
                        </div>
                        <span className="material-symbols-outlined absolute -right-4 -top-4 text-[120px] text-white opacity-10 pointer-events-none select-none">
                            warning
                        </span>
                    </div>

                    {/* --- BODY --- */}
                    <div className="p-5 sm:p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <form id="emergencyOverrideForm" onSubmit={handleSubmit} className="flex flex-col gap-6">

                            {/* Guardian Type Toggle */}
                            <div className="flex flex-col gap-3">
                                <label className="text-[12px] sm:text-[13px] font-bold text-slate-700 uppercase tracking-wide">1. Guardian Type</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full">
                                    <button
                                        type="button"
                                        className={`flex-1 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold transition-all focus:outline-none border ${isRegistered ? 'bg-white text-red-600 shadow-sm border-slate-200' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                        onClick={() => setIsRegistered(true)}
                                    >
                                        Registered
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex-1 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold transition-all focus:outline-none border ${!isRegistered ? 'bg-white text-red-600 shadow-sm border-slate-200' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                        onClick={() => setIsRegistered(false)}
                                    >
                                        Guest / Unregistered
                                    </button>
                                </div>
                            </div>

                            {/* Activity Type Toggle */}
                            <div className="flex flex-col gap-3">
                                <label className="text-[12px] sm:text-[13px] font-bold text-slate-700 uppercase tracking-wide">2. Activity Type</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        className={`flex-1 p-3 rounded-xl border transition-all focus:outline-none font-bold text-[13px] sm:text-[14px] flex flex-col items-center gap-1 ${formData.purpose === 'Drop off' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-red-200'}`}
                                        onClick={() => setFormData(p => ({ ...p, purpose: 'Drop off' }))}
                                    >
                                        <span className={`material-symbols-outlined text-[20px] ${formData.purpose === 'Drop off' ? 'text-red-500' : 'text-slate-400'}`}>login</span>
                                        Drop Off
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex-1 p-3 rounded-xl border transition-all focus:outline-none font-bold text-[13px] sm:text-[14px] flex flex-col items-center gap-1 ${formData.purpose === 'Pick up' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-red-200'}`}
                                        onClick={() => setFormData(p => ({ ...p, purpose: 'Pick up' }))}
                                    >
                                        <span className={`material-symbols-outlined text-[20px] ${formData.purpose === 'Pick up' ? 'text-red-500' : 'text-slate-400'}`}>logout</span>
                                        Pick Up
                                    </button>
                                </div>
                            </div>

                            {/* Student Selection — Custom Dropdown */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[12px] sm:text-[13px] font-bold text-slate-700 uppercase tracking-wide">3. Select Student</label>
                                <div className="relative" ref={studentRef}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsStudentOpen(!isStudentOpen);
                                            setIsGuardianOpen(false);
                                        }}
                                        className={`flex items-center justify-between w-full h-[46px] px-4 border rounded-xl text-[13px] sm:text-[14px] font-medium transition-all focus:outline-none ${
                                            isStudentOpen ? 'border-red-400 ring-4 ring-red-50 bg-white' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                        } ${formData.studentId ? 'text-slate-800' : 'text-slate-400'}`}
                                    >
                                        <span className="truncate">{selectedStudentLabel}</span>
                                        <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform duration-300 shrink-0 ${isStudentOpen ? 'rotate-180 text-red-400' : ''}`}>
                                            expand_more
                                        </span>
                                    </button>

                                    {isStudentOpen && (
                                        <div className="absolute top-[50px] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-1 flex flex-col gap-0.5 animate-[fadeIn_0.2s_ease-out] max-h-[200px] overflow-y-auto custom-scrollbar">
                                            {students.length === 0 ? (
                                                <div className="px-3 py-2.5 text-[13px] text-slate-400 italic">No students found.</div>
                                            ) : (
                                                students.map((s) => (
                                                    <button
                                                        type="button"
                                                        key={s.student_id}
                                                        className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                        onClick={() => {
                                                            handleChange({ target: { name: 'studentId', value: s.student_id } });
                                                            setFormData(prev => ({ ...prev, guardianId: '' }));
                                                            setIsStudentOpen(false);
                                                        }}
                                                    >
                                                        {s.last_name}, {s.first_name}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                                {errors.studentId && (
                                    <span className="text-red-500 text-[11px] font-medium mt-1 ml-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">error</span>{errors.studentId}
                                    </span>
                                )}
                            </div>

                            {/* Dynamic Guardian Selection/Input */}
                            {isRegistered ? (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[12px] sm:text-[13px] font-bold text-slate-700 uppercase tracking-wide">4. Authorized Guardian</label>
                                    <div className="relative" ref={guardianRef}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!formData.studentId) return;
                                                setIsGuardianOpen(!isGuardianOpen);
                                                setIsStudentOpen(false);
                                            }}
                                            className={`flex items-center justify-between w-full h-[46px] px-4 border rounded-xl text-[13px] sm:text-[14px] font-medium transition-all focus:outline-none ${
                                                !formData.studentId ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200' :
                                                isGuardianOpen ? 'border-red-400 ring-4 ring-red-50 bg-white' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                            } ${formData.guardianId ? 'text-slate-800' : 'text-slate-400'}`}
                                        >
                                            <span className="truncate">
                                                {!formData.studentId ? 'Select a student first' : selectedGuardianLabel}
                                            </span>
                                            <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform duration-300 shrink-0 ${isGuardianOpen ? 'rotate-180 text-red-400' : ''}`}>
                                                expand_more
                                            </span>
                                        </button>

                                        {isGuardianOpen && (
                                            <div className="absolute top-[50px] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-1 flex flex-col gap-0.5 animate-[fadeIn_0.2s_ease-out] max-h-[200px] overflow-y-auto custom-scrollbar">
                                                {authorizedGuardians.length === 0 ? (
                                                    <div className="px-3 py-2.5 text-[13px] text-slate-400 italic">No authorized guardians found.</div>
                                                ) : (
                                                    authorizedGuardians.map((g) => (
                                                        <button
                                                            type="button"
                                                            key={g.user_id}
                                                            className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                            onClick={() => {
                                                                handleChange({ target: { name: 'guardianId', value: g.user_id } });
                                                                setIsGuardianOpen(false);
                                                            }}
                                                        >
                                                            {g.first_name} {g.last_name}
                                                            <span className="text-[11px] text-slate-400 font-normal ml-1">({g.relationship})</span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {errors.guardianId && (
                                        <span className="text-red-500 text-[11px] font-medium mt-1 ml-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">error</span>{errors.guardianId}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-5 bg-red-50/50 p-4 rounded-2xl border border-red-100">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[12px] sm:text-[13px] font-bold text-slate-700 uppercase tracking-wide">4. Guest Guardian Name</label>
                                        <input
                                            type="text"
                                            name="manualGuardianName"
                                            value={formData.manualGuardianName}
                                            onChange={handleChange}
                                            placeholder="Enter full name"
                                            className="w-full p-3 sm:p-3.5 bg-white border border-slate-200 rounded-xl text-[13px] sm:text-[14px] text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 transition-all"
                                        />
                                        {errors.manualGuardianName && (
                                            <span className="text-red-500 text-[11px] font-medium mt-1 ml-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">error</span>{errors.manualGuardianName}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col w-full gap-2">
                                        <label className="text-[12px] sm:text-[13px] font-bold text-slate-700 uppercase tracking-wide flex justify-between">
                                            Verify ID Document
                                            <span className="text-red-500 text-[11px] normal-case bg-white px-2 py-0.5 rounded-md border border-red-100">Required</span>
                                        </label>
                                        <div className="flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
                                            {previewUrl ? (
                                                <div className="flex flex-col items-center">
                                                    <img className="w-[140px] h-[140px] rounded-xl object-cover border border-slate-200 shadow-sm mb-3" src={previewUrl} alt="ID Preview" />
                                                    <label htmlFor="guestIdPhotoInput" className="text-blue-600 bg-blue-50 px-4 py-2 rounded-lg cursor-pointer text-[13px] font-bold hover:bg-blue-100 transition-colors flex items-center gap-1 focus:outline-none">
                                                        <span className="material-symbols-outlined text-[16px]">edit</span> Change Photo
                                                    </label>
                                                </div>
                                            ) : (
                                                <label htmlFor="guestIdPhotoInput" className="flex flex-col items-center justify-center cursor-pointer w-full py-6 focus:outline-none">
                                                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-3">
                                                        <span className="material-symbols-outlined text-[24px]">add_a_photo</span>
                                                    </div>
                                                    <span className="text-[14px] font-bold text-slate-700">Upload ID Document</span>
                                                    <span className="text-[12px] text-slate-400 mt-1">Tap to open camera or gallery</span>
                                                </label>
                                            )}
                                            <input
                                                type="file"
                                                id="guestIdPhotoInput"
                                                accept="image/*"
                                                hidden
                                                onChange={handleImageChange}
                                            />
                                        </div>
                                        {errors.profileImage && (
                                            <span className="text-red-500 text-[11px] font-medium mt-1 text-center flex items-center justify-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">error</span>{errors.profileImage}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* --- FOOTER --- */}
                    <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3 bg-slate-50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-auto px-6 py-3 sm:py-2.5 text-[14px] font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors focus:outline-none"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            form="emergencyOverrideForm"
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto px-6 py-3 sm:py-2.5 text-[14px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm shadow-red-200 focus:outline-none"
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]">gavel</span>
                                    Confirm Override
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <WarningModal
                isOpen={warningModal.isOpen}
                onClose={() => setWarningModal({ isOpen: false, title: "", message: "" })}
                title={warningModal.title}
                message={warningModal.message}
            />

        </>,
        document.body
    );
}