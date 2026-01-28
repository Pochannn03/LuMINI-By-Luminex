export const checkUsername = (username) => {
  if (!username) return "Username is required";
  return null;
};

export const checkPassword = (password, confirmPassword = null, requireConfirm = false) => {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  
  if (requireConfirm) {
    if (password !== confirmPassword) return "Passwords do not match";
  }
  return null;
};

export const checkEmail = (email) => {
  if (!email) return "Email is required";
  if (!/\S+@\S+\.\S+/.test(email)) return "Invalid email format";
  return null;
};

export const checkName = (name, label) => {
  if (!name) return `${label} is required`;
  return null;
};

export const checkPhone = (phone) => {
  if (!phone) return "Phone number is required";
  return null;
};

export const checkAddressField = (value, label) => {
  if (!value) return `${label} is required`;
  return null;
};

export const checkZipCode = (zipCode) => {
  if (!zipCode) return "Zip Code is required";
  
  // Optional: Add regex if you want to enforce 4 digits (common in PH)
  // if (!/^\d{4}$/.test(zipCode)) return "Zip Code must be 4 digits";
  
  // Basic numeric check
  if (isNaN(zipCode)) return "Zip Code must be a valid number";
  
  return null;
};

export const checkFile = (file, label = "File") => {
  if (!file) return `${label} is required`;
  return null;
};