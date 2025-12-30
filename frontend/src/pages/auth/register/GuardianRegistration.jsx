import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../../styles/guardian-registration.css'


export default function GuardianRegistration() {
  const navigate = useNavigate();

  // For Error State //
  const [errors, setErrors] = useState({});

  // For User Profile useState and useRef //
  const [profileImage, setProfileImage] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

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

  // Validation Steps //
  const validateStep = (step) => {
    let newErrors = {};
    let isValid = true;

    // Step 0 Validation
    if (step === 0) {
      if (!formData.username) newErrors.username = "Username cannot be empty";
      else if (formData.username.length < 3) newErrors.username = "Username must be at least 3 characters";
      else if (formData.username.length > 32) newErrors.username = "Username max 32 characters";

      if (!formData.password) newErrors.password = "Password cannot be empty";
      
      if (!formData.confirmPassword) newErrors.confirmPassword = "Confirm Password cannot be empty";
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    }

    // Step 1 Validation //
    if (step === 1) {
      if (!profileImage) newErrors.profileImage = "Profile photo is required";
      if (!formData.firstName) newErrors.firstName = "First Name cannot be empty";
      if (!formData.lastName) newErrors.lastName = "Last Name cannot be empty";
      
      if (!formData.email) newErrors.email = "Email cannot be empty";
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format";

      if (!formData.phoneNumber) newErrors.phoneNumber = "Phone Number cannot be empty";
    }

    // Step 2 Validation //
    if (step === 2) {
      if (!formData.relationship) newErrors.relationship = "Relationship is required";
    }

    // Step 3 Validation //
    if (step === 3) {
      if (!formData.houseUnit) newErrors.houseUnit = "House Unit cannot be empty";
      if (!formData.street) newErrors.street = "Street cannot be empty";
      if (!formData.barangay) newErrors.barangay = "Brngy/Village cannot be empty";
      if (!formData.city) newErrors.city = "City cannot be empty";
      if (!formData.zipCode) newErrors.zipCode = "Zip Code cannot be empty";
    }

    setErrors(newErrors);
    isValid = Object.keys(newErrors).length === 0;
    return isValid;
  };

  // Phase of Registration //
  const [phase, setPhase] = useState('invitation');

  // Validation of User to Register //
  const [opacity, setOpacity] = useState(1);
  const [code, setCode] = useState(Array(6).fill(""));

  // Step of Registration //
  const [currentStep, setCurrentStep] = useState(0);

  const inputRefs = useRef([]); 

  // 6 Code Validation //
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
          <h1 className='text-left w-full mb-2.5'>
            Create Account
          </h1>
          <p className='w-full mb-[25px] font-normal text-left'>
            Please fill out the form to create your guardian account.
          </p>

          <div className='inline-block py-1.5 px-3.5 rounded-[50px] mb-[25px]'>
            <span className='text-cbrand-blue text-[11px] font-bold uppercase'>Step {currentStep + 1} of 4</span>
          </div>

          <form className="flex flex-col w-full" id="mainRegistrationForm" action="#" method="POST">

            {currentStep === 0 && (
              <div>
                <p className='border-bottom-custom'>
                Account Setup
                </p>
                <div className='flex flex-col w-full mb-5'>
                  <label htmlFor="username" className='text-[13px] font-semibold mb-2'>
                    Username
                      <span className='text-cbrand-blue ml-1 text-[12px]'>
                        *
                      </span>
                  </label>
                  <input 
                    type="text" 
                    name="username" 
                    className='registration-input' 
                    placeholder='shizuka312'
                    value={formData.username}
                    onChange={handleChange}
                  />
                  <ErrorMsg field="username" />
                </div>

                <div className='flex flex-col w-full mb-5'>
                  <label htmlFor="password" className='text-[13px] font-semibold mb-2'>
                    Password
                      <span className='text-cbrand-blue ml-1 text-[12px]'>
                        *
                      </span>
                  </label>
                  <input 
                    type="password" 
                    name="password" 
                    className='registration-input' 
                    placeholder='******'
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <ErrorMsg field="password" />
                </div>

                <div className='flex flex-col w-full mb-5'>
                  <label htmlFor="confirm-password" className='text-[13px] font-semibold mb-2'>
                    Confirm Password
                      <span className='text-cbrand-blue ml-1 text-[12px]'>
                        *
                      </span>
                  </label>
                  <input 
                    type="password" 
                    name="confirmPassword" 
                    className='registration-input' 
                    placeholder='******' 
                    value={formData.confirmPassword} 
                    onChange={handleChange}
                  />
                  <ErrorMsg field="confirmPassword" />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div>
                <p className='border-bottom-custom'>
                  Guardian Information
                </p>
                <div className='flex flex-col w-full mb-5'>
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
                  <div className='flex flex-col w-full mb-5'>
                    <label htmlFor="first_name" className='text-cdark text-[13px] font-semibold mb-2'>First Name 
                      <span className='text-cbrand-blue ml-1 text-[12px]'>
                        *
                      </span>
                    </label>
                      <input 
                        type="text" 
                        name="firstName"
                        className='registration-input' 
                        placeholder='John' 
                        value={formData.firstName}
                        onChange={handleChange}
                      />
                      <ErrorMsg field="firstName" />
                  </div>

                  <div className='flex flex-col w-full mb-5'>
                    <label htmlFor="lastName" className='text-cdark text-[13px] font-semibold mb-2'>Last Name 
                      <span className='text-cbrand-blue ml-1 text-[12px]'>
                        *
                      </span>
                    </label>
                      <input 
                        type="text" 
                        name="lastName" 
                        className='registration-input' 
                        placeholder='Doe' 
                        value={formData.lastName}
                        onChange={handleChange}
                      />
                      <ErrorMsg field="lastName" />
                  </div>
                </div>

                <div className='flex flex-col w-full mb-5'>
                  <label htmlFor="email" className='text-cdark text-[13px] font-semibold mb-2'> Email Address 
                    <span className='text-cbrand-blue ml-1 text-[12px]'>
                      *
                    </span>
                  </label>
                    <input 
                      type="text" 
                      name="email" 
                      className='registration-input' 
                      placeholder='shizuka22@gmail.com' 
                      value={formData.email}
                      onChange={handleChange}
                    />
                    <ErrorMsg field="email" />
                </div>

                <div className='flex flex-col w-full mb-5'>
                  <label htmlFor="phone-number" className='text-cdark text-[13px] font-semibold mb-2'>Phone Number 
                    <span className='text-cbrand-blue ml-1 text-[12px]'>
                      *
                    </span>
                  </label>
                    <input 
                      type="text" 
                      name="phoneNumber" 
                      className='registration-input' 
                      placeholder='09123456789' 
                      value={formData.phoneNumber}
                      onChange={handleChange}
                    />
                    <ErrorMsg field="phoneNumber" />
                </div>

              </div>
            )}

            {currentStep === 2 && (
              <div>
                <p className='border-bottom-custom'>Relationship to the Student</p>

                <div className='flex flex-col w-full mb-5'>
                  <label htmlFor="relationship" className='text-cdark text-[13px] font-semibold mb-2'>
                    Guardian
                      <span className='text-cbrand-blue ml-1 text-[12px]'>
                      (autofilled)
                    </span>
                  </label>
                  <input type="text" name='relationship' className='registration-input cbackground-gray cursor-not-allowed' value="Guardian" readonly/>
                </div>

                <div className='flex flex-col w-full mb-5'>
                  <label htmlFor="relationship" className='text-cdark text-[13px] font-semibold mb-2'>
                    Child's name
                      <span className='text-cbrand-blue ml-1 text-[12px]'>
                      (autofilled)
                    </span>
                  </label>
                  <input type="text" name='relationship' className='registration-input cbackground-gray cursor-not-allowed' value="Mia Chen" readonly/>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <p className='border-bottom-custom'>Address Details</p>

                <div className='flex w-full h-auto gap-4'>
                  <div className='flex flex-col w-full mb-5'>
                    <label htmlFor="house-unit" className='text-cdark text-[13px] font-semibold mb-2'>House Unit
                      <span className='text-cbrand-blue ml-1 text-[12px]'>
                        *
                      </span>
                    </label>
                      <input
                        type="text" 
                        name="houseUnit" 
                        className='registration-input' 
                        placeholder='32F' 
                        value={formData.houseUnit}
                        onChange={handleChange}
                      />
                      <ErrorMsg field="houseUnit" />
                  </div>

                  <div className='flex flex-col w-full mb-5'>
                    <label htmlFor="street" className='text-cdark text-[13px] font-semibold mb-2'>Street 
                      <span className='text-cbrand-blue ml-1 text-[12px]'>
                        *
                      </span>
                    </label>
                      <input 
                        type="text" 
                        name="street" 
                        className='registration-input' 
                        placeholder='Cornelia' 
                        value={formData.street}
                        onChange={handleChange}
                      />
                      <ErrorMsg field="street" />
                  </div>
                </div>
                
                <div className='flex w-full h-auto gap-4'>
                  <div className='flex flex-col w-full mb-5'>
                    <label htmlFor="barangay" className='text-cdark text-[13px] font-semibold mb-2'>Brngy/Village 
                      <span className='text-cbrand-blue ml-1 text-[12px]'>
                        *
                      </span>
                    </label>
                      <input 
                        type="text" 
                        name="barangay" 
                        className='registration-input' 
                        placeholder='171' 
                        value={formData.barangay}
                        onChange={handleChange}
                      />
                      <ErrorMsg field="barangay" />
                  </div>

                  <div className='flex flex-col w-full mb-5'>
                    <label htmlFor="city" className='text-cdark text-[13px] font-semibold mb-2'>City 
                      <span className='text-cbrand-blue ml-1 text-[12px]'>
                        *
                      </span>
                    </label>
                      <input 
                        type="text" 
                        name="city" 
                        className='registration-input' 
                        placeholder='Wanto City' 
                        value={formData.city}
                        onChange={handleChange}
                      />
                      <ErrorMsg field="city" />
                  </div>
                </div>

                <div className='flex flex-col w-full mb-5'>
                    <label htmlFor="zip-code" className='text-cdark text-[13px] font-semibold mb-2'>Zip Code 
                      <span className='text-cbrand-blue ml-1 text-[12px]'>
                        *
                      </span>
                    </label>
                      <input 
                        type="text" 
                        name="zipCode" 
                        className='registration-input' 
                        placeholder='1111' 
                        value={formData.zipCode}
                        onChange={handleChange}
                      />
                      <ErrorMsg field="zipCode" />
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
