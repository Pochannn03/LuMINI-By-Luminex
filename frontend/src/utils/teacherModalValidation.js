export const validateRegistrationStep = (formData, profileImage) => {
  const errors = {};

  const validateAccount = () => {
    if (!formData.username) errors.username = "Username is required";
    if (!formData.password) errors.password = "Password is required";
    else if (formData.password.length < 8) errors.password = "Password must be at least 8 characters";
  };

  const validatePersonalInfo = () => {
    if (!formData.firstName) errors.firstName = "First name is required";
    if (!formData.lastName) errors.lastName = "Last name is required";
    if (!formData.email) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Invalid email format";
    if (!formData.phoneNumber) errors.phoneNumber = "Phone number is required";

    if (!profileImage) errors.profileImage = "Profile photo is required";
  };

  validateAccount();
  validatePersonalInfo();

  return errors;
};