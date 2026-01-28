import { 
  checkName, 
  checkDate,
  checkFile
} from '../validationRules';

// We keep the function name 'validateRegistrationStep' because that is what your Modal imports
export const validateClassRegistrationStep = (formData, profileImage) => {
  const errors = {};

  // 1. Personal Information
  const firstNameError = checkName(formData.firstName, "First name");
  if (firstNameError) errors.firstName = firstNameError;

  const lastNameError = checkName(formData.lastName, "Last name");
  if (lastNameError) errors.lastName = lastNameError;

  // 2. Date of Birth
  const dateError = checkDate(formData.birthdate, "Birthdate");
  if (dateError) errors.birthdate = dateError;

  // 3. Profile Image
  const imageError = checkFile(profileImage, "Profile photo");
  if (imageError) errors.profileImage = imageError;

  return errors;
};