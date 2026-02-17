// frontend/src/pages/users/guardian/GuardianSetup.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthProvider";

export default function GuardianSetup() {
  const navigate = useNavigate();
  const { logout, user } = useAuth(); 

  // --- WIZARD STATE ---
  const [step, setStep] = useState(1);
  const [previewUrl, setPreviewUrl] = useState(null);
  // --- NEW: PASSWORD TOGGLE STATES ---
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // --- FORM DATA STATE (Updated with chopped address & default contact) ---
  const [formData, setFormData] = useState({
    username: user?.username || "",
    password: "",
    confirmPassword: "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: "",
    contact: "09", // Default to 09
    houseUnit: "",
    street: "",
    barangay: "",
    city: "",
    zipCode: "",
    profilePic: null,
  });

  // --- HANDLERS ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Special handling for the Contact Number
    if (name === "contact") {
      let val = value.replace(/\D/g, ''); // Remove all non-digits
      
      // Force it to start with '09'
      if (!val.startsWith("09")) {
        val = "09" + val.replace(/^0+/, ''); // Prepend 09, strip extra leading zeros
      }
      
      // Limit to 11 digits
      if (val.length > 11) {
        val = val.substring(0, 11);
      }
      
      setFormData({ ...formData, [name]: val });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData({ ...formData, profilePic: file });
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 5));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  // --- TEMPORARY LOGOUT FUNCTION ---
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

  // --- SUBMIT FUNCTION ---
  const [isSubmitting, setIsSubmitting] = useState(false); // Add this state right above the function

  const handleFinalSubmit = async () => {
    // 1. Basic Validation
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (formData.password.length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Package data for file upload
      const submitData = new FormData();
      submitData.append('username', formData.username);
      submitData.append('password', formData.password);
      submitData.append('firstName', formData.firstName);
      submitData.append('lastName', formData.lastName);
      submitData.append('contact', formData.contact);
      submitData.append('houseUnit', formData.houseUnit);
      submitData.append('street', formData.street);
      submitData.append('barangay', formData.barangay);
      submitData.append('city', formData.city);
      submitData.append('zipCode', formData.zipCode);

      if (formData.profilePic) {
        submitData.append('profilePic', formData.profilePic); // Must match the backend 'upload.single()' name
      }

      // 3. Send to backend
      await axios.put("http://localhost:3000/api/guardian/setup", submitData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      });

      // 4. Success! 
      // We use window.location.href here instead of navigate() to force the React app 
      // to fully reload. This ensures your AuthContext re-fetches the user data and 
      // realizes 'is_first_login' is now false!
      window.location.href = "/guardian/dashboard";

    } catch (error) {
      console.error("Setup Error:", error);
      alert(error.response?.data?.message || "Failed to complete setup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // --- DYNAMIC STEP RENDERER ---
  // ==========================================
  const renderStep = () => {
    switch (step) {
      // ------------------------------------------
      // STEP 1: Terms & Conditions
      // ------------------------------------------
      case 1:
        return (
          <div className="text-left animate-fadeIn">
            <h2 className="text-2xl font-bold text-[#1e293b] mb-2">Terms & Conditions</h2>
            <p className="text-sm text-gray-500 mb-6">Please read and agree to our security policies before continuing.</p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 h-48 overflow-y-auto text-sm text-gray-600 mb-6">
              <p className="mb-4"><strong>1. Security Compliance:</strong> As an authorized guardian, you agree to maintain the confidentiality of your account credentials.</p>
              <p className="mb-4"><strong>2. Facial Data Usage:</strong> LuMINI will securely store your facial recognition data solely for the purpose of verifying your identity during student pick-up/drop-off events.</p>
              <p><em>(Full legal terms will be populated here during final cleanup...)</em></p>
            </div>
          </div>
        );

      // ------------------------------------------
      // STEP 2: Update Credentials
      // ------------------------------------------
      case 2:
        return (
          <div className="text-left animate-fadeIn">
            <h2 className="text-2xl font-bold text-[#1e293b] mb-2">Secure Your Account</h2>
            <p className="text-sm text-gray-500 mb-6">Change your temporary assigned username and password to something secure that you will remember.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">New Username</label>
                <input 
                  type="text" name="username" value={formData.username} onChange={handleInputChange}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-(--brand-blue) focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="e.g. john_doe99"
                />
              </div>

              {/* Password Field with Toggle */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password" 
                    value={formData.password} 
                    onChange={handleInputChange}
                    className="w-full h-12 pl-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:border-(--brand-blue) focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex items-center justify-center cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirm Password Field with Toggle */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    name="confirmPassword" 
                    value={formData.confirmPassword} 
                    onChange={handleInputChange}
                    className="w-full h-12 pl-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:border-(--brand-blue) focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex items-center justify-center cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showConfirmPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        );

      // ------------------------------------------
      // STEP 3: Profile Details (UPDATED UI)
      // ------------------------------------------
      case 3:
        return (
          <div className="text-left animate-fadeIn">
            <h2 className="text-2xl font-bold text-[#1e293b] mb-4">Complete Your Profile</h2>
            
            {/* INSTRUCTION BANNER (Smaller) */}
            <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-lg mb-6 flex items-start gap-2">
              <span className="material-symbols-outlined text-(--brand-blue) text-[18px] mt-0.5">info</span>
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>Hey!</strong> Please make sure the profile picture you upload is <strong>formal and appropriate</strong> as it will be used for official school records and facial verification.
              </p>
            </div>

            {/* PROFILE PICTURE UPLOAD (At the top, Ample Sized) */}
            <div className="mb-6 flex flex-col items-center">
              <label className="flex flex-col items-center gap-3 cursor-pointer group">
                <div className="w-28 h-28 rounded-full bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group-hover:border-(--brand-blue) transition-colors relative">
                  {previewUrl ? (
                    <>
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white">edit</span>
                      </div>
                    </>
                  ) : (
                    <span className="material-symbols-outlined text-gray-400 text-4xl group-hover:text-(--brand-blue) transition-colors">add_a_photo</span>
                  )}
                </div>
                <div className="text-sm font-semibold text-(--brand-blue) group-hover:text-blue-700">
                  {previewUrl ? "Change Photo" : "Upload Photo"}
                </div>
                <input type="file" hidden accept="image/*" onChange={handleFileChange} />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase">First Name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-(--brand-blue) transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase">Last Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-(--brand-blue) transition-colors" />
              </div>
              
              {/* Row 2: Contact and Email beautifully balanced */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase">Contact #</label>
                <input type="text" name="contact" value={formData.contact} onChange={handleInputChange} placeholder="09XXXXXXXXX" className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-(--brand-blue) transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase">Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-(--brand-blue) transition-colors" />
              </div>
            </div>

            {/* ADDRESS DETAILS (Chopped) */}
            <div className="mt-6 mb-3">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">Address Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase">House Unit</label>
                <input type="text" name="houseUnit" value={formData.houseUnit} onChange={handleInputChange} placeholder="e.g. 117" className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-(--brand-blue) transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase">Street</label>
                <input type="text" name="street" value={formData.street} onChange={handleInputChange} placeholder="e.g. Hope Street" className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-(--brand-blue) transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase">Barangay</label>
                <input type="text" name="barangay" value={formData.barangay} onChange={handleInputChange} placeholder="e.g. San Martin" className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-(--brand-blue) transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase">City</label>
                <input type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="e.g. Quezon City" className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-(--brand-blue) transition-colors" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase">Zip Code</label>
                <input type="text" name="zipCode" value={formData.zipCode} onChange={handleInputChange} placeholder="e.g. 1153" className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-(--brand-blue) transition-colors" />
              </div>
            </div>
          </div>
        );

      // ------------------------------------------
      // STEP 4: Facial Recognition (Placeholder)
      // ------------------------------------------
      case 4:
        return (
          <div className="text-center py-8 animate-fadeIn">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-500">
              <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>face_retouching_natural</span>
            </div>
            <h2 className="text-2xl font-bold text-[#1e293b] mb-3">Facial Recognition Setup</h2>
            <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">
              ~ This is the page dedicated for facial recognition ~ <br/>
              (We will wire up the camera module here shortly!)
            </p>
          </div>
        );

      // ------------------------------------------
      // STEP 5: Finish Setup
      // ------------------------------------------
      case 5:
        return (
          <div className="text-center py-8 animate-fadeIn">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
              <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>check_circle</span>
            </div>
            <h2 className="text-2xl font-bold text-[#1e293b] mb-3">All Set!</h2>
            <p className="text-gray-500 max-w-sm mx-auto leading-relaxed mb-6">
              Your profile is secured and your facial data has been registered. You are now ready to use LuMINI.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 md:p-6 font-poppins">
      <div className="bg-white rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] max-w-2xl w-full p-6 md:p-10 relative">
        
        {/* --- TEMPORARY LOGOUT BUTTON --- */}
        <button 
          onClick={handleTempLogout}
          className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 text-sm font-semibold cursor-pointer z-10"
          title="Temporary Logout for Testing"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
          Logout
        </button>

        {/* --- PROGRESS BAR --- */}
        <div className="flex items-center justify-between mb-8 pr-20">
          <div className="text-sm font-bold text-(--brand-blue) uppercase tracking-wider">
            Step {step} of 5
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((item) => (
              <div 
                key={item} 
                className={`h-2 rounded-full transition-all duration-300 ${item === step ? 'w-8 bg-(--brand-blue)' : item < step ? 'w-4 bg-blue-200' : 'w-4 bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        {/* --- FORM CONTENT --- */}
        <div className="min-h-[300px]">
          {renderStep()}
        </div>

        {/* --- NAVIGATION BUTTONS --- */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
          <button 
            onClick={prevStep} 
            disabled={step === 1}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${step === 1 ? 'opacity-0 cursor-default' : 'text-gray-500 bg-gray-100 hover:bg-gray-200 cursor-pointer'}`}
          >
            Back
          </button>
          
          {step < 5 ? (
            <button 
              onClick={nextStep}
              className="px-8 py-2.5 rounded-xl font-bold text-sm text-white bg-(--brand-blue) hover:bg-[#2c8ac4] shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              Continue
            </button>
          ) : (
            <button 
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="px-8 py-2.5 rounded-xl font-bold text-sm text-white bg-green-500 hover:bg-green-600 shadow-md shadow-green-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? "Saving..." : "Finish Setup"} <span className="material-symbols-outlined" style={{fontSize: '18px'}}>arrow_forward</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}