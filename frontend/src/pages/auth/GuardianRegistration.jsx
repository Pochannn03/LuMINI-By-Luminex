import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../styles/auth/registration.css'
import FormInputRegistration from '../../components/FormInputRegistration';
import { validateRegistrationStep } from '../../utils/validation';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function GuardianRegistration() {
  const navigate = useNavigate();

  const [phase, setPhase] = useState('invitation');
  const [currentStep, setCurrentStep] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [code, setCode] = useState(Array(6).fill(""));
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  
  const inputRefs = useRef([]); 
  const [errors, setErrors] = useState({});
  
  const [profileImage, setProfileImage] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const [studentInfo, setStudentInfo] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',     
    lastName: '',      
    email: '',
    phoneNumber: '',  
    relationship: 'Guardian', 
    houseUnit: '',
    street: '',
    barangay: '',
    city: '',
    zipCode: '',
  });

  const validateStep = (step) => {
    const newErrors = validateRegistrationStep(step, formData, profileImage, 'user');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setErrors(prev => ({ ...prev, profileImage: null }));
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target.result);
      };
      reader.readAsDataURL(file);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
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

  // UPDATED: Now verifies with the backend before switching views
  const handleSubmitCode = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      alert("Please enter a valid 6-character code.");
      return;
    }

    setIsVerifyingCode(true);
    try {
      // Talking to your actual server now
      const response = await axios.get(`${BACKEND_URL}/api/verify-invitation/${fullCode}`);
      
      if (response.data.success) {
        setStudentInfo(response.data.student); // Save who they are picking up
        setOpacity(0);
        setTimeout(() => {
          setPhase('registration');
          setTimeout(() => setOpacity(1), 50);
        }, 300);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Invalid or expired invitation code.");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSubmitForm = async () => {
    if (!validateStep(3)) return;

    const data = new FormData();
    data.append('username', formData.username);
    data.append('password', formData.password);
    data.append('email', formData.email);
    data.append('first_name', formData.firstName);
    data.append('last_name', formData.lastName);
    data.append('phone_number', formData.phoneNumber);
    data.append('relationship', formData.relationship);
    data.append('address', `${formData.houseUnit}, ${formData.street}, ${formData.barangay}, ${formData.city}, ${formData.zipCode}`);
    data.append('invitation_code', code.join("")); // Pass the verified code back
      
    if (profileImage) {
      data.append('profile_photo', profileImage); 
    }

    try {
      // Updated to use BACKEND_URL
      await axios.post(`${BACKEND_URL}/api/guardian-register`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate('/login');
    } catch (error) {
      console.error('Error registering:', error);
      alert(error.response?.data?.message || "Registration failed. Please try again.");
    }
  };
  
  const handleNext = () => {
    const isValid = validateStep(currentStep);
    if (isValid) {
      if (currentStep < 3) {
        setCurrentStep((prev) => prev + 1);
      } else if (currentStep === 3) {
        handleSubmitForm();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="wave min-h-screen w-full flex justify-center items-center p-5">
      
      {phase === 'invitation' && (
        <div className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[500px] mx-auto my-10 relative z-10 sm:p-[25px]' 
        style={{ opacity: opacity, transition: 'opacity 0.3s ease' }}>

          <h1 className='mb-2.5 text-left'>Enter Invitation Code</h1>
          <p className='text-clight text-left text-[14px]'>
            Enter the invitation code provided by the child's parent or teacher.
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
                onFocus={e => e.target.select()}
                disabled={isVerifyingCode}
              />
            ))}
          </div>

          <button type='button' className='btn btn-primary flex justify-center items-center w-full h-12 border-none mt-7 rounded-[30px]' onClick={handleSubmitCode} disabled={isVerifyingCode}>
            {isVerifyingCode ? "Verifying..." : "Submit"}
          </button>

          <div className='flex flex-row justify-center items-center mt-[15px] border-none p-0 gap-1.5 w-full'>
            <span className='text-clight text-[14px]'>Already have an account?</span>
            <Link to='/login' className='login-link whitespace-nowrap'>Sign In</Link>
          </div>
        </div>
      )}

      {phase === 'registration' && (
        <div className='main-container flex flex-col items-start bg-white p-10 rounded-3xl w-[90%] max-w-[500px] mx-auto my-10 relative z-10 sm:p-[25px]'
        style={{ opacity: opacity, transition: 'opacity 0.3s ease' }}>
          <h1 className='text-left w-full mb-2'>Create Account</h1>
          <p className='w-full mb-4 font-normal text-left text-clight'>
            Registering as Guardian for <strong>{studentInfo?.first_name} {studentInfo?.last_name}</strong>.
          </p>

          <div className='inline-block py-1.5 px-3.5 rounded-[50px] mb-4 bg-blue-50'>
            <span className='text-cbrand-blue text-[11px] font-bold uppercase'>Step {currentStep + 1} of 4</span>
          </div>

          <form className="flex flex-col w-full" onSubmit={(e) => e.preventDefault()}>

            {currentStep === 0 && (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                <p className='border-bottom-custom'>Account Setup</p>
                <FormInputRegistration label="Username" name="username" placeholder="johndoe12" value={formData.username} onChange={handleChange} error={errors.username} required={true} />
                <FormInputRegistration label="Password" name="password" type='password' placeholder="********" value={formData.password} onChange={handleChange} error={errors.password} required={true} />
                <FormInputRegistration label="Confirm Password" name="confirmPassword" type='password' placeholder="********" value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} required={true} />
              </div>
            )}

            {currentStep === 1 && (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                <p className='border-bottom-custom'>Guardian Information</p>
                <div className='flex flex-col w-full mb-4'>
                  <label className='text-cdark text-[13px] font-semibold mb-2'>Profile Photo <span className='text-cbrand-blue ml-1'>*</span></label>
                  <div className='file-upload-wrapper'>
                    <div className='file-upload-container' onClick={() => fileInputRef.current.click()}>
                      {!previewUrl ? (
                        <div className='flex flex-col items-center text-cbrand-blue'>
                          <span className="material-symbols-outlined text-[32px] mb-2">photo_camera</span>
                          <span className='text-[12px] font-medium'>Tap to Upload Photo</span>
                        </div>
                      ) : (
                        <img src={previewUrl} alt="Preview" className="image-preview" />
                      )}
                      <input type="file" ref={fileInputRef} accept="image/*" className='hidden' onChange={handleImageUpload} />
                    </div>
                    {previewUrl && <button type='button' onClick={removeImage} className='remove-file-btn'>✕</button>}
                  </div>
                  {errors.profileImage && <span className="text-red-500 text-[11px] mt-1">{errors.profileImage}</span>}
                </div>

                <div className='flex w-full gap-4'>
                  <FormInputRegistration label="First Name" name="firstName" placeholder="John" value={formData.firstName} onChange={handleChange} error={errors.firstName} required={true} />
                  <FormInputRegistration label="Last Name" name="lastName" placeholder="Doe" value={formData.lastName} onChange={handleChange} error={errors.lastName} required={true} />
                </div>
                <FormInputRegistration label="Email Address" name="email" placeholder="johndoe@email.com" value={formData.email} onChange={handleChange} error={errors.email} required={true} />
                <FormInputRegistration label="Phone Number" name="phoneNumber" placeholder="09*********" value={formData.phoneNumber} onChange={handleChange} error={errors.phoneNumber} required={true} />
              </div>
            )}

            {currentStep === 2 && (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                <p className='border-bottom-custom'>Relationship</p>
                <FormInputRegistration label="Relationship" name="relationship" value={formData.relationship} readOnly={true} />
                <FormInputRegistration label="Child's name" name="childName" value={`${studentInfo?.first_name} ${studentInfo?.last_name}`} readOnly={true} />
              </div>
            )}

            {currentStep === 3 && (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                <p className='border-bottom-custom'>Address Details</p>
                <div className='flex w-full gap-4'>
                  <FormInputRegistration label="House Unit" name="houseUnit" placeholder="117" value={formData.houseUnit} onChange={handleChange} error={errors.houseUnit} required={true} />
                  <FormInputRegistration label="Street" name="street" placeholder="Hope Street" value={formData.street} onChange={handleChange} error={errors.street} required={true} />
                </div>
                <div className='flex w-full gap-4'>
                  <FormInputRegistration label="Barangay" name="barangay" placeholder="Helin Hills" value={formData.barangay} onChange={handleChange} error={errors.barangay} required={true} />
                  <FormInputRegistration label="City" name="city" placeholder="Quezon City" value={formData.city} onChange={handleChange} error={errors.city} required={true} />
                </div>
                <FormInputRegistration label="Zip Code" name="zipCode" placeholder="1153" value={formData.zipCode} onChange={handleChange} error={errors.zipCode} required={true} />
              </div>
            )}

            <div className="flex flex-row w-full mt-6 gap-[15px]">
              <button type="button" className="btn btn-outline flex-1 h-12 rounded-3xl font-semibold disabled:opacity-50" onClick={handleBack} disabled={currentStep === 0}>Back</button>
              <button type="button" className="btn btn-primary flex-1 h-12 rounded-3xl font-semibold" onClick={handleNext}>
                {currentStep === 3 ? 'Submit' : 'Next'} 
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}