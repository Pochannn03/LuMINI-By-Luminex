import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../styles/auth/registration.css'
import FormInputRegistration from '../../components/FormInputRegistration';
import { validateRegistrationStep } from '../../utils/validation';


export default function GuardianRegistration() {
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

  // Form Inputs Placeholder //
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

  // Validation Function //

  const validateStep = (step) => {
    const newErrors = validateRegistrationStep(step, formData, profileImage, 'guardian');
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers //
  // Image Handler //
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setErrors(prev => ({ ...prev, profileImage: null }));
      
      // 2. Create preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (e) => {
    e.stopPropagation(); // Prevent triggering the file input click
    setProfileImage(null);
    setPreviewUrl(null);
    // Reset the input value so selecting the same file works again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  // 6 Digit Code Handler //
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

  // Handle Submit Form for Registration //
  const handleSubmitForm = async () => {
    if (!validateStep(3)) return;

    // When uploading files, we usually need FormData instead of JSON
    const data = new FormData();
      data.append('username', formData.username);
      data.append('password', formData.password);
      data.append('email', formData.email);
      data.append('first_name', formData.firstName);
      data.append('last_name', formData.lastName);
      data.append('phone_number', formData.phoneNumber);
      data.append('relationship', formData.relationship);
      data.append('address', `${formData.houseUnit}, ${formData.street}, ${formData.barangay}, ${formData.city}, ${formData.zipCode}`);
      
    // Append the image if it exists
    if (profileImage) {
      data.append('profile_photo', profileImage); 
    }

    console.log("Sending Form Data..."); 

    try {
      await axios.post('http://localhost:3000/api/guardian-register', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate('/login');
    } catch (error) {
      console.error('Error registering:', error);
      if (error.response && error.response.data && error.response.data.errors) {
        alert(`Registration Failed: ${error.response.data.errors[0].msg}`);
      } else {
        alert("Registration failed. Please try again.");
      }
    }
  };
  
  // Form Button Logic for Steps //
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

  const ErrorMsg = ({ field }) => {
    return errors[field] ? (
      <span className="text-red-500 text-[11px] mt-1 ml-1 text-left w-full block">
        {errors[field]}
      </span>
    ) : null;
  };

  return (
    <div className="wave min-h-screen w-full flex justify-center items-center p-5">
      
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
            Please fill out the form to create your guardian account.
          </p>

          <div className='inline-block py-1.5 px-3.5 rounded-[50px] mb-4'>
            <span className='text-cbrand-blue text-[11px] font-bold uppercase'>Step {currentStep + 1} of 4</span>
          </div>

          <form className="flex flex-col w-full" id="mainRegistrationForm" action="#" method="POST">

            {currentStep === 0 && (
              <div>

                <p className='border-bottom-custom'>
                Account Setup
                </p>

                <div className='flex flex-col w-full mb-5'>
                  <FormInputRegistration
                    label="Username"
                    name="username"
                    type='text'
                    className=''
                    placeholder="johndoe12"
                    value={formData.username}
                    onChange={handleChange}
                    error={errors.username}
                    required={true}
                  />
                </div>

                <div className='flex flex-col w-full mb-5'>
                  <FormInputRegistration
                    label="Password"
                    name="password"
                    type='password'
                    placeholder="********"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    required={true}
                  />
                </div>

                <div className='flex flex-col w-full mb-5'>
                  <FormInputRegistration
                    label="Confirm Password"
                    name="confirmPassword"
                    type='password'
                    placeholder="********"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    required={true}
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div>
                <p className='border-bottom-custom'>
                  Guardian Information
                </p>
                <div className='flex flex-col w-full mb-4'>
                  <label htmlFor="profileUpload" className='text-cdark text-[13px] font-semibold mb-2'>
                    Profile Photo 
                      <span className='text-cbrand-blue ml-1 text-[12px]'>
                        *
                      </span>
                  </label>

                  <div className='file-upload-wrapper'>
                    <div 
                        className='file-upload-container'
                        onClick={() => fileInputRef.current.click()} 
                    >
                      {!previewUrl && (
                        <div className='flex flex-col items-center text-cbrand-blue'>
                          <svg className='text-cbrand-blue mb-2' width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                              <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                            <span className='text-[12px] font-medium'>Tap to Upload Photo</span>
                        </div>
                      )}

                      {previewUrl && (
                        <img src={previewUrl} alt="Preview" className="image-preview" />
                      )}

                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept="image/*" 
                        className='hidden' 
                        onChange={handleImageUpload}
                      />
                      
                    </div>

                    {previewUrl && (
                        <button type='button' onClick={removeImage} className='remove-file-btn'>
                            ✕
                        </button>
                    )}
                  </div>
                  <ErrorMsg field="profileImage" />
                </div>

                <div className='flex w-full h-auto gap-4'>
                  <div className='flex flex-col w-full mb-1'>
                    <FormInputRegistration
                      label="First Name"
                      name="firstName"
                      type='text'
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleChange}
                      error={errors.firstName}
                      required={true}
                    />
                  </div>

                  <div className='flex flex-col w-full mb-1'>
                    <FormInputRegistration
                      label="Last Name"
                      name="lastName"
                      type='text'
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleChange}
                      error={errors.lastName}
                      required={true}
                    />
                  </div>
                </div>

                <div className='flex flex-col w-full mb-2'>
                  <FormInputRegistration
                      label="Email Address"
                      name="email"
                      type='text'
                      placeholder="Johndoe@gmail.com"
                      className='registration-input'
                      value={formData.email}
                      onChange={handleChange}
                      error={errors.email}
                      required={true}
                    />
                </div>

                <div className='flex flex-col w-full mb-2'>
                  <FormInputRegistration
                      label="Phone Number"
                      name="phoneNumber"
                      type='text'
                      placeholder="09*********"
                      className='registration-input'
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      error={errors.phoneNumber}
                      required={true}
                    />
                </div>

              </div>
            )}

            {currentStep === 2 && (
              <div>
                <p className='border-bottom-custom'>Relationship to the Student</p>

                <div className='flex flex-col w-full mb-5'>
                  <FormInputRegistration
                      label="Relationship"
                      name="relationship"
                      value={formData.relationship}
                      readOnly={true}
                    />
                </div>

                <div className='flex flex-col w-full mb-5'>
                  <FormInputRegistration
                    label="Child's name"
                    name="childName"
                    value="Mia Chen"
                    readOnly={true}
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <p className='border-bottom-custom'>Address Details</p>

                <div className='flex w-full h-auto gap-4'>
                  <div className='flex flex-col w-full mb-5'>
                    <FormInputRegistration
                      label="House Unit"
                      name="houseUnit"
                      type='text'
                      placeholder="117"
                      className='registration-input'
                      value={formData.houseUnit}
                      onChange={handleChange}
                      error={errors.houseUnit}
                      required={true}
                    />
                  </div>

                  <div className='flex flex-col w-full mb-5'>
                    <FormInputRegistration
                      label="Street"
                      name="street"
                      type='text'
                      placeholder="Hope Street"
                      className='registration-input'
                      value={formData.street}
                      onChange={handleChange}
                      error={errors.street}
                      required={true}
                    />
                  </div>
                </div>
                
                <div className='flex w-full h-auto gap-4'>
                  <div className='flex flex-col w-full mb-5'>
                    <FormInputRegistration
                      label="Barangay"
                      name="barangay"
                      type='text'
                      placeholder="Helin Hills"
                      className='registration-input'
                      value={formData.barangay}
                      onChange={handleChange}
                      error={errors.barangay}
                      required={true}
                    />
                  </div>

                  <div className='flex flex-col w-full mb-5'>
                    <FormInputRegistration
                      label="City"
                      name="city"
                      type='text'
                      placeholder="Quezon City"
                      className='registration-input'
                      value={formData.city}
                      onChange={handleChange}
                      error={errors.city}
                      required={true}
                    />
                  </div>
                </div>

                <div className='flex flex-col w-full mb-5'>
                    <FormInputRegistration
                      label="Zip Code"
                      name="zipCode"
                      type='text'
                      placeholder="1153"
                      className='registration-input'
                      value={formData.zipCode}
                      onChange={handleChange}
                      error={errors.zipCode}
                      required={true}
                    />
                  </div>

              </div>
            )}

            <div class="flex flex-row w-full mt-2.5  gap-[15px]">
              <button 
                type="button" 
                className="btn btn-outline flex-1 h-12 rounded-3xl font-semibold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={handleBack}
                disabled={currentStep === 0}>
                  Back
              </button>
              <button 
                  type="button" 
                  className="btn btn-primary flex-1 h-12 rounded-3xl font-semibold text-[15px]" 
                  onClick={handleNext}
                >
                  {currentStep === 3 ? 'Submit' : 'Next'} 
              </button>
            </div>
          </form>
          
        </div>
        )
      }

    </div>
  );
}
