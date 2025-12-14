import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../../../styles/guardian-registration.css' // Ensuring your CSS is loaded

export default function GuardianRegistration() {
  const [phase, setPhase] = useState('invitation'); // 'invitation' | 'registration'
  const [opacity, setOpacity] = useState(1); // For fade transitions
  
  // --- INVITATION STATE ---
  const [code, setCode] = useState(Array(6).fill(""));
  const inputRefs = useRef([]); 

  // --- REGISTRATION FORM STATE ---
  const [currentStep, setCurrentStep] = useState(0);
  const [preview, setPreview] = useState(null);
  
  const [formData, setFormData] = useState({
    username: '', password: '', confirmPassword: '',
    photo: null, firstname: '', lastname: '', email: '', phone: '',
    relationship: 'Guardian', childName: 'Mia Chen',
    houseUnit: '', street: '', barangay: '', city: '', zipcode: ''
  });

  // --- HANDLERS: INVITATION PHASE ---

  const handleCodeChange = (e, index) => {
    // 1. Get value from Event
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // 2. Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleCodeKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleSubmitCode = () => {
    if (code.join("").length === 6) {
      setOpacity(0); // Fade out
      setTimeout(() => {
        setPhase('registration'); // Switch View
        setTimeout(() => setOpacity(1), 50); // Fade in
      }, 300);
    } else {
      alert("Please enter a valid 6-character code.");
    }
  };

  // --- HANDLERS: REGISTRATION FORM ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, photo: file }));
      setPreview(URL.createObjectURL(file));
    }
  };

  const removeFile = (e) => {
    e.preventDefault();
    setFormData(prev => ({ ...prev, photo: null }));
    setPreview(null);
  };

  // Simple validation checks
  const validateStep = () => {
    const { username, password, confirmPassword, firstname, lastname, email, phone, houseUnit, street, barangay, city, zipcode } = formData;
    
    if (currentStep === 0) return username && password && confirmPassword;
    if (currentStep === 1) return firstname && lastname && email && phone; 
    // Step 2 is read-only, so always true
    if (currentStep === 3) return houseUnit && street && barangay && city && zipcode;
    return true; 
  };

  const handleNext = () => {
    if (!validateStep()) {
      alert("Please fill out all required fields.");
      return;
    }
    if (currentStep < 3) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const handleFinalSubmit = (e) => {
    e.preventDefault();
    console.log("Submitting Form Data:", formData);
    alert("Account Created Successfully!");
    // Navigate to dashboard or login here
  };

  // Helper Titles for each Step
  const stepTitles = ["Account Setup", "Guardian Information", "Relationship to Student", "Address Details"];

  return (
    <div className="wave min-h-screen w-full flex justify-center items-center p-5">

      {phase === 'invitation' && (
        <div 
          className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[500px] mx-auto my-10 relative z-10 transition-opacity duration-300 ease-in-out sm:p-[25px]'
          style={{ opacity: opacity }}
        >
          <h1 className='guardian-registration-header-text mb-2.5 text-left'>
            Enter Invitation Code
          </h1>
          <p className='guardian-registration-description-text text-clight text-left text-[14px]'>
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
                onChange={e => handleCodeChange(e, index)} // Corrected Event passing
                onKeyDown={e => handleCodeKeyDown(e, index)} 
                onFocus={e => e.target.select()}
              />
            ))}
          </div>

          <button 
            type='button' 
            className='btn btn-primary button flex flex-none justify-center items-center w-full h-12 border-none mt-7 rounded-[30px]' 
            id='submitCodeBtn' 
            onClick={handleSubmitCode}
          >
            Submit
          </button>

          <div className='flex flex-row justify-center items-center mt-[15px] border-none p-0 gap-1.5 w-full'>
            <span className='text-clight text-[14px]'>
              Already have an account?
            </span>
            <Link to='/login' className='login-link whitespace-nowrap'>Sign In</Link>
          </div>
        </div>
      )}

      {phase === 'registration' && (
        <div 
          className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[500px] mx-auto my-10 relative z-10 transition-opacity duration-300 ease-in-out sm:p-[25px]'
          style={{ opacity: opacity }}
        >
          <h1 className='guardian-registration-header-text'>Create Account</h1>
          <p className='guardian-registration-description-text'>
            Please fill out the form to create your guardian account.
          </p>

          {/* Step Indicator */}
          <div className="step-indicator">
            Step {currentStep + 1} of 4
          </div>

          <form className="guardian-registration-form w-full" onSubmit={handleFinalSubmit}>
            
            <p className="guardian-registration-description-text enlarged-text">
              {stepTitles[currentStep]}
            </p>

            {/* --- STEP 1: ACCOUNT SETUP --- */}
            {currentStep === 0 && (
              <div className="form-step fade-in">
                <InputGroup label="Username" name="username" placeholder="shizuka123" value={formData.username} onChange={handleInputChange} />
                <InputGroup label="Password" name="password" type="password" placeholder="••••••" value={formData.password} onChange={handleInputChange} />
                <InputGroup label="Confirm Password" name="confirmPassword" type="password" placeholder="••••••" value={formData.confirmPassword} onChange={handleInputChange} />
              </div>
            )}

            {/* --- STEP 2: GUARDIAN INFORMATION --- */}
            {currentStep === 1 && (
              <div className="form-step fade-in">
                {/* Photo Upload */}
                <div className="lbl-input-wrapper">
                  <label className="guardian-registration-label">
                    Profile Photo <span className="required">*</span>
                  </label>
                  <div className="file-upload-wrapper relative">
                    <label htmlFor="profile-upload" className="file-upload-container flex flex-col justify-center items-center h-[140px] w-full border border-gray-200 bg-slate-50 rounded-xl cursor-pointer hover:bg-white hover:border-blue-400 overflow-hidden">
                      {!preview ? (
                        <div id="default-upload-view" className="flex flex-col items-center text-blue-400">
                          {/* Upload Icon SVG */}
                          <svg className="upload-icon-svg mb-2" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                          </svg>
                          <span className="upload-text text-xs font-medium">Tap to upload photo</span>
                        </div>
                      ) : (
                        <img src={preview} alt="Preview" className="image-preview w-full h-full object-contain bg-slate-50" />
                      )}
                      <input type="file" id="profile-upload" accept="image/*" className="hidden-file-input hidden" onChange={handleFileChange} />
                    </label>
                    {preview && (
                      <button onClick={removeFile} className="remove-file-btn absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center font-bold shadow-md hover:bg-red-600">
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="multiple-input-wrapper flex gap-4">
                  <InputGroup label="Firstname" name="firstname" placeholder="Shizuka" value={formData.firstname} onChange={handleInputChange} />
                  <InputGroup label="Lastname" name="lastname" placeholder="Chen" value={formData.lastname} onChange={handleInputChange} />
                </div>
                <InputGroup label="Email Address" name="email" type="email" placeholder="shizuka@email.com" value={formData.email} onChange={handleInputChange} />
                <InputGroup label="Phone Number" name="phone" type="tel" placeholder="098..." value={formData.phone} onChange={handleInputChange} />
              </div>
            )}

            {/* --- STEP 3: RELATIONSHIP --- */}
            {currentStep === 2 && (
              <div className="form-step fade-in">
                <InputGroup label="Guardian (Autofilled)" value={formData.relationship} readOnly />
                <InputGroup label="Child's Name (Autofilled)" value={formData.childName} readOnly />
              </div>
            )}

            {/* --- STEP 4: ADDRESS --- */}
            {currentStep === 3 && (
              <div className="form-step fade-in">
                <div className="multiple-input-wrapper flex gap-4">
                  <InputGroup label="House Unit" name="houseUnit" placeholder="32F" value={formData.houseUnit} onChange={handleInputChange} />
                  <InputGroup label="Street" name="street" placeholder="Cornelia" value={formData.street} onChange={handleInputChange} />
                </div>
                <div className="multiple-input-wrapper flex gap-4">
                  <InputGroup label="Brgy/Village" name="barangay" placeholder="171" value={formData.barangay} onChange={handleInputChange} />
                  <InputGroup label="City" name="city" placeholder="Caloocan" value={formData.city} onChange={handleInputChange} />
                </div>
                <InputGroup label="Zip Code" name="zipcode" placeholder="1400" value={formData.zipcode} onChange={handleInputChange} />
              </div>
            )}

            {/* --- NAVIGATION BUTTONS --- */}
            <div className="button-wrapper flex gap-4 mt-5">
              <button 
                type="button" 
                className="button back-button" 
                onClick={currentStep === 0 ? () => { setPhase('invitation'); setCode(Array(6).fill("")); } : handleBack}
              >
                Back
              </button>
              
              {currentStep === 3 ? (
                <button type="submit" className="button next-button">
                  Finish
                </button>
              ) : (
                <button type="button" className="button next-button" onClick={handleNext}>
                  Next
                </button>
              )}
            </div>

          </form>
        </div>
      )}
    </div>
  );
}

// --- REUSABLE COMPONENT FOR INPUTS ---
// Used to keep the main code clean while applying your specific CSS classes
const InputGroup = ({ label, name, type = "text", placeholder, value, onChange, readOnly = false }) => (
  <div className="lbl-input-wrapper w-full mb-5">
    <label className="guardian-registration-label block mb-2 text-[13px] font-semibold">
      {label} {!readOnly && <span className="required text-blue-400">*</span>}
    </label>
    <input 
      type={type} 
      name={name} 
      placeholder={placeholder} 
      value={value} 
      onChange={onChange} 
      readOnly={readOnly}
      className={`guardian-registration-input w-full h-12 px-4 border rounded-xl ${readOnly ? 'bg-slate-50 text-gray-400 cursor-not-allowed' : ''}`}
    />
  </div>
);