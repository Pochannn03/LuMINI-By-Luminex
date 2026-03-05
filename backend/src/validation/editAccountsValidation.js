export const editUserValidationSchema = {
  username: {
    isLength: {
      options: { min: 3, max: 32 },
      errorMessage: "Username must be 3-32 characters"
    },
    notEmpty: { errorMessage: "Username cannot be empty" },
    isString: { errorMessage: "Username must be a string" },
  },
  password: {
    optional: true, // Add this so it doesn't fail if password is not sent
    isLength: {
      options: { min: 8 },
      errorMessage: "Password must be at least 8 characters" // Fixed typo
    },
    notEmpty: { errorMessage: "Password cannot be empty" }
  },
  email: {
    notEmpty: {
      errorMessage: "Email cannot be empty",
    }
  },
  first_name: {
    notEmpty: {
      errorMessage: "First Name cannot be empty",
    }
  },
  last_name: {
    notEmpty: {
      errorMessage: "Last Name cannot be empty",
    }
  },
  phone_number: {
    notEmpty: {
      errorMessage: "Phone Number cannot be empty",
    }
  }
};