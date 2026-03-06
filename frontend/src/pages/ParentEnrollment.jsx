// frontend/src/pages/ParentEnrollment.jsx

import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AvatarEditor from "react-avatar-editor";
import axios from 'axios'; 
import ConfirmModal from '../components/ConfirmModal'; 
import SuccessModal from '../components/SuccessModal'; 
import WarningModal from '../components/WarningModal'; 

// DYNAMIC BACKEND URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function ParentEnrollment() {
  const navigate = useNavigate(); 

  // --- CAROUSEL STATES ---
  const [step, setStep] = useState(0); 
  const totalSteps = 5;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STEP 0: VERIFICATION STATES ---
  const [code, setCode] = useState(new Array(6).fill(""));
  const inputRefs = useRef([]);
  const [isVerifying, setIsVerifying] = useState(false); 
  const [codeError, setCodeError] = useState(""); 
  const [verifiedClass, setVerifiedClass] = useState(null); 

  // --- STEP 1: T&C STATES ---
  const [agreed, setAgreed] = useState(false);

  // --- STEP 2: STUDENT DETAILS STATES ---
  const [studentData, setStudentData] = useState({
    firstName: '',
    lastName: '',
    suffix: '', 
    birthdate: '',
    gender: ''
  });

  const studentEditorRef = useRef(null);
  const [studentImageFile, setStudentImageFile] = useState(null); 
  const [studentPreviewUrl, setStudentPreviewUrl] = useState(null); 
  const [showStudentCropModal, setShowStudentCropModal] = useState(false);
  const [tempStudentImage, setTempStudentImage] = useState(null);
  const [studentZoom, setStudentZoom] = useState(1);
  const [showPhotoGuidelines, setShowPhotoGuidelines] = useState(false); 

  // --- STEP 3: PARENT / GUARDIAN STATES ---
  const [parentData, setParentData] = useState({
    firstName: '',
    lastName: '',
    phone: '09',
    email: ''
  });

  // --- MODAL STATES ---
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  // ==========================================
  // HANDLERS FOR STEP 0 (VERIFICATION)
  // ==========================================
  const handleCodeChange = (e, index) => {
    setCodeError(""); 
    const value = e.target.value.toUpperCase();
    if (/[^A-Z0-9]/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleCodeKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    setCodeError("");
    const pastedData = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (!pastedData) return;
    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);
    const focusIndex = pastedData.length < 6 ? pastedData.length : 5;
    inputRefs.current[focusIndex].focus();
  };

  const isCodeComplete = code.every(char => char !== "");

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!isCodeComplete) return;
    const fullCode = code.join('');
    setIsVerifying(true);
    setCodeError("");
    try {
      const response = await axios.get(`${BACKEND_URL}/api/sections/verify-code/${fullCode}`);
      if (response.data.success) {
        setVerifiedClass(response.data.data); 
        setStep(1); 
      }
    } catch (error) {
      setCodeError(error.response?.data?.msg || "Invalid section code.");
    } finally {
      setIsVerifying(false);
    }
  };

  // ==========================================
  // HANDLERS FOR STEP 2 (STUDENT DETAILS)
  // ==========================================
  const handleStudentChange = (e) => {
    const { name, value } = e.target;
    setStudentData(prev => ({ ...prev, [name]: value }));
  };

  const handleStudentImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setTempStudentImage(imageUrl);
      setShowStudentCropModal(true);
      setStudentZoom(1);
    }
    e.target.value = null; 
  };

  const handleStudentCropSave = () => {
    if (studentEditorRef.current) {
      const canvas = studentEditorRef.current.getImageScaledToCanvas();
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], "student_photo.jpg", { type: "image/jpeg" });
          setStudentImageFile(croppedFile); 
          setStudentPreviewUrl(URL.createObjectURL(croppedFile)); 
          setShowStudentCropModal(false);
          setTempStudentImage(null);
        }
      }, "image/jpeg", 0.95);
    }
  };

  const proceedToImageUpload = () => {
    document.getElementById('studentPhotoInput').click();
  };

  const isStudentComplete = studentData.firstName.trim() !== '' && 
                            studentData.lastName.trim() !== '' && 
                            studentData.birthdate !== '' && 
                            studentData.gender !== '';

  // ==========================================
  // HANDLERS FOR STEP 3 (PARENT DETAILS)
  // ==========================================
  const handleParentChange = (e) => {
    const { name, value } = e.target;
    setParentData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, ''); 
    if (!val.startsWith('09')) val = '09' + val.replace(/^0+/, ''); 
    if (val.length > 11) val = val.slice(0, 11);
    setParentData(prev => ({ ...prev, phone: val }));
  };

  const isParentComplete = parentData.firstName.trim() !== '' &&
                           parentData.lastName.trim() !== '' &&
                           parentData.phone.length === 11 &&
                           parentData.email.includes('@');

  // ==========================================
  // FINAL SUBMISSION
  // ==========================================
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('studentFirstName', studentData.firstName);
    formData.append('studentLastName', studentData.lastName);
    formData.append('studentSuffix', studentData.suffix);
    formData.append('studentBirthdate', studentData.birthdate);
    formData.append('studentGender', studentData.gender);
    formData.append('parentFirstName', parentData.firstName);
    formData.append('parentLastName', parentData.lastName);
    formData.append('parentPhone', parentData.phone);
    formData.append('parentEmail', parentData.email);
    formData.append('sectionId', verifiedClass.section_id); 
    if (studentImageFile) {
      formData.append('studentPhoto', studentImageFile);
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/api/enrollments/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setShowSuccessModal(true); 
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        setWarningMessage("You have already submitted an enrollment application for this student.");
        setShowWarningModal(true);
      } else {
        alert(error.response?.data?.msg || "Failed to submit. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 tech-bg relative font-poppins">
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-bottom from-white to-transparent pointer-events-none"></div>

      <SuccessModal isOpen={showSuccessModal} onClose={handleCloseSuccess} message="Enrollment submitted! Please wait for teacher approval." />
      <WarningModal isOpen={showWarningModal} onClose={() => setShowWarningModal(false)} title="Duplicate Application" message={warningMessage} />
      <ConfirmModal isOpen={showPhotoGuidelines} onClose={() => setShowPhotoGuidelines(false)} onConfirm={proceedToImageUpload} title="Photo Guidelines" message="Clear front-facing photo with a blue background is recommended." confirmText="Select Photo" cancelText="Later" isDestructive={false} />

      {showStudentCropModal && (
        <div className="modal-overlay active" style={{ zIndex: 999999 }}>
          <div className="modal-container" style={{ padding: '24px', alignItems: 'center', maxWidth: '350px' }}>
            <h3 className="mb-4 font-bold">Crop Student Photo</h3>
            <div className="bg-slate-50 p-2 rounded-xl"><AvatarEditor ref={studentEditorRef} image={tempStudentImage} width={220} height={220} border={20} borderRadius={110} scale={studentZoom} /></div>
            <div className="flex items-center w-full gap-3 my-4"><input type="range" min="1" max="3" step="0.01" value={studentZoom} onChange={(e) => setStudentZoom(parseFloat(e.target.value))} className="flex-1" /></div>
            <div className="flex gap-3 w-full"><button type="button" className="btn-cancel flex-1" onClick={() => setShowStudentCropModal(false)}>Cancel</button><button type="button" className="btn-save flex-1 bg-blue-500" onClick={handleStudentCropSave}>Apply</button></div>
          </div>
        </div>
      )}

      <div className="card max-w-md w-full p-8 text-center relative z-10 shadow-xl border border-slate-100">
        <div className="flex justify-center gap-2 mb-8">
          {[...Array(totalSteps)].map((_, i) => (<div key={i} className={`h-2 rounded-full transition-all duration-500 ${step === i ? 'w-8 bg-[#39a8ed]' : i < step ? 'w-2 bg-[#bde0fe]' : 'w-2 bg-slate-200'}`} />))}
        </div>

        {step === 0 && (
          <div className="animate-enter">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-blue-50 text-blue-500"><span className="material-symbols-outlined text-[32px]">vpn_key</span></div>
            <h1 className="text-2xl font-extrabold mb-2">Student Pre-Enrollment</h1>
            <p className="mb-8 text-sm">Enter the 6-digit code from your teacher.</p>
            <form onSubmit={handleVerifyCode} className="flex flex-col gap-6">
              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input key={index} ref={(el) => (inputRefs.current[index] = el)} type="text" maxLength={1} value={digit} onChange={(e) => handleCodeChange(e, index)} onKeyDown={(e) => handleCodeKeyDown(e, index)} className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none focus:border-blue-500" />
                ))}
              </div>
              <button type="submit" className="btn btn-primary w-full h-[55px] rounded-xl font-bold" disabled={!isCodeComplete || isVerifying}>{isVerifying ? "Verifying..." : "Verify Code"}</button>
            </form>
          </div>
        )}

        {step === 1 && (
          <div className="animate-enter">
            {verifiedClass && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-left flex gap-3">
                <span className="material-symbols-outlined text-blue-500">verified</span>
                <div><p className="text-[12px] font-bold text-blue-400 uppercase">Enrolling In</p><p className="text-[15px] font-bold text-blue-900">{verifiedClass.section_name}</p></div>
              </div>
            )}
            <h1 className="text-2xl font-extrabold mb-2">Terms & Conditions</h1>
            <div className="bg-slate-50 border rounded-xl p-5 h-[220px] overflow-y-auto text-left text-[13px] mb-6 leading-relaxed text-slate-500">
              <p>Please read and accept the data privacy and enrollment policies.</p>
            </div>
            <label className="flex items-start gap-3 text-left mb-8 cursor-pointer"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" /><span className="text-[13px] font-medium">I agree to the LuMINI Terms & Conditions.</span></label>
            <div className="flex gap-3"><button className="btn btn-outline flex-1" onClick={() => setStep(0)}>Back</button><button className="btn btn-primary flex-1 font-bold" disabled={!agreed} onClick={() => setStep(2)}>Accept</button></div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-enter text-left">
            <h1 className="text-center text-2xl font-extrabold mb-6">Student Details</h1>
            <div className="flex flex-col items-center mb-6" onClick={() => setShowPhotoGuidelines(true)}>
              <div className="relative w-[100px] h-[100px] rounded-full shadow-md cursor-pointer border-4 border-white">
                <img src={studentPreviewUrl || `https://api.dicebear.com/7.x/initials/svg?seed=S`} className="w-full h-full rounded-full object-cover" alt="Preview" />
                <input type="file" id="studentPhotoInput" accept="image/*" hidden onChange={handleStudentImageSelect} />
              </div>
            </div>
            <div className="flex flex-col gap-4 mb-8">
              <input type="text" name="firstName" value={studentData.firstName} onChange={handleStudentChange} className="form-input-modal" placeholder="First Name" />
              <input type="text" name="lastName" value={studentData.lastName} onChange={handleStudentChange} className="form-input-modal" placeholder="Last Name" />
              <div className="flex gap-3"><input type="date" name="birthdate" value={studentData.birthdate} onChange={handleStudentChange} className="form-input-modal flex-1" /><select name="gender" value={studentData.gender} onChange={handleStudentChange} className="form-input-modal flex-1"><option value="">Gender</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
            </div>
            <div className="flex gap-3"><button className="btn btn-outline flex-1" onClick={() => setStep(1)}>Back</button><button className="btn btn-primary flex-1 font-bold" disabled={!isStudentComplete} onClick={() => setStep(3)}>Continue</button></div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-enter text-left">
            <h1 className="text-center text-2xl font-extrabold mb-6">Parent Info</h1>
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex gap-3"><input type="text" name="firstName" value={parentData.firstName} onChange={handleParentChange} className="form-input-modal" placeholder="First Name" /><input type="text" name="lastName" value={parentData.lastName} onChange={handleParentChange} className="form-input-modal" placeholder="Last Name" /></div>
              <input type="text" value={parentData.phone} onChange={handlePhoneChange} className="form-input-modal" placeholder="Contact Number" />
              <input type="email" name="email" value={parentData.email} onChange={handleParentChange} className="form-input-modal" placeholder="Email" />
            </div>
            <div className="flex gap-3"><button className="btn btn-outline flex-1" onClick={() => setStep(2)}>Back</button><button className="btn btn-primary flex-1 font-bold" disabled={!isParentComplete} onClick={() => setStep(4)}>Review</button></div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-enter text-left">
            <h1 className="text-center text-2xl font-extrabold mb-6">Review</h1>
            <div className="bg-slate-50 rounded-xl border p-5 mb-8">
               <div className="flex justify-between mb-4 border-b pb-2"><span className="text-sm">Section</span><span className="font-bold text-blue-500">{verifiedClass?.section_name}</span></div>
               <p className="font-bold text-sm mb-2">Student: {studentData.firstName} {studentData.lastName}</p>
               <p className="text-sm">Parent: {parentData.firstName} {parentData.lastName}</p>
            </div>
            <div className="flex gap-3"><button className="btn btn-outline flex-1" onClick={() => setStep(3)}>Back</button><button className="btn btn-save flex-1 font-bold" onClick={handleFinalSubmit} disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Submit'}</button></div>
          </div>
        )}
      </div>
    </div>
  );
}