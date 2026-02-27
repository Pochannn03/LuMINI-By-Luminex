import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthProvider";
import '../../../styles/auth/registration.css'; 
import FormInputRegistration from '../../../components/FormInputRegistration';
import AvatarEditor from "react-avatar-editor";

export default function GuardianSetup() {
  const navigate = useNavigate();
  const { logout, user } = useAuth(); 

  // --- WIZARD STATE (0-indexed to match carousel logic) ---
  const [currentStep, setCurrentStep] = useState(0);
  
  // Profile Image State
  const [profilePic, setProfilePic] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Cropper States
  const editorRef = useRef(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  // Password Toggle States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // T&C State
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Error State for basic validation
  const [errors, setErrors] = useState({});

  // Form Data State
  const [formData, setFormData] = useState({
    username: user?.username || "",
    password: "",
    confirmPassword: "",
    firstName: user?.first_name || user?.firstName || "",
    lastName: user?.last_name || user?.lastName || "",
    email: user?.email || "",
    contact: "09", 
    houseUnit: "",
    street: "",
    barangay: "",
    city: "",
    zipCode: "",
  });

  // --- CROPPER HANDLERS ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setTempImage(imageUrl);
      setShowCropModal(true); 
      setZoom(1);
    }
    if (fileInputRef.current) fileInputRef.current.value = null; 
  };

  const handleCropSave = () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], "guardian_photo.jpg", { type: "image/jpeg" });
          setProfilePic(croppedFile); 
          setPreviewUrl(URL.createObjectURL(croppedFile)); 
          setShowCropModal(false);
          setTempImage(null);
        }
      }, "image/jpeg", 0.95);
    }
  };

  // --- INPUT HANDLER ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === "contact") {
      finalValue = finalValue.replace(/\D/g, ''); 
      if (!finalValue.startsWith("09")) finalValue = "09" + finalValue.replace(/^0+/, ''); 
      if (finalValue.length > 11) finalValue = finalValue.substring(0, 11);
    }

    setFormData({ ...formData, [name]: finalValue });
    
    // Clear error for this field if it exists
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // --- TEMPORARY LOGOUT ---
  const handleTempLogout = async () => {
    try {
      await axios.post("http://localhost:3000/api/auth/logout", {}, { withCredentials: true });
      if (logout) logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      if (logout) logout();
      navigate("/login", { replace: true });
    }
  };

  // --- SUBMISSION ---
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append('username', formData.username);
      submitData.append('password', formData.password);
      submitData.append('firstName', formData.firstName);
      submitData.append('lastName', formData.lastName);
      submitData.append('email', formData.email); // <-- EXACT FIX: Sends email to backend
      submitData.append('contact', formData.contact);
      submitData.append('houseUnit', formData.houseUnit);
      submitData.append('street', formData.street);
      submitData.append('barangay', formData.barangay);
      submitData.append('city', formData.city);
      submitData.append('zipCode', formData.zipCode);

      if (profilePic) {
        submitData.append('profilePic', profilePic); 
      }

      await axios.put("http://localhost:3000/api/guardian/setup", submitData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      });

      // Force full reload to update AuthContext is_first_login status
      window.location.href = "/guardian/dashboard";

    } catch (error) {
      console.error("Setup Error:", error);
      alert(error.response?.data?.message || "Failed to complete setup.");
      setIsSubmitting(false);
    } 
  };

  // --- NAVIGATION LOGIC ---
  const handleNext = () => {
    // --- STEP 0 VALIDATION (Credentials) ---
    if (currentStep === 0) { 
      if (formData.username.startsWith("TEMP-") || formData.username.trim() === "") {
        setErrors({ username: "Please create a new, permanent username." });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrors({ confirmPassword: "Passwords do not match!" });
        return;
      }
      if (formData.password.length > 0 && formData.password.length < 8) {
        setErrors({ password: "Password must be at least 8 characters long." });
        return;
      }
    }

    // --- STEP 1 VALIDATION (Profile) ---
    if (currentStep === 1) {
      if (formData.email.startsWith("TEMP-") || formData.email.includes("placeholder.com") || formData.email.trim() === "") {
        setErrors({ email: "Please provide a valid, permanent email address." });
        return;
      }
    }

    // --- STEP 4 VALIDATION (Finish) ---
    if (currentStep === 4) { 
      if (!hasAgreed) {
        setErrors({ agreement: "You must agree to the Security Policies to finish." });
        return;
      }
      handleFinalSubmit();
      return;
    }
    
    // Proceed to next step if no errors
    if (currentStep < 4) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const ErrorMsg = ({ field }) => {
    return errors[field] ? (
      <span className="text-red-500 text-[11px] mt-1 ml-1 text-left w-full block font-medium">
        {errors[field]}
      </span>
    ) : null;
  };

  return (
    <div className="wave min-h-screen w-full flex justify-center items-center p-5 bg-fixed font-poppins">
      
      {/* --- CROPPER SUB-MODAL --- */}
      {showCropModal && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-[360px] flex flex-col items-center animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Crop Photo</h3>
            
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-inner">
              <AvatarEditor
                ref={editorRef}
                image={tempImage}
                width={200}
                height={200}
                border={20}
                borderRadius={100}
                color={[15, 23, 42, 0.5]}
                scale={zoom}
                rotate={0}
              />
            </div>

            <div className="flex items-center w-full gap-3 mt-5 mb-6 px-2">
              <span className="material-symbols-outlined text-slate-400 text-[18px]">zoom_out</span>
              <input 
                type="range" 
                min="1" max="3" step="0.01" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <span className="material-symbols-outlined text-slate-400 text-[18px]">zoom_in</span>
            </div>

            <div className="flex gap-3 w-full">
              <button type="button" className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors" onClick={() => { setShowCropModal(false); setTempImage(null); }}>
                Cancel
              </button>
              <button type="button" className="flex-1 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors" onClick={handleCropSave}>
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN CARD --- */}
      <div className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[550px] mx-auto my-10 relative z-10 sm:p-[30px] shadow-[0_10px_40px_rgba(0,0,0,0.08)]'>
        
        {/* TEMPORARY LOGOUT */}
        <button 
          onClick={handleTempLogout}
          className="absolute top-6 right-6 text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-[13px] font-bold cursor-pointer z-10"
          title="Logout"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Logout
        </button>

        <h1 className='text-left w-full mb-2'>
          Account Setup
        </h1>
        <p className='w-full mb-6 font-normal text-left text-[14px] text-slate-500'>
          Let's secure your profile and get you ready for the dashboard.
        </p>

        {/* --- PROGRESS DOTS CAROUSEL --- */}
        <div className="flex justify-center gap-2 mb-8 w-full"> 
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-500 ease-out ${
                currentStep === i 
                  ? 'w-8 bg-[#39a8ed]' 
                  : i < currentStep 
                    ? 'w-2 bg-[#bde0fe]' 
                    : 'w-2 bg-slate-200'
              }`} 
            />
          ))}
        </div>

        <form className="flex flex-col w-full" onSubmit={(e) => e.preventDefault()}>

          {/* ========================================== */}
          {/* STEP 0: Credentials                        */}
          {/* ========================================== */}
          {currentStep === 0 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Secure Your Account</p>
              <p className="text-[13px] text-slate-500 mb-5">Change your temporary assigned username and password to something secure.</p>

              <div className='flex flex-col w-full mb-5'>
                <FormInputRegistration
                  label="New Username"
                  name="username"
                  type='text'
                  placeholder="e.g. john_doe99"
                  className="form-input-modal"
                  value={formData.username}
                  onChange={handleInputChange}
                  error={errors.username}
                />
              </div>

              <div className='flex flex-col w-full mb-5 relative'>
                <FormInputRegistration
                  label="New Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Type new password"
                  className="form-input-modal pr-12"
                  value={formData.password}
                  onChange={handleInputChange}
                  error={errors.password}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[40px] text-slate-400 hover:text-blue-500 transition-colors focus:outline-none"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              <div className='flex flex-col w-full mb-5 relative'>
                <FormInputRegistration
                  label="Confirm Password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-type your password"
                  className="form-input-modal pr-12"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  error={errors.confirmPassword}
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-[40px] text-slate-400 hover:text-blue-500 transition-colors focus:outline-none"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* STEP 1: Profile Details                    */}
          {/* ========================================== */}
          {currentStep === 1 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Guardian Information</p>
              
              <div className='flex flex-col w-full mb-4'>
                <label className='text-cdark text-[13px] font-semibold mb-2'>
                  Profile Photo <span className='text-cbrand-blue ml-1 text-[12px]'>*</span>
                </label>

                <div className="flex flex-col items-center justify-center mb-2 mt-2">
                  <input type="file" ref={fileInputRef} accept="image/*" className='hidden' onChange={handleImageUpload} />
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                    <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-xl">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[40px] text-slate-300 group-hover:scale-110 transition-transform duration-300">add_a_photo</span>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="material-symbols-outlined text-white text-[24px]">edit</span>
                    </div>
                  </div>
                  <p className="text-slate-500 text-[12px] font-medium mt-3">
                    {previewUrl ? 'Click to change photo' : 'Click to select photo'}
                  </p>
                </div>
              </div>

              <div className='flex w-full h-auto gap-4'>
                <div className='flex flex-col w-full mb-1'>
                  <FormInputRegistration label="First Name" name="firstName" type='text' placeholder="John" className="form-input-modal" value={formData.firstName} onChange={handleInputChange} />
                </div>
                <div className='flex flex-col w-full mb-1'>
                  <FormInputRegistration label="Last Name" name="lastName" type='text' placeholder="Doe" className="form-input-modal" value={formData.lastName} onChange={handleInputChange} />
                </div>
              </div>

              <div className='flex flex-col w-full mb-2'>
                <FormInputRegistration label="Email Address" name="email" type='email' placeholder="Johndoe@gmail.com" className='registration-input' value={formData.email} onChange={handleInputChange} error={errors.email} />
              </div>

              <div className='flex flex-col w-full mb-2'>
                <FormInputRegistration label="Phone Number" name="contact" type='text' placeholder="09*********" className='registration-input' value={formData.contact} onChange={handleInputChange} />
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* STEP 2: Address Details                    */}
          {/* ========================================== */}
          {currentStep === 2 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Address Details</p>

              <div className='flex w-full h-auto gap-4'>
                <div className='flex flex-col w-full mb-5'>
                  <FormInputRegistration label="House Unit" name="houseUnit" type='text' placeholder="117" className='registration-input' value={formData.houseUnit} onChange={handleInputChange} />
                </div>
                <div className='flex flex-col w-full mb-5'>
                  <FormInputRegistration label="Street" name="street" type='text' placeholder="Hope Street" className='registration-input' value={formData.street} onChange={handleInputChange} />
                </div>
              </div>
              
              <div className='flex w-full h-auto gap-4'>
                <div className='flex flex-col w-full mb-5'>
                  <FormInputRegistration label="Barangay" name="barangay" type='text' placeholder="Helin Hills" className='registration-input' value={formData.barangay} onChange={handleInputChange} />
                </div>
                <div className='flex flex-col w-full mb-5'>
                  <FormInputRegistration label="City" name="city" type='text' placeholder="Quezon City" className='registration-input' value={formData.city} onChange={handleInputChange} />
                </div>
              </div>

              <div className='flex flex-col w-full mb-5'>
                <FormInputRegistration label="Zip Code" name="zipCode" type='text' placeholder="1153" className='registration-input' value={formData.zipCode} onChange={handleInputChange} />
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* STEP 3: Facial Recognition                 */}
          {/* ========================================== */}
          {currentStep === 3 && (
            <div className="text-center py-4 animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom text-left'>Facial Biometrics</p>
              
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-5 text-indigo-500 shadow-inner mt-4">
                <span className="material-symbols-outlined text-[48px]">face_retouching_natural</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Facial Recognition Setup</h2>
              <p className="text-slate-500 text-[13px] leading-relaxed mb-6 px-4">
                (We will wire up the camera module here shortly! For now, proceed to the next step to confirm your setup.)
              </p>
            </div>
          )}

          {/* ========================================== */}
          {/* STEP 4: Terms & Conditions & Finish        */}
          {/* ========================================== */}
          {currentStep === 4 && (
            <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
              <p className='border-bottom-custom'>Terms & Conditions</p>
              <p className="text-[13px] text-slate-500 mb-5">Please read and agree to our policies before finalizing your account.</p>
              
              {/* Polished T&C Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 h-48 overflow-y-auto custom-scrollbar text-[12px] text-slate-600 mb-4 leading-relaxed shadow-inner">
                <strong className="text-slate-800 text-[14px] block mb-2">LuMINI Guardian Security & Privacy Agreement</strong>
                <p className="mb-3">Welcome to the LuMINI Student Dismissal & Safety System. Before finalizing your account, please agree to the following policies:</p>
                <ol className="list-decimal pl-4 space-y-2 mb-2">
                  <li><strong>Information Accuracy:</strong> You certify that all personal information and verification documents provided are true, accurate, and up-to-date.</li>
                  <li><strong>Account Security:</strong> You are strictly responsible for maintaining the confidentiality of your login credentials. Sharing your account access with unauthorized individuals compromises student safety and is strictly prohibited.</li>
                  <li><strong>Facial Data & Privacy:</strong> By proceeding, you consent to the secure collection, storage, and processing of your facial biometric data. This data is used exclusively for identity verification during student pick-up and drop-off events, in strict compliance with the Data Privacy Act of 2012.</li>
                  <li><strong>System Usage:</strong> Your access to the LuMINI system is granted solely to monitor and ensure the safety of your linked student(s). Any misuse of the platform may result in immediate account suspension.</li>
                </ol>
              </div>

              {/* Exact Match Checkbox UI */}
              <div className='flex items-center gap-3 bg-blue-50/30 p-4 rounded-xl border border-blue-100 mb-2 text-left transition-colors hover:bg-blue-50/50'>
                <input 
                  type="checkbox" 
                  id="userAgreement" 
                  className="w-[18px] h-[18px] cursor-pointer accent-blue-600 shrink-0"
                  checked={hasAgreed}
                  onChange={(e) => {
                    setHasAgreed(e.target.checked);
                    if (e.target.checked) setErrors(prev => ({ ...prev, agreement: null }));
                  }}
                />
                <label htmlFor="userAgreement" className="text-[13px] text-slate-800 font-medium cursor-pointer select-none leading-snug">
                  I confirm that all provided information is accurate and I agree to the Security Policies.
                </label>
              </div>
              <ErrorMsg field="agreement" />

            </div>
          )}

          {/* --- ACTION BUTTONS --- */}
          <div className="flex flex-row w-full mt-6 gap-[15px]">
            <button 
              type="button" 
              className="btn btn-outline flex-1 h-12 rounded-3xl font-semibold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              Back
            </button>
            <button 
                type="button" 
                className={`btn btn-primary flex-1 h-12 rounded-3xl font-semibold text-[15px] transition-all flex items-center justify-center gap-2 
                  ${currentStep === 4 && !hasAgreed ? 'opacity-70 grayscale-[20%]' : ''}`}
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : currentStep === 4 ? 'Finish Setup' : 'Continue'} 
                {currentStep === 4 && !isSubmitting && <span className="material-symbols-outlined text-[18px]">done_all</span>}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}