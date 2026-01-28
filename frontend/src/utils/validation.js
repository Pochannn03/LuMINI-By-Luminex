export const validateRegistrationStep = (step, formData, profileImage, role = 'user') => {
  const errors = {};

  // --- REUSABLE VALIDATION LOGIC ---
  
  const validateAccount = () => {
    if (!formData.username) errors.username = "Username is required";
    if (!formData.password) errors.password = "Password is required";
    else if (formData.password.length < 8) errors.password = "Password must be at least 8 characters";
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Passwords do not match";
  };

  const validatePersonalInfo = () => {
    if (!formData.firstName) errors.firstName = "First name is required";
    if (!formData.lastName) errors.lastName = "Last name is required";
    if (!formData.email) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Invalid email format";
    if (!formData.phoneNumber) errors.phoneNumber = "Phone number is required";
    if (!profileImage) errors.profileImage = "Profile photo is required";
  };

  const validateRelationship = () => {
    if (!formData.relationship) errors.relationship = "Relationship is required";
  };

  const validateAddress = () => {
    if (!formData.houseUnit) errors.houseUnit = "House Unit is required";
    if (!formData.street) errors.street = "Street is required";
    if (!formData.barangay) errors.barangay = "Barangay is required";
    if (!formData.city) errors.city = "City is required";
    if (!formData.zipCode) errors.zipCode = "Zip Code is required";
  };

  // STEP 0 & 1 (SAME FOR EVERYONE)
  if (step === 0) validateAccount();
  if (step === 1) validatePersonalInfo();

  if (role === 'user') {
    if (step === 2) validateRelationship();
    if (step === 3) validateAddress();
  } 
  
  else if (role === 'admin') {
    if (step === 2) validateAddress();
  }

  return errors;
};