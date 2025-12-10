import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../../styles/parent_registration.css';


const ParentRegistration = () => {
  // --- State Management ---
  const [isInvitationView, setIsInvitationView] = useState(true);
  const [step, setStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false); // For fade effect
  
  // Invitation Code State
  const [code, setCode] = useState(new Array(6).fill(""));
  const inputRefs = useRef([]);
  const formRef = useRef(null);

  // Form Data State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    relationship: '',
    childName: 'Mia Chen', // Autofilled
    houseUnit: '',
    street: '',
    barangay: '',
    city: '',
    zipcode: ''
  });

  const [imagePreview, setImagePreview] = useState(null);

  // --- Handlers: Invitation Section ---

  const handleCodeChange = (e, index) => {
    // Logic from your JS: Allow Letters & Numbers, auto-uppercase
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Focus next input if value is entered
    if (value.length === 1 && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleCodeKeyDown = (e, index) => {
    // Logic from your JS: Handle Backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };
  

  const submitInvitationCode = () => {
    const fullCode = code.join("");
    
    if (fullCode.length === 6) {
      // Mimic the JS fade-out transition
      setIsTransitioning(true);
      
      setTimeout(() => {
        setIsInvitationView(false);
        setIsTransitioning(false);
      }, 300); // 300ms matches the timeout in your JS
    } else {
      alert("Please enter a valid 6-character code.");
    }
  };

  // --- Handlers: Registration Form ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = (e) => {
    e.preventDefault();
    setImagePreview(null);
  };

  const handleNext = () => {
    // Check validation for the current visible inputs
    if (formRef.current && !formRef.current.reportValidity()) {
        return; // Stop if invalid
    }

    // if (step === 1) {
    //   if(passwword !== confirmPassword){
          // will work on this one
    //   }
    // }

    if (step < 4) {
      setStep(step + 1);
    } else {
      // Final Submit
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const fullAddress = `${formData.houseUnit}, ${formData.street}, ${formData.barangay}, ${formData.city}, ${formData.zipcode}`;
      // 1. Prepare the data payload
      // (We filter out the confirmPassword since the backend usually doesn't need it)
      const payload = {
        username: formData.username,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        relationship: formData.relationship,
        address: fullAddress,

        // If you are handling file uploads (profile photo), you might need FormData instead of JSON.
        // For now, we assume simple JSON data.
      };

      // 2. Send POST request
      // Make sure the URL matches your backend server (e.g., http://localhost:3000)
      const response = await axios.post('http://localhost:3000/api/parentregister', payload);

      // 3. Handle Success
      console.log("Response:", response.data);
      alert("Registration Successful!");
      
      // Optional: Redirect to login
      // window.location.href = '/login'; 

    } catch (error) {
      // 4. Handle Errors
      console.error("Registration Error:", error);
      
      if (error.response && error.response.data.errors) {
        // If backend sent validation errors, show them
        const errorMsg = error.response.data.errors.map(err => err.msg).join('\n');
        alert("Validation Failed:\n" + errorMsg);
      } else {
        alert("Something went wrong. Please try again.");
      }
    }
  };

  // --- Render ---

  // Determine transition styles
  const containerStyle = {
    transition: 'opacity 0.3s ease',
    opacity: isTransitioning ? 0 : 1
  };

  return (
    <div>
      {isInvitationView ? (
        <div className="parent-registration-main-container" id="invitationSection" style={containerStyle}>
          <h1 className="parent-registration-header-text">Enter Invitation Code</h1>
          <p className="parent-registration-description-text">
            Enter the invitation code provided by your child's teacher to create your account.
          </p>

          <div className="code-inputs-wrapper">
            {code.map((data, index) => (
              <input
                key={index}
                type="text"
                className="code-box"
                maxLength="1"
                value={data}
                ref={(el) => (inputRefs.current[index] = el)}
                onChange={(e) => handleCodeChange(e, index)}
                onKeyDown={(e) => handleCodeKeyDown(e, index)}
                onFocus={(e) => e.target.select()} // Added select on focus
              />
            ))}
          </div>

          <button 
            type="button" 
            className="button next-button" 
            id="submitCodeBtn"
            onClick={submitInvitationCode}
          >
            Submit
          </button>

          <div className="redirect-sign-in-container" style={{ marginTop: '20px', border: 'none', padding: '0' }}>
            <p className="label-already-acc">Already have an account?</p>
            <a href="../auth/login.html" className="login-link">Sign In</a>
          </div>
        </div>
      ) : (
        /* --- SECTION 2: Registration Form --- */
        <div className="parent-registration-main-container" id="registrationSection" style={containerStyle}>
          <h1 className="parent-registration-header-text">Create Account</h1>
          <p className="parent-registration-description-text">
            Please fill out the form to create your parent account.
          </p>

          <div className="step-indicator" id="stepIndicator">Step {step} of 4</div>

          <form className="parent-registration-form" ref={formRef} onSubmit={(e) => e.preventDefault()}>
            
            {/* Step 1: Account Setup */}
            {step === 1 && (
              <div className="form-step" id="step1">
                <p className="parent-registration-description-text enlarged-text">Account Setup</p>
                <div className="lbl-input-wrapper">
                  <label className="parent-registration-label">Username <span className="required">*</span></label>
                  <input type="text" name="username" className="parent-registration-input" placeholder="Sarah123" required value={formData.username} onChange={handleInputChange} />
                </div>
                <div className="lbl-input-wrapper">
                  <label className="parent-registration-label">Password <span className="required">*</span></label>
                  <input type="password" name="password" className="parent-registration-input" placeholder="********" required value={formData.password} onChange={handleInputChange} />
                </div>
                <div className="lbl-input-wrapper">
                  <label className="parent-registration-label">Confirm Password <span className="required">*</span></label>
                  <input type="password" name="confirmPassword" className="parent-registration-input" placeholder="********" required value={formData.confirmPassword} onChange={handleInputChange} />
                </div>
              </div>
            )}

            {/* Step 2: Parent Information */}
            {step === 2 && (
              <div className="form-step" id="step2">
                <p className="parent-registration-description-text enlarged-text">Parent Information</p>
                
                <div className="lbl-input-wrapper">
                  <label className="parent-registration-label">Profile Photo <span className="required">*</span></label>
                  <div className="file-upload-wrapper">
                    <label htmlFor="profile-upload" className="file-upload-container">
                      {!imagePreview ? (
                        <div id="default-upload-view">
                          <svg className="upload-icon-svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                          </svg>
                          <span className="upload-text">Tap to upload photo</span>
                        </div>
                      ) : (
                        <img id="image-preview" className="image-preview" src={imagePreview} alt="Preview" />
                      )}
                      <input 
                        type="file" 
                        id="profile-upload" 
                        name="profile-upload" 
                        accept="image/*" 
                        className="hidden-file-input" 
                        onChange={handleFileUpload} 
                        required={!imagePreview} // Required only if no image preview exists
                      />
                    </label>
                    {imagePreview && (
                      <button type="button" id="remove-btn" className="remove-file-btn" onClick={removeFile}>✕</button>
                    )}
                  </div>
                </div>

                <div className="multiple-input-wrapper">
                  <div className="lbl-input-wrapper">
                    <label className="parent-registration-label">Firstname <span className="required">*</span></label>
                    <input type="text" name="first_name" className="parent-registration-input" placeholder="Sarah" required value={formData.first_name} onChange={handleInputChange} />
                  </div>
                  <div className="lbl-input-wrapper">
                    <label className="parent-registration-label">Lastname <span className="required">*</span></label>
                    <input type="text" name="last_name" className="parent-registration-input" placeholder="Chen" required value={formData.last_name} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="lbl-input-wrapper">
                  <label className="parent-registration-label">Email Address <span className="required">*</span></label>
                  <input type="email" name="email" className="parent-registration-input" placeholder="sarah32@gmail.com" required value={formData.email} onChange={handleInputChange} />
                </div>
                <div className="lbl-input-wrapper">
                  <label className="parent-registration-label">Phone Number <span className="required">*</span></label>
                  <input type="tel" name="phone_number" className="parent-registration-input" placeholder="09836734235" required value={formData.phone_number} onChange={handleInputChange} />
                </div>
              </div>
            )}

            {/* Step 3: Relationship */}
            {step === 3 && (
              <div className="form-step" id="step3">
                <p className="parent-registration-description-text enlarged-text">Relationship to the Student</p>
                
                <div className="lbl-input-wrapper">
                  <label className="parent-registration-label">Parent <span className="required">*</span></label>
                  <select 
                    name="relationship" 
                    className="parent-registration-input" 
                    required 
                    value={formData.relationship} 
                    onChange={handleInputChange}
                    style={{ appearance: 'none', backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-13%205.4A17.6%2017.6%200%200%200%200%2087.2c0%205%201.8%209.3%205.4%2013l131.3%20131.3c3.6%203.6%207.9%205.4%2013%205.4s9.3-1.8%2013-5.4L287%20100.2c3.6-3.6%205.4-7.9%205.4-13%200-5-1.8-9.3-5.4-13z%22%2F%3E%3C%2Fsvg%3E')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 15px top 50%', backgroundSize: '12px auto' }}
                  >
                    <option value="" disabled>Select Relationship</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Guardian">Legal Guardian</option>
                  </select>
                </div>

                <div className="lbl-input-wrapper">
                  <label className="parent-registration-label">Child's name <span style={{ color: 'var(--brand-blue)' }}>(autofilled)</span></label>
                  <input type="text" name="childName" className="parent-registration-input" value={formData.childName} readOnly style={{ backgroundColor: '#f8fafc', color: '#8898aa', cursor: 'not-allowed' }} />
                </div>
              </div>
            )}

            {/* Step 4: Address Details */}
            {step === 4 && (
              <div className="form-step" id="step4">
                <p className="parent-registration-description-text enlarged-text">Address Details</p>
                
                <div className="multiple-input-wrapper">
                  <div className="lbl-input-wrapper">
                    <label className="parent-registration-label">House Unit <span className="required">*</span></label>
                    {/* distinct name and value */}
                    <input type="text" name="houseUnit" className="parent-registration-input" placeholder="32F" required value={formData.houseUnit} onChange={handleInputChange} />
                  </div>
                  <div className="lbl-input-wrapper">
                    <label className="parent-registration-label">Street <span className="required">*</span></label>
                    {/* distinct name and value */}
                    <input type="text" name="street" className="parent-registration-input" placeholder="Cornelia" required value={formData.street} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="multiple-input-wrapper">
                  <div className="lbl-input-wrapper">
                    <label className="parent-registration-label">Brgy/Village <span className="required">*</span></label>
                    <input type="text" name="barangay" className="parent-registration-input" placeholder="171" required value={formData.barangay} onChange={handleInputChange} />
                  </div>
                  <div className="lbl-input-wrapper">
                    <label className="parent-registration-label">City <span className="required">*</span></label>
                    <input type="text" name="city" className="parent-registration-input" placeholder="Biringan City" required value={formData.city} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="lbl-input-wrapper">
                  <label className="parent-registration-label">Zip Code <span className="required">*</span></label>
                  <input type="text" inputMode="numeric" name="zipcode" className="parent-registration-input" placeholder="1432" required value={formData.zipcode} onChange={handleInputChange} />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="button-wrapper">
              <button 
                type="button" 
                className="button back-button" 
                id="backWardBtn"
                onClick={handleBack}
                disabled={step === 1}
                style={{
                  opacity: step === 1 ? 0.5 : 1,
                  cursor: step === 1 ? 'default' : 'pointer'
                }}
              >
                Back
              </button>
              
              <button 
                type="button" 
                className="button next-button" 
                id="frwrdBtn"
                onClick={handleNext}
              >
                {step === 4 ? 'Finish' : 'Next'}
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
};

export default ParentRegistration;