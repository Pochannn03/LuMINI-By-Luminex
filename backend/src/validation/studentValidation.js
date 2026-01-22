export const createUserValidationSchema = {
  first_name: {
    isLength: {
      options: {
        min: 3, 
        max: 32
      },
      errerMessage: "Username must be at least 3 characters with max of 32 characters"
    },
    notEmpty: {
      errorMessage: "Username cannot be empty",
    },
    isString: {
      errorMessage: "Username must be in characters"  
    },
  },
  last_name: {
    isLength: {
      options: {
        min: 3, 
        max: 32
      },
      errerMessage: "Username must be at least 3 characters with max of 32 characters"
    },
    notEmpty: {
      errorMessage: "Username cannot be empty",
    },
    isString: {
      errorMessage: "Username must be in characters"  
    },
  }
};