import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../styles/auth/registration.css';
import FormInputRegistration from '../../components/FormInputRegistration';
import { validateRegistrationStep } from '../../utils/validation';
import AvatarEditor from "react-avatar-editor";
import SuccessModal from '../../components/SuccessModal';

export default function TeacherRegistration() {
  const navigate = useNavigate();
  // We removed the 'phase' state entirely because Teachers don't use invitation codes!
  const [currentStep, setCurrentStep] = useState(0);
  
  const [errors, setErrors] = useState({});
  
  // Profile Image State //
  const [profileImage, setProfileImage] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Verification IDs State //
  const [schoolIdFile, setSchoolIdFile] = useState(null);
  const [schoolIdPreview, setSchoolIdPreview] = useState(null);
  
  const [validIdFile, setValidIdFile] = useState(null);
  const [validIdPreview, setValidIdPreview] = useState(null);
  
  const [viewImage, setViewImage] = useState(null); 

  // User Agreement State //
  const [hasAgreed, setHasAgreed] = useState(false);

  // Password Visibility States //
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Success Modal State //
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Cropper States //
  const editorRef = useRef(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  // Form Inputs Placeholder //
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',    
    lastName: '',     
    email: '',
    phoneNumber: '09',  
    relationship: 'Teacher', 
    houseUnit: '',
    street: '',
    barangay: '',
    city: '',
    zipCode: '',
  });

  const validateStep = (step) => {
    if (step === 3 || step === 4) return true; 

    const newErrors = validateRegistrationStep(step, formData, profileImage, 'admin');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setTempImage(imageUrl);
      setShowCropModal(true); 
      setZoom(1);
    }
    if (fileInputRef.current) fileInputRef.current.value = null; 
    if (errors.profileImage) setErrors(prev => ({ ...prev, profileImage: null }));
  };

  const handleCropSave = () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], "teacher_photo.jpg", { type: "image/jpeg" });
          setProfileImage(croppedFile); 
          setPreviewUrl(URL.createObjectURL(croppedFile)); 
          setShowCropModal(false);
          setTempImage(null);
        }
      }, "image/jpeg", 0.95);
    }
  };

  const removeImage = (e) => {
    e.stopPropagation(); 
    setProfileImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleIdUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      if (type === 'school') {
        setSchoolIdFile(file);
        setSchoolIdPreview(previewUrl);
        setErrors(prev => ({ ...prev, schoolId: null }));
      } else if (type === 'valid') {
        setValidIdFile(file);
        setValidIdPreview(previewUrl);
        setErrors(prev => ({ ...prev, validId: null }));
      }
    }
    e.target.value = null; 
  };

  const handleDeleteId = (type) => {
    if (type === 'school') {
      setSchoolIdFile(null);
      setSchoolIdPreview(null);
    } else if (type === 'valid') {
      setValidIdFile(null);
      setValidIdPreview(null);
    }
    setViewImage(null); 
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'phoneNumber') {
      finalValue = finalValue.replace(/\D/g, '');
      if (finalValue.startsWith('639')) finalValue = '0' + finalValue.substring(2);
      if (!finalValue.startsWith('09')) finalValue = '09';
      finalValue = finalValue.slice(0, 11);
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  const handleSubmitForm = async () => {
    const data = new FormData();
      data.append('username', formData.username);
      data.append('password', formData.password);
      data.append('email', formData.email);
      data.append('first_name', formData.firstName);
      data.append('last_name', formData.lastName);
      data.append('phone_number', formData.phoneNumber);
      data.append('relationship', formData.relationship);
      data.append('address', `${formData.houseUnit}, ${formData.street}, ${formData.barangay}, ${formData.city}, ${formData.zipCode}`);
      
    if (profileImage) data.append('profile_photo', profileImage); 
    if (schoolIdFile) data.append('school_id_photo', schoolIdFile);
    if (validIdFile) data.append('valid_id_photo', validIdFile);

    try {
      await axios.post('http://localhost:3000/api/teachers', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setSuccessMessage("Your registration has been submitted! Please wait for the Super Admin to review and approve your account before you can sign in.");
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error('Registration API Error:', error);
      // This will now clearly tell you WHICH field the backend rejected!
      if (error.response && error.response.data && error.response.data.errors) {
        const errorMessages = error.response.data.errors.map(err => err.msg).join('\n');
        alert(`Validation Failed:\n${errorMessages}`);
      } else {
        alert(error.response?.data?.msg || "Registration failed. Please try again.");
      }
      // --- NEW: THIS WILL ALERT THE EXACT MONGODB ERROR ---
        const dbError = error.response?.data?.error;
        alert(`Failed: ${dbError ? dbError : "Unknown error occurred."}`);
    }
  };

  const handleCloseSuccess = () => {
    setIsSuccessModalOpen(false);
    navigate('/login'); 
  };
  
  const handleNext = () => {
    const isValid = validateStep(currentStep);

    if (isValid) {
      if (currentStep < 3) {
        setCurrentStep((prev) => prev + 1);
      } else if (currentStep === 3) {
        let stepErrors = {};
        if (!schoolIdFile) stepErrors.schoolId = "School ID is required.";
        if (!validIdFile) stepErrors.validId = "A Valid ID is required.";

        if (Object.keys(stepErrors).length > 0) {
          setErrors(prev => ({ ...prev, ...stepErrors }));
          return; 
        }
        setCurrentStep((prev) => prev + 1);

      } else if (currentStep === 4) {
        if (!hasAgreed) {
          setErrors(prev => ({ ...prev, agreement: "You must agree to the Terms and Conditions to register." }));
          return;
        }
        handleSubmitForm();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const ErrorMsg = ({ field }) => {
    return errors[field] ? (
      <span className="text-red-500 text-[11px] mt-1 ml-1 text-left w-full block font-medium">
        {errors[field]}
      </span>
    ) : null;
  };

  return (
    <div className="wave min-h-screen w-full flex justify-center items-center p-5" style={{ backgroundAttachment: 'fixed' }}>

      {/* LIGHTBOX OVERLAY */}
      {viewImage && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/90 backdrop-blur-sm flex flex-col justify-center items-center p-6 transition-all">
          <button className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer" onClick={() => setViewImage(null)}>
            <span className="material-symbols-outlined text-[28px]">close</span>
          </button>
          <img src={viewImage.url} alt="Fullscreen View" className="max-w-[90vw] max-h-[75vh] rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border-[4px] border-white/20 object-contain mb-8"/>
          <div className="flex gap-4">
            <button onClick={() => handleDeleteId(viewImage.type)} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-bold transition-transform active:scale-95 shadow-lg">
              <span className="material-symbols-outlined">delete</span> Delete Photo
            </button>
            <button onClick={() => setViewImage(null)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-full font-bold transition-transform active:scale-95 shadow-lg">
              <span className="material-symbols-outlined">check_circle</span> Looks Good
            </button>
          </div>
        </div>
      )}

      <SuccessModal isOpen={isSuccessModalOpen} onClose={handleCloseSuccess} message={successMessage} />

      {/* CROPPER */}
      {showCropModal && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-[360px] flex flex-col items-center animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Crop Photo</h3>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-inner">
              <AvatarEditor ref={editorRef} image={tempImage} width={200} height={200} border={20} borderRadius={100} color={[15, 23, 42, 0.5]} scale={zoom} rotate={0} />
            </div>
            <div className="flex items-center w-full gap-3 mt-5 mb-6 px-2">
              <span className="material-symbols-outlined text-slate-400 text-[18px]">zoom_out</span>
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer" />
              <span className="material-symbols-outlined text-slate-400 text-[18px]">zoom_in</span>
            </div>
            <div className="flex gap-3 w-full">
              <button type="button" className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors" onClick={() => { setShowCropModal(false); setTempImage(null); }}>Cancel</button>
              <button type="button" className="flex-1 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors" onClick={handleCropSave}>Apply Crop</button>
            </div>
          </div>
        </div>
      )}

      <div className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[500px] mx-auto my-10 relative z-10 sm:p-[25px]'>
        <h1 className='text-left w-full mb-2'>Create Account</h1>
        <p className='w-full mb-4 font-normal text-left text-[14px] text-slate-500'>Please fill out the form to create your teacher account.</p>

        {/* PROGRESS DOTS */}
        <div className="flex justify-center gap-2 mb-6 w-full"> 
          {[...Array(5)].map((_, i) => ( 
            <div key={i} className={`h-2 rounded-full transition-all duration-500 ease-out ${currentStep === i ? 'w-8 bg-[#39a8ed]' : i < currentStep ? 'w-2 bg-[#bde0fe]' : 'w-2 bg-slate-200'}`} />
          ))}
        </div>

        <form className="flex flex-col w-full" id="mainRegistrationForm" action="#" method="POST">
          
          {currentStep === 0 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Account Setup</p>
              <div className='flex flex-col w-full mb-5'>
                <FormInputRegistration label="Username" name="username" type='text' placeholder="e.g. Teacher_Juan" className="form-input-modal" value={formData.username} onChange={handleChange} error={errors.username} required={true} />
              </div>
              <div className='flex flex-col w-full mb-5 relative'>
                <FormInputRegistration label="Password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Type your password here" className="form-input-modal pr-12" value={formData.password} onChange={handleChange} error={errors.password} required={true} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[40px] text-slate-400 hover:text-blue-500 transition-colors focus:outline-none" title={showPassword ? "Hide Password" : "Show Password"}><span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span></button>
              </div>
              <div className='flex flex-col w-full mb-5 relative'>
                <FormInputRegistration label="Confirm Password" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Re-type your password here" className="form-input-modal pr-12" value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} required={true} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-[40px] text-slate-400 hover:text-blue-500 transition-colors focus:outline-none" title={showConfirmPassword ? "Hide Password" : "Show Password"}><span className="material-symbols-outlined text-[20px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span></button>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Teacher Information</p>
              <div className='flex flex-col w-full mb-4'>
                <label htmlFor="profileUpload" className='text-cdark text-[13px] font-semibold mb-2'>Profile Photo <span className='text-cbrand-blue ml-1 text-[12px]'>*</span></label>
                <div className="flex flex-col items-center justify-center mb-2 mt-2">
                  <input type="file" ref={fileInputRef} accept="image/*" className='hidden' onChange={handleImageUpload} />
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                    <div className={`w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-xl ${errors.profileImage ? 'ring-2 ring-red-500' : ''}`}>
                      {previewUrl ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[40px] text-slate-300 group-hover:scale-110 transition-transform duration-300">add_a_photo</span>}
                    </div>
                    <div className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"><span className="material-symbols-outlined text-white text-[24px]">edit</span></div>
                  </div>
                  <p className="text-slate-500 text-[12px] font-medium mt-3">{previewUrl ? 'Click to change photo' : 'Click to select photo'}</p>
                </div>
                <ErrorMsg field="profileImage" />
              </div>
              <div className='flex w-full h-auto gap-4'>
                <div className='flex flex-col w-full mb-1'><FormInputRegistration label="First Name" name="firstName" type='text' placeholder="John" className="form-input-modal" value={formData.firstName} onChange={handleChange} error={errors.firstName} required={true} /></div>
                <div className='flex flex-col w-full mb-1'><FormInputRegistration label="Last Name" name="lastName" type='text' placeholder="Doe" className="form-input-modal" value={formData.lastName} onChange={handleChange} error={errors.lastName} required={true} /></div>
              </div>
              <div className='flex flex-col w-full mb-2'><FormInputRegistration label="Email Address" name="email" type='text' placeholder="Johndoe@gmail.com" className='registration-input' value={formData.email} onChange={handleChange} error={errors.email} required={true} /></div>
              <div className='flex flex-col w-full mb-2'><FormInputRegistration label="Phone Number" name="phoneNumber" type='text' placeholder="09*********" className='registration-input' value={formData.phoneNumber} onChange={handleChange} error={errors.phoneNumber} required={true} /></div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Address Details</p>
              <div className='flex w-full h-auto gap-4'>
                <div className='flex flex-col w-full mb-5'><FormInputRegistration label="House Unit" name="houseUnit" type='text' placeholder="117" className='registration-input' value={formData.houseUnit} onChange={handleChange} error={errors.houseUnit} required={true} /></div>
                <div className='flex flex-col w-full mb-5'><FormInputRegistration label="Street" name="street" type='text' placeholder="Hope Street" className='registration-input' value={formData.street} onChange={handleChange} error={errors.street} required={true} /></div>
              </div>
              <div className='flex w-full h-auto gap-4'>
                <div className='flex flex-col w-full mb-5'><FormInputRegistration label="Barangay" name="barangay" type='text' placeholder="Helin Hills" className='registration-input' value={formData.barangay} onChange={handleChange} error={errors.barangay} required={true} /></div>
                <div className='flex flex-col w-full mb-5'><FormInputRegistration label="City" name="city" type='text' placeholder="Quezon City" className='registration-input' value={formData.city} onChange={handleChange} error={errors.city} required={true} /></div>
              </div>
              <div className='flex flex-col w-full mb-5'><FormInputRegistration label="Zip Code" name="zipCode" type='text' placeholder="1153" className='registration-input' value={formData.zipCode} onChange={handleChange} error={errors.zipCode} required={true} /></div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Verification Documents</p>
              <p className='text-slate-500 text-[13px] mb-5 leading-relaxed'>To ensure system security, Super Admins require proof of identity. Please upload clear photos of your IDs below.</p>
              <div className="flex w-full gap-4 mb-4">
                <div className='flex flex-col flex-1'>
                  <label className='text-cdark text-[12px] font-semibold mb-2 flex items-center justify-center gap-1.5'><span className="material-symbols-outlined text-[16px] text-blue-500">badge</span> School ID <span className='text-cbrand-blue text-[12px]'>*</span></label>
                  {schoolIdPreview ? (
                    <div onClick={() => setViewImage({ url: schoolIdPreview, type: 'school' })} className="relative w-full h-32 border-2 border-emerald-400 bg-emerald-50 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-100 transition-colors shadow-sm">
                      <span className="material-symbols-outlined text-emerald-500 text-[32px] mb-1">check_circle</span><span className="text-[12px] font-bold text-emerald-700">Uploaded</span><span className="text-[10px] text-emerald-600 mt-1 underline font-medium">Click to view</span>
                    </div>
                  ) : (
                    <label className={`relative w-full h-32 border-2 border-dashed rounded-xl bg-slate-50 flex flex-col items-center justify-center cursor-pointer group transition-all ${errors.schoolId ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30'}`}>
                      <span className={`material-symbols-outlined text-[32px] mb-1 group-hover:scale-110 transition-transform ${errors.schoolId ? 'text-red-400' : 'text-slate-300'}`}>add_photo_alternate</span><span className="text-[11px] text-slate-500 font-medium text-center px-2 leading-tight">Upload<br/>School ID</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleIdUpload(e, 'school')} />
                    </label>
                  )}
                  <ErrorMsg field="schoolId" />
                </div>
                <div className='flex flex-col flex-1'>
                  <label className='text-cdark text-[12px] font-semibold mb-2 flex items-center justify-center gap-1.5'><span className="material-symbols-outlined text-[16px] text-purple-500">assignment_ind</span> Valid ID <span className='text-cbrand-blue text-[12px]'>*</span></label>
                  {validIdPreview ? (
                    <div onClick={() => setViewImage({ url: validIdPreview, type: 'valid' })} className="relative w-full h-32 border-2 border-emerald-400 bg-emerald-50 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-100 transition-colors shadow-sm">
                      <span className="material-symbols-outlined text-emerald-500 text-[32px] mb-1">check_circle</span><span className="text-[12px] font-bold text-emerald-700">Uploaded</span><span className="text-[10px] text-emerald-600 mt-1 underline font-medium">Click to view</span>
                    </div>
                  ) : (
                    <label className={`relative w-full h-32 border-2 border-dashed rounded-xl bg-slate-50 flex flex-col items-center justify-center cursor-pointer group transition-all ${errors.validId ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50/30'}`}>
                      <span className={`material-symbols-outlined text-[32px] mb-1 group-hover:scale-110 transition-transform ${errors.validId ? 'text-red-400' : 'text-slate-300'}`}>add_photo_alternate</span><span className="text-[11px] text-slate-500 font-medium text-center px-2 leading-tight">Upload<br/>Valid ID</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleIdUpload(e, 'valid')} />
                    </label>
                  )}
                  <ErrorMsg field="validId" />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Terms and Conditions</p>
              <p className='text-slate-500 text-[13px] mb-3'>Please read the user agreement carefully before completing your registration.</p>
              <div className='bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 h-[200px] overflow-y-auto custom-scrollbar text-[12px] text-slate-600 leading-relaxed shadow-inner'>
                <strong className="text-slate-800 text-[14px] block mb-2">LuMINI Teacher User Agreement</strong>
                <ol className="list-decimal pl-4 mb-2 space-y-1">
                  <li><strong>Account Approval:</strong> Your account registration will be placed in a queue. You will not have access to the system until a Super Admin verifies your employment.</li>
                  <li><strong>Data Confidentiality:</strong> You agree to keep student data strictly confidential.</li>
                </ol>
              </div>
              <div className='flex items-center gap-2 mt-2 mb-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100'>
                <input type="checkbox" id="userAgreement" className="w-[18px] h-[18px] cursor-pointer accent-blue-600" checked={hasAgreed} onChange={(e) => { setHasAgreed(e.target.checked); if (e.target.checked) setErrors(prev => ({ ...prev, agreement: null })); }} />
                <label htmlFor="userAgreement" className="text-[13px] text-slate-800 font-medium cursor-pointer select-none">I have read and agree to the User Agreement</label>
              </div>
              <ErrorMsg field="agreement" />
            </div>
          )}

          <div className="flex flex-row w-full mt-2.5 gap-[15px]">
            <button type="button" className="btn btn-outline flex-1 h-12 rounded-3xl font-semibold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleBack} disabled={currentStep === 0}>Back</button>
            <button type="button" className={`btn btn-primary flex-1 h-12 rounded-3xl font-semibold text-[15px] transition-all ${currentStep === 4 && !hasAgreed ? 'opacity-70 grayscale-[20%]' : ''}`} onClick={handleNext}>{currentStep === 4 ? 'Complete Registration' : 'Next'} </button>
          </div>
        </form>
      </div>
    </div>
  );
}