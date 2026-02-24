import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../styles/auth/registration.css'
import FormInputRegistration from '../../components/FormInputRegistration';
import { validateRegistrationStep } from '../../utils/validation';
import AvatarEditor from "react-avatar-editor";
import SuccessModal from '../../components/SuccessModal'; // <-- NEW: Imported Success Modal

export default function ParentRegistration() {
  const navigate = useNavigate();

  // Phase & Steps States //
  const [phase, setPhase] = useState('invitation');
  const [currentStep, setCurrentStep] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [code, setCode] = useState(Array(6).fill(""));
  
  // Refs & State for Errors //
  const inputRefs = useRef([]); 
  const [errors, setErrors] = useState({});
  
  // Profile Image State //
  const [profileImage, setProfileImage] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Student Name //
  const [studentInfo, setStudentInfo] = useState(null);

  // User Agreement State //
  const [hasAgreed, setHasAgreed] = useState(false);

  // Password Visibility States //
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- NEW: Success Modal State ---
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
    relationship: 'Parent', 
    houseUnit: '',
    street: '',
    barangay: '',
    city: '',
    zipCode: '',
  });

  // Validation Function //
  const validateStep = (step) => {
    if (step === 4) return true; 

    const newErrors = validateRegistrationStep(step, formData, profileImage, 'user');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- CROPPER & IMAGE HANDLERS ---
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
          const croppedFile = new File([blob], "parent_photo.jpg", { type: "image/jpeg" });
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

  // --- HANDLE CHANGE (WITH PHONE NUMBER LOGIC) ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'phoneNumber') {
      finalValue = finalValue.replace(/\D/g, '');

      if (finalValue.startsWith('639')) {
        finalValue = '0' + finalValue.substring(2);
      }

      if (!finalValue.startsWith('09')) {
        finalValue = '09';
      }

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
  
  // 6 Digit Code Handlers //
  const handleCodeChange = (e, index) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode); 

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleCodeKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!pastedData) return;

    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      if (pastedData[i]) {
        newCode[i] = pastedData[i];
      }
    }
    setCode(newCode);

    const nextEmptyIndex = newCode.findIndex(val => val === "");
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    if (inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex].focus();
    }
  };

  const handleSubmitCode = async () => {
  const invitationCode = code.join("");
    if (invitationCode.length === 6) {
      try {
        const response = await axios.post('http://localhost:3000/api/invitations/validate', { 
          code: invitationCode 
        });

        setStudentInfo(response.data.fullName);
        setOpacity(0); 
        setTimeout(() => {
          setPhase('registration');
          setTimeout(() => setOpacity(1), 50);
        }, 300);
        
      } catch (error) {
        const msg = error.response?.data?.msg || "Invalid or expired code.";
        alert(msg);
      }
    } else {
      alert("Please enter a valid 6-character code.");
    }
  };

  // Handle Submit Form for Registration //
  const handleSubmitForm = async () => {
    const data = new FormData();
      data.append('username', formData.username);
      data.append('password', formData.password);
      data.append('invitation_code', code.join(""));
      data.append('email', formData.email);
      data.append('first_name', formData.firstName);
      data.append('last_name', formData.lastName);
      data.append('phone_number', formData.phoneNumber);
      data.append('relationship', formData.relationship);
      data.append('address', `${formData.houseUnit}, ${formData.street}, ${formData.barangay}, ${formData.city}, ${formData.zipCode}`);
    
    if (profileImage) {
      data.append('profile_photo', profileImage); 
    }

    console.log("Sending Form Data..."); 

    try {
      await axios.post('http://localhost:3000/api/parents', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // --- NEW: Trigger Success Modal instead of instant navigation ---
      setSuccessMessage("Your account has been successfully created! You are now ready to log in and monitor your child.");
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error('Error registering:', error);
      if (error.response && error.response.data && error.response.data.errors) {
        alert(`Registration Failed: ${error.response.data.errors[0].msg}`);
      } else {
        alert("Registration failed. Please try again.");
      }
    }
  };

  // --- NEW: Handler for closing the success modal ---
  const handleCloseSuccess = () => {
    setIsSuccessModalOpen(false);
    navigate('/login'); // Navigate ONLY after they click close!
  };
  
  // Form Button Logic for Steps //
  const handleNext = () => {
    const isValid = validateStep(currentStep);

    if (isValid) {
      if (currentStep < 4) { 
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
    <div className="wave min-h-screen w-full flex justify-center items-center p-5">

      {/* --- NEW: RENDER SUCCESS MODAL --- */}
      <SuccessModal 
        isOpen={isSuccessModalOpen}
        onClose={handleCloseSuccess}
        message={successMessage}
      />

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
      
      {phase === 'invitation' && (
        <div className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[500px] mx-auto my-10 relative z-10 opacity-0 sm:p-[25px]' 
        style={{ opacity: opacity }}>

          <h1 className='mb-2.5 text-left'>
            Enter Invitation Code
          </h1>
          <p className='text-clight text-left text-[14px]'>
            Enter the invitation code provided by your child's teacher to create your account.
          </p>

          <div className='code-inputs-wrapper flex justify-between gap-2 w-full my-[30px] mb-0 sm:gap-[5px]'>
            {code.map((data, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                maxLength="1"
                className="code-box"
                value={data}
                onChange={e => handleCodeChange(e, index)}
                onKeyDown={e => handleCodeKeyDown(e, index)} 
                onPaste={handlePaste} 
                onFocus={e => e.target.select()}
              />
            ))}
          </div>

          <button type='submit' className='btn btn-primary button flex flex-none justify-center items-center w-full h-12 border-none mt-7 rounded-[30px]' id='submitCodeBtn' onClick={handleSubmitCode}>
            Submit
          </button>

          <div className='flex flex-row justify-center items-center mt-[15px] border-none p-0 gap-1.5 w-full'>
            <span className='text-clight text-[14px]'>
              Already have an account?
            </span>
            <Link to='/login' className='login-link whitespace-nowrap'>Sign In</Link>
          </div>
        </div>
        )
      }

      {phase === 'registration' && (
        <div className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[500px] mx-auto my-10 relative z-10 opacity-0 sm:p-[25px]'
        style={{ opacity: opacity }}>
          <h1 className='text-left w-full mb-2'>
            Create Account
          </h1>
          <p className='w-full mb-4 font-normal text-left'>
            Please fill out the form to create your parent account.
          </p>

          {/* --- PROGRESS DOTS CAROUSEL (CENTERED) --- */}
          <div className="flex justify-center gap-2 mb-6 w-full"> 
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

          <form className="flex flex-col w-full" id="mainRegistrationForm" action="#" method="POST">

            {currentStep === 0 && (
              <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
                <p className='border-bottom-custom'>Account Setup</p>

                <div className='flex flex-col w-full mb-5'>
                  <FormInputRegistration
                    label="Username"
                    name="username"
                    type='text'
                    className="form-input-modal"
                    placeholder="e.g Parent_Juan"
                    value={formData.username}
                    onChange={handleChange}
                    error={errors.username}
                    required={true}
                  />
                </div>

                <div className='flex flex-col w-full mb-5 relative'>
                  <FormInputRegistration
                    label="Password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input-modal pr-12"
                    placeholder="Type your password here"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    required={true}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-[40px] text-slate-400 hover:text-blue-500 transition-colors focus:outline-none"
                    title={showPassword ? "Hide Password" : "Show Password"}
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
                    className="form-input-modal pr-12" 
                    placeholder="Re-type your password here"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    required={true}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-[40px] text-slate-400 hover:text-blue-500 transition-colors focus:outline-none"
                    title={showConfirmPassword ? "Hide Password" : "Show Password"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
                <p className='border-bottom-custom'>Parent Information</p>
                <div className='flex flex-col w-full mb-4'>
                  <label htmlFor="profileUpload" className='text-cdark text-[13px] font-semibold mb-2'>
                    Profile Photo <span className='text-cbrand-blue ml-1 text-[12px]'>*</span>
                  </label>

                  <div className="flex flex-col items-center justify-center mb-2 mt-2">
                    <input type="file" ref={fileInputRef} accept="image/*" className='hidden' onChange={handleImageUpload} />
                    <div 
                      className="relative group cursor-pointer"
                      onClick={() => fileInputRef.current.click()}
                    >
                      <div className={`w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-xl ${errors.profileImage ? 'ring-2 ring-red-500' : ''}`}>
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
                  <ErrorMsg field="profileImage" />
                </div>

                <div className='flex w-full h-auto gap-4'>
                  <div className='flex flex-col w-full mb-1'>
                    <FormInputRegistration
                      label="First Name" name="firstName" type='text' placeholder="John" className="form-input-modal"
                      value={formData.firstName} onChange={handleChange} error={errors.firstName} required={true}
                    />
                  </div>
                  <div className='flex flex-col w-full mb-1'>
                    <FormInputRegistration
                      label="Last Name" name="lastName" type='text' placeholder="Doe" className="form-input-modal"
                      value={formData.lastName} onChange={handleChange} error={errors.lastName} required={true}
                    />
                  </div>
                </div>

                <div className='flex flex-col w-full mb-2'>
                  <FormInputRegistration
                      label="Email Address" name="email" type='text' className="form-input-modal" placeholder="Johndoe@gmail.com"
                      value={formData.email} onChange={handleChange} error={errors.email} required={true}
                    />
                </div>

                <div className='flex flex-col w-full mb-2'>
                  <FormInputRegistration
                      label="Phone Number" name="phoneNumber" type='text' className="form-input-modal" placeholder="09*********"
                      value={formData.phoneNumber} onChange={handleChange} error={errors.phoneNumber} required={true}
                    />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
                <p className='border-bottom-custom'>Relationship to the Student</p>
                <div className='flex flex-col w-full mb-5'>
                  <FormInputRegistration
                      label="Relationship" name="relationship" className="form-input-modal" value={formData.relationship} readOnly={true}
                    />
                </div>
                <div className='flex flex-col w-full mb-5'>
                  <FormInputRegistration
                    label="Child's name" name="childName" className="form-input-modal" value={studentInfo ? `${studentInfo}` : "Loading..."} readOnly={true}
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
                <p className='border-bottom-custom'>Address Details</p>

                <div className='flex w-full h-auto gap-4'>
                  <div className='flex flex-col w-full mb-5'>
                    <FormInputRegistration
                      label="House Unit" name="houseUnit" type='text' placeholder="117" className='registration-input'
                      value={formData.houseUnit} onChange={handleChange} error={errors.houseUnit} required={true}
                    />
                  </div>
                  <div className='flex flex-col w-full mb-5'>
                    <FormInputRegistration
                      label="Street" name="street" type='text' placeholder="Hope Street" className='registration-input'
                      value={formData.street} onChange={handleChange} error={errors.street} required={true}
                    />
                  </div>
                </div>
                
                <div className='flex w-full h-auto gap-4'>
                  <div className='flex flex-col w-full mb-5'>
                    <FormInputRegistration
                      label="Barangay" name="barangay" type='text' placeholder="Helin Hills" className='registration-input'
                      value={formData.barangay} onChange={handleChange} error={errors.barangay} required={true}
                    />
                  </div>
                  <div className='flex flex-col w-full mb-5'>
                    <FormInputRegistration
                      label="City" name="city" type='text' placeholder="Quezon City" className='registration-input'
                      value={formData.city} onChange={handleChange} error={errors.city} required={true}
                    />
                  </div>
                </div>

                <div className='flex flex-col w-full mb-5'>
                    <FormInputRegistration
                      label="Zip Code" name="zipCode" type='text' placeholder="1153" className='registration-input'
                      value={formData.zipCode} onChange={handleChange} error={errors.zipCode} required={true}
                    />
                  </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
                <p className='border-bottom-custom'>Terms and Conditions</p>
                <p className='text-slate-500 text-[13px] mb-3'>Please read the user agreement carefully before completing your registration.</p>
                
                <div className='bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 h-[200px] overflow-y-auto custom-scrollbar text-[12px] text-slate-600 leading-relaxed shadow-inner'>
                  <strong className="text-slate-800 text-[14px] block mb-2">LuMINI Parent/Guardian User Agreement</strong>
                  <p className="mb-2">
                    Welcome to the LuMINI Student Dismissal & Safety System. By registering an account and linking to a student, you agree to comply with the following terms and conditions:
                  </p>
                  <ol className="list-decimal pl-4 mb-2 space-y-1">
                    <li><strong>Accuracy of Information:</strong> You certify that all information provided during registration is accurate and that you are the legal parent or authorized guardian of the linked student.</li>
                    <li><strong>Account Security:</strong> You are strictly responsible for maintaining the confidentiality of your login credentials and any One-Time Passwords (OTPs). Do not share your access with unauthorized individuals.</li>
                    <li><strong>System Usage:</strong> This system is provided solely to monitor your child's campus entry, exit, and dismissal status. Any misuse of the platform may result in account termination.</li>
                    <li><strong>Data Privacy:</strong> Your personal data and your child's data will be stored securely and used strictly for school safety and administrative purposes in accordance with the Data Privacy Act.</li>
                  </ol>
                  <p>
                    By checking the box below, you acknowledge that you have read, understood, and agree to be bound by these terms.
                  </p>
                </div>

                <div className='flex items-center gap-2 mt-2 mb-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100'>
                  <input 
                    type="checkbox" 
                    id="userAgreement" 
                    className="w-[18px] h-[18px] cursor-pointer accent-blue-600"
                    checked={hasAgreed}
                    onChange={(e) => {
                      setHasAgreed(e.target.checked);
                      if (e.target.checked) setErrors(prev => ({ ...prev, agreement: null }));
                    }}
                  />
                  <label htmlFor="userAgreement" className="text-[13px] text-slate-800 font-medium cursor-pointer select-none">
                    I have read and agree to the User Agreement
                  </label>
                </div>
                <ErrorMsg field="agreement" />

              </div>
            )}

            <div className="flex flex-row w-full mt-4 gap-[15px]">
              <button 
                type="button" 
                className="btn btn-outline flex-1 h-12 rounded-3xl font-semibold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={handleBack}
                disabled={currentStep === 0}>
                  Back
              </button>
              
              <button 
                  type="button" 
                  className={`btn btn-primary flex-1 h-12 rounded-3xl font-semibold text-[15px] transition-all ${currentStep === 4 && !hasAgreed ? 'opacity-70 grayscale-[20%]' : ''}`} 
                  onClick={handleNext}
                >
                  {currentStep === 4 ? 'Complete Registration' : 'Next'} 
              </button>
            </div>
          </form>
          
        </div>
        )
      }

    </div>
  );
}