import { checkUsername, checkEmail, checkPhone, checkName, checkPassword } from '../validationRules';

export const validateAccountsEditModal = (formData) => {
  const errors = {};

  const usernameErr = checkUsername(formData.username, "Username");
  if (usernameErr) errors.username = usernameErr;

  if (formData.password && formData.password.trim() !== "") {
      const passErr = checkPassword(formData.password);
      if (passErr) errors.password = passErr;
  }

  const fNameErr = checkName(formData.first_name, "First name");
  if (fNameErr) errors.first_name = fNameErr;

  const lNameErr = checkName(formData.last_name, "Last name");
  if (lNameErr) errors.last_name = lNameErr;

  const emailErr = checkEmail(formData.email, "Email");
  if (emailErr) errors.email = emailErr;

  const phoneErr = checkPhone(formData.phone_number);
  if (phoneErr) errors.phone_number = phoneErr;

  // const imgErr = checkFile(profileImage, "Profile photo");
  // if (imgErr) errors.profileImage = imgErr;

  return errors;
};