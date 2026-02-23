import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AvatarEditor from "react-avatar-editor";
import axios from 'axios'; // <-- NEW: Import Axios
import ConfirmModal from '../components/ConfirmModal'; 
import SuccessModal from '../components/SuccessModal'; 

export default function ParentEnrollment() {
  const navigate = useNavigate(); 
  const BACKEND_URL = "http://localhost:3000"; // Define your backend URL

  // --- CAROUSEL STATES ---
  const [step, setStep] = useState(0); 
  const totalSteps = 5;

  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STEP 0: VERIFICATION STATES ---
  const [code, setCode] = useState(new Array(6).fill(""));
  const inputRefs = useRef([]);
  const [isVerifying, setIsVerifying] = useState(false); // Loading state
  const [codeError, setCodeError] = useState(""); // Error state
  const [verifiedClass, setVerifiedClass] = useState(null); // Stores the retrieved class info

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

  // Cropper, Image, & Photo Guideline States
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

  // --- SUCCESS MODAL STATE ---
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ==========================================
  // HANDLERS FOR STEP 0 (VERIFICATION)
  // ==========================================
  const handleCodeChange = (e, index) => {
    setCodeError(""); // Clear error on typing
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

  // --- NEW: THE ACTUAL API VERIFICATION ---
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!isCodeComplete) return;

    const fullCode = code.join('');
    setIsVerifying(true);
    setCodeError("");

    try {
      // Hit the new public verify route we created
      const response = await axios.get(`${BACKEND_URL}/api/sections/verify-code/${fullCode}`);
      
      if (response.data.success) {
        setVerifiedClass(response.data.data); // Save teacher/section name
        setStep(1); // Proceed to T&C
      }
    } catch (error) {
      console.error("Submission Failed:", error);
      // 👇 NEW: This will now pop up an alert telling you EXACTLY what MongoDB rejected!
      const errorMessage = error.response?.data?.errorDetails || error.response?.data?.msg || "Failed to submit.";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
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
  // FINAL SUBMISSION TO BACKEND
  // ==========================================
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Because we are sending a file (the image), we MUST use FormData
    const formData = new FormData();
    
    // Append Student Data
    formData.append('studentFirstName', studentData.firstName);
    formData.append('studentLastName', studentData.lastName);
    formData.append('studentSuffix', studentData.suffix);
    formData.append('studentBirthdate', studentData.birthdate);
    formData.append('studentGender', studentData.gender);
    
    // Append Parent Data
    formData.append('parentFirstName', parentData.firstName);
    formData.append('parentLastName', parentData.lastName);
    formData.append('parentPhone', parentData.phone);
    formData.append('parentEmail', parentData.email);
    
    // Append Routing Data
    // Note: Make sure the verify-code route returned 'section_id' as the custom numeric ID
    formData.append('sectionId', verifiedClass.section_id); 
    
    // Append Image if it exists
    if (studentImageFile) {
      formData.append('studentPhoto', studentImageFile);
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/api/enrollments/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setShowSuccessModal(true); // Pop the success modal!
      }
    } catch (error) {
      console.error("Submission Failed:", error);
      alert(error.response?.data?.msg || "Failed to submit. Please try again.");
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

      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={handleCloseSuccess}
        message="Your application has been successfully submitted! Please wait for the class adviser's approval. An email notification will be sent to you shortly."
      />

      {/* --- CROPPER & GUIDELINES MODALS (Unchanged) --- */}
      <ConfirmModal 
        isOpen={showPhotoGuidelines}
        onClose={() => setShowPhotoGuidelines(false)}
        onConfirm={proceedToImageUpload}
        title="Photo Guidelines"
        message="Please upload a clear, front-facing photo of your child with a blue background, wearing their school uniform or formal attire. (Note: Don't worry if you don't have one yet, you can always upload it later!)"
        confirmText="Select Photo"
        cancelText="Not right now"
        isDestructive={false}
      />

      {showStudentCropModal && (
        <div className="modal-overlay active" style={{ zIndex: 999999 }}>
          <div className="modal-container" style={{ padding: '24px', alignItems: 'center', maxWidth: '350px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--text-dark)', fontWeight: 'bold' }}>Crop Student Photo</h3>
            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
              <AvatarEditor ref={studentEditorRef} image={tempStudentImage} width={220} height={220} border={20} borderRadius={110} color={[15, 23, 42, 0.6]} scale={studentZoom} rotate={0} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px', margin: '20px 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-gray)' }}>zoom_out</span>
              <input type="range" min="1" max="3" step="0.01" value={studentZoom} onChange={(e) => setStudentZoom(parseFloat(e.target.value))} style={{ flex: 1, accentColor: 'var(--primary-blue)', cursor: 'pointer' }} />
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-gray)' }}>zoom_in</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button type="button" className="btn-cancel" style={{ flex: 1 }} onClick={() => { setShowStudentCropModal(false); setTempStudentImage(null); }}>Cancel</button>
              <button type="button" className="btn-save" style={{ flex: 1, background: 'var(--primary-blue)', border: 'none' }} onClick={handleStudentCropSave}>Apply Crop</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN CARD --- */}
      <div className="card max-w-md w-full p-8 text-center relative z-10 shadow-xl border border-slate-100 transition-all duration-500">
        
        {/* PROGRESS DOTS */}
        <div className="flex justify-center gap-2 mb-8">
          {[...Array(totalSteps)].map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all duration-500 ease-out ${step === i ? 'w-8 bg-[#39a8ed]' : i < step ? 'w-2 bg-[#bde0fe]' : 'w-2 bg-slate-200'}`} />
          ))}
        </div>

        {/* ==========================================
            STEP 0: SECTION CODE VERIFICATION
            ========================================== */}
        {step === 0 && (
          <div className="animate-enter">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'var(--bg-light)', color: 'var(--brand-blue)' }}>
              <span className="material-symbols-outlined text-[32px]">vpn_key</span>
            </div>
            
            <h1 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--text-dark)' }}>
              Student Pre-Enrollment
            </h1>
            <p className="mb-8 text-[14px] leading-relaxed" style={{ color: 'var(--text-light)' }}>
              Welcome! Please enter the 6-digit section code provided by your child's adviser to begin.
            </p>
            
            <form onSubmit={handleVerifyCode} className="flex flex-col gap-6">
              
              <div className="flex flex-col gap-3">
                <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(e, index)}
                      onKeyDown={(e) => handleCodeKeyDown(e, index)}
                      className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold uppercase rounded-xl transition-all outline-none border-2 ${codeError ? 'border-red-400 bg-red-50' : ''}`}
                      style={{
                        backgroundColor: codeError ? '#fef2f2' : digit ? 'var(--white)' : 'var(--bg-gray)',
                        borderColor: codeError ? '#f87171' : digit ? 'var(--primary-blue)' : 'var(--border-color)',
                        color: codeError ? '#991b1b' : 'var(--text-dark)',
                        boxShadow: digit && !codeError ? '0 0 0 3px rgba(57, 168, 237, 0.1)' : 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--primary-blue)';
                        e.target.style.backgroundColor = 'var(--white)';
                      }}
                      onBlur={(e) => {
                        if (!e.target.value && !codeError) {
                          e.target.style.borderColor = 'var(--border-color)';
                          e.target.style.backgroundColor = 'var(--bg-gray)';
                        }
                      }}
                    />
                  ))}
                </div>
                {/* --- NEW: ERROR MESSAGE DISPLAY --- */}
                {codeError && (
                  <p className="text-red-500 font-semibold text-[13px] animate-enter flex justify-center items-center gap-1 mt-2">
                    <span className="material-symbols-outlined text-[16px]">error</span> {codeError}
                  </p>
                )}
              </div>

              <button 
                type="submit" 
                className="btn btn-primary w-full h-[55px] rounded-xl text-[16px] font-bold mt-2"
                disabled={!isCodeComplete || isVerifying}
                style={{ opacity: isCodeComplete ? 1 : 0.5, cursor: isCodeComplete ? 'pointer' : 'not-allowed' }}
              >
                {isVerifying ? "Verifying..." : "Verify Code"}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <Link to="/" className="inline-flex items-center gap-1 font-semibold text-sm transition-colors text-slate-500 hover:text-[#39a8ed]">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to Home
              </Link>
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 1: TERMS & CONDITIONS
            ========================================== */}
        {step === 1 && (
          <div className="animate-enter">
            {/* --- NEW: CLASS GREETING BANNER --- */}
            {verifiedClass && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 mb-8 text-left flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-500 mt-0.5">verified</span>
                <div>
                  <p className="text-[12px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">Enrolling In</p>
                  <p className="text-[15px] font-bold text-blue-900">{verifiedClass.section_name}</p>
                  <p className="text-[13px] font-medium text-blue-700">Teacher: {verifiedClass.teacher_name}</p>
                </div>
              </div>
            )}
            
            <h1 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--text-dark)' }}>Terms & Conditions</h1>
            <p className="mb-6 text-[14px] leading-relaxed" style={{ color: 'var(--text-light)' }}>Please read and accept our enrollment policies.</p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 h-[220px] overflow-y-auto text-left text-[13px] mb-6 custom-scrollbar leading-relaxed text-slate-500">
              <p className="mb-3"><strong className="text-slate-800 block mb-1">1. Data Privacy & Consent</strong> By enrolling your child, you consent to the processing of personal data.</p>
              <p className="mb-3"><strong className="text-slate-800 block mb-1">2. QR Gate Pass Policy</strong> Digital passes are dynamically generated and strictly non-transferable.</p>
              <p className="mb-3"><strong className="text-slate-800 block mb-1">3. Medical Accuracy</strong> Parents must provide accurate medical history.</p>
              <p><strong className="text-slate-800 block mb-1">4. System Communication</strong> You agree to receive SMS and App notifications.</p>
            </div>

            <label className="flex items-start gap-3 text-left mb-8 cursor-pointer group">
              <div className="relative flex items-start pt-0.5">
                <input type="checkbox" className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-md checked:bg-[#39a8ed] checked:border-[#39a8ed] transition-all cursor-pointer" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span className="material-symbols-outlined absolute text-white text-[16px] pointer-events-none opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold transition-opacity">check</span>
              </div>
              <span className="text-[13px] font-medium text-slate-700">I have read and agree to the LuMINI Terms & Conditions.</span>
            </label>

            <div className="flex gap-3">
              <button type="button" className="btn btn-outline flex-1 h-[55px] rounded-xl text-[16px]" onClick={() => setStep(0)}>Back</button>
              <button type="button" className="btn btn-primary flex-1 h-[55px] rounded-xl text-[16px] font-bold" disabled={!agreed} style={{ opacity: agreed ? 1 : 0.5 }} onClick={() => setStep(2)}>Accept & Continue</button>
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 2: STUDENT DETAILS (Unchanged)
            ========================================== */}
        {step === 2 && (
          <div className="animate-enter text-left">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--text-dark)' }}>Student Details</h1>
              <p className="text-[14px]" style={{ color: 'var(--text-light)' }}>Tell us about your child.</p>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="relative w-[100px] h-[100px] rounded-full shadow-md group cursor-pointer border-4" style={{ borderColor: 'var(--white)' }} onClick={() => setShowPhotoGuidelines(true)}>
                <img src={studentPreviewUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${studentData.firstName || 'Student'}`} alt="Preview" className="w-full h-full rounded-full object-cover bg-slate-100" />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-white text-[28px]">photo_camera</span></div>
                {!studentPreviewUrl && <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center bg-slate-800"><span className="material-symbols-outlined text-white text-[16px]">add_a_photo</span></div>}
                <input type="file" id="studentPhotoInput" accept="image/*" hidden onChange={handleStudentImageSelect} />
              </div>
              <p className="text-xs mt-2 font-medium" style={{ color: 'var(--text-light)' }}>Upload Photo (Optional)</p>
            </div>

            <div className="flex flex-col gap-4 mb-8">
              <div className="form-group">
                 <label className="text-[13px] font-semibold mb-1 block text-slate-500">First Name <span className="text-red-500">*</span></label>
                 <input type="text" name="firstName" value={studentData.firstName} onChange={handleStudentChange} className="form-input-modal" placeholder="e.g. Arvin" required />
              </div>
              <div className="flex gap-3">
                <div className="form-group flex-[2]">
                   <label className="text-[13px] font-semibold mb-1 block text-slate-500">Last Name <span className="text-red-500">*</span></label>
                   <input type="text" name="lastName" value={studentData.lastName} onChange={handleStudentChange} className="form-input-modal" placeholder="e.g. Dela Rosa" required />
                </div>
                <div className="form-group flex-1">
                   <label className="text-[13px] font-semibold mb-1 block text-slate-500">Suffix</label>
                   <input type="text" name="suffix" value={studentData.suffix} onChange={handleStudentChange} className="form-input-modal" placeholder="e.g. Jr" />
                </div>
              </div>
              <div className="flex gap-3">
                 <div className="form-group flex-[1.5]">
                   <label className="text-[13px] font-semibold mb-1 block text-slate-500">Birthdate <span className="text-red-500">*</span></label>
                   <input type="date" name="birthdate" value={studentData.birthdate} onChange={handleStudentChange} className="form-input-modal" required />
                </div>
                <div className="form-group flex-1">
                   <label className="text-[13px] font-semibold mb-1 block text-slate-500">Gender <span className="text-red-500">*</span></label>
                   <div className="relative">
                     <select name="gender" value={studentData.gender} onChange={handleStudentChange} className="form-input-modal appearance-none w-full bg-white cursor-pointer" required>
                       <option value="" disabled>Select</option>
                       <option value="Male">Male</option>
                       <option value="Female">Female</option>
                     </select>
                     <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
                   </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" className="btn btn-outline flex-1 h-[55px] rounded-xl text-[16px]" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="btn btn-primary flex-1 h-[55px] rounded-xl text-[16px] font-bold" disabled={!isStudentComplete} style={{ opacity: isStudentComplete ? 1 : 0.5 }} onClick={() => setStep(3)}>Continue</button>
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 3: PARENT DETAILS (Unchanged)
            ========================================== */}
        {step === 3 && (
          <div className="animate-enter text-left">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--text-dark)' }}>Parent / Guardian Info</h1>
              <p className="text-[14px]" style={{ color: 'var(--text-light)' }}>Who should we contact?</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
               <span className="material-symbols-outlined text-blue-500 mt-0.5">info</span>
               <p className="text-[13px] text-blue-800 leading-relaxed">Ensure contact info is <strong className="font-bold">active</strong> for gate pass alerts.</p>
            </div>
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex gap-3">
                <div className="form-group flex-1">
                   <label className="text-[13px] font-semibold mb-1 block text-slate-500">First Name <span className="text-red-500">*</span></label>
                   <input type="text" name="firstName" value={parentData.firstName} onChange={handleParentChange} className="form-input-modal" required />
                </div>
                <div className="form-group flex-1">
                   <label className="text-[13px] font-semibold mb-1 block text-slate-500">Last Name <span className="text-red-500">*</span></label>
                   <input type="text" name="lastName" value={parentData.lastName} onChange={handleParentChange} className="form-input-modal" required />
                </div>
              </div>
              <div className="form-group">
                 <label className="text-[13px] font-semibold mb-1 block text-slate-500">Contact Number <span className="text-red-500">*</span></label>
                 <div className="relative">
                   <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">call</span>
                   <input type="text" name="phone" value={parentData.phone} onChange={handlePhoneChange} className="form-input-modal" style={{ paddingLeft: '42px' }} required />
                 </div>
              </div>
              <div className="form-group">
                 <label className="text-[13px] font-semibold mb-1 block text-slate-500">Email <span className="text-red-500">*</span></label>
                 <div className="relative">
                   <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                   <input type="email" name="email" value={parentData.email} onChange={handleParentChange} className="form-input-modal" style={{ paddingLeft: '42px' }} required />
                 </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn btn-outline flex-1 h-[55px] rounded-xl text-[16px]" onClick={() => setStep(2)}>Back</button>
              <button type="button" className="btn btn-primary flex-1 h-[55px] rounded-xl text-[16px] font-bold" disabled={!isParentComplete} style={{ opacity: isParentComplete ? 1 : 0.5 }} onClick={() => setStep(4)}>Review</button>
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 4: REVIEW (Unchanged)
            ========================================== */}
        {step === 4 && (
          <div className="animate-enter text-left">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--text-dark)' }}>Review Details</h1>
              <p className="text-[14px]" style={{ color: 'var(--text-light)' }}>Almost done! Please double-check your data.</p>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 mb-8">
               <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                 <span className="text-[13px] font-semibold text-slate-500">Section Code</span>
                 <span className="font-bold text-[#39a8ed] tracking-widest text-[16px]">{code.join('')}</span>
               </div>
               <div className="mb-4 pb-4 border-b border-slate-200">
                 <h4 className="text-[14px] font-bold text-slate-700 mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">school</span> Student</h4>
                 <div className="flex items-center gap-4">
                   <img src={studentPreviewUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${studentData.firstName}`} alt="Student" className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                   <div>
                     <p className="font-bold text-slate-800 text-[15px]">{studentData.firstName} {studentData.lastName} {studentData.suffix}</p>
                     <p className="text-[12px] text-slate-500 font-medium">{studentData.gender} • {studentData.birthdate}</p>
                   </div>
                 </div>
               </div>
               <div>
                 <h4 className="text-[14px] font-bold text-slate-700 mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">family_restroom</span> Guardian</h4>
                 <div className="grid grid-cols-[80px_1fr] gap-y-2 text-[13px]">
                   <span className="text-slate-500 font-medium">Name:</span><span className="font-semibold text-slate-800 text-right">{parentData.firstName} {parentData.lastName}</span>
                   <span className="text-slate-500 font-medium">Contact:</span><span className="font-semibold text-slate-800 text-right">{parentData.phone}</span>
                   <span className="text-slate-500 font-medium">Email:</span><span className="font-semibold text-slate-800 text-right break-all">{parentData.email}</span>
                 </div>
               </div>
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn btn-outline flex-1 h-[55px] rounded-xl text-[16px]" onClick={() => setStep(3)}>Back</button>
              <button 
                type="button" 
                className="btn btn-save flex-1 h-[55px] rounded-xl text-[16px] font-bold" 
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'wait' : 'pointer' }}
              >
                {isSubmitting ? 'Sending...' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}