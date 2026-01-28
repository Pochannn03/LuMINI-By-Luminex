import { 
  checkUsername, 
  checkPassword, 
  checkName, 
  checkEmail, 
  checkPhone,
  checkAddressField, 
  checkZipCode,
  checkFile 
} from './validationRules';

export const validateRegistrationStep = (step, formData, profileImage, role = 'user') => {
  const errors = {};

  // --- SUB-VALIDATORS (Now using shared rules) ---
  
  const validateAccount = () => {
    // Username Check
    const userErr = checkUsername(formData.username);
    if (userErr) errors.username = userErr;

    // Password Check (with confirmation enabled)
    const passErr = checkPassword(formData.password, formData.confirmPassword, true);
    
    if (passErr) {
      // We map the error to the correct field based on the message
      if (passErr === "Passwords do not match") {
        errors.confirmPassword = passErr;
      } else {
        errors.password = passErr;
      }
    }
  };

  const validatePersonalInfo = () => {
    // First Name
    const fNameErr = checkName(formData.firstName, "First name");
    if (fNameErr) errors.firstName = fNameErr;

    // Last Name
    const lNameErr = checkName(formData.lastName, "Last name");
    if (lNameErr) errors.lastName = lNameErr;

    // Email
    const emailErr = checkEmail(formData.email);
    if (emailErr) errors.email = emailErr;

    // Phone
    const phoneErr = checkPhone(formData.phoneNumber);
    if (phoneErr) errors.phoneNumber = phoneErr;

    // Profile Image
    const imgErr = checkFile(profileImage, "Profile photo");
    if (imgErr) errors.profileImage = imgErr;
  };

  const validateRelationship = () => {
    // We can reuse checkAddressField or checkName since it's just a generic "Required" check
    const relErr = checkAddressField(formData.relationship, "Relationship");
    if (relErr) errors.relationship = relErr;
  };

  const validateAddress = () => {
    // House
    const houseErr = checkAddressField(formData.houseUnit, "House Unit");
    if (houseErr) errors.houseUnit = houseErr;

    // Street
    const streetErr = checkAddressField(formData.street, "Street");
    if (streetErr) errors.street = streetErr;

    // Barangay
    const brgyErr = checkAddressField(formData.barangay, "Barangay");
    if (brgyErr) errors.barangay = brgyErr;

    // City
    const cityErr = checkAddressField(formData.city, "City");
    if (cityErr) errors.city = cityErr;

    // Zip Code
    const zipErr = checkZipCode(formData.zipCode);
    if (zipErr) errors.zipCode = zipErr;
  };

  // --- STEP LOGIC (Remains exactly the same) ---
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