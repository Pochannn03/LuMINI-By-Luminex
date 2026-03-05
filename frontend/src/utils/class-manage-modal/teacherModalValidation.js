import { 
  checkUsername, 
  checkPassword, 
  checkName, 
  checkEmail, 
  checkPhone,
  checkFile
} from '../validationRules';

// We keep the function name 'validateRegistrationStep' because that is what your Modal imports
export const validateRegistrationStep = (formData, profileImage) => {
  const errors = {};

  // 1. Account Credentials
  const usernameError = checkUsername(formData.username);
  if (usernameError) errors.username = usernameError;

  const passwordError = checkPassword(formData.password);
  if (passwordError) errors.password = passwordError;

  // 2. Personal Information
  const firstNameError = checkName(formData.firstName, "First name");
  if (firstNameError) errors.firstName = firstNameError;

  const lastNameError = checkName(formData.lastName, "Last name");
  if (lastNameError) errors.lastName = lastNameError;

  const emailError = checkEmail(formData.email);
  if (emailError) errors.email = emailError;

  const phoneError = checkPhone(formData.phoneNumber);
  if (phoneError) errors.phoneNumber = phoneError;

  // 3. Profile Image
  const imageError = checkFile(profileImage, "Profile photo");
  if (imageError) errors.profileImage = imageError;

  return errors;
};