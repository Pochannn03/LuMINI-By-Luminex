export const createStudentValidationSchema = {
  first_name: {
    isLength: {
      options: {
        min: 3, 
        max: 32
      },
      errerMessage: "First Name must be at least 3 characters with max of 32 characters"
    },
    notEmpty: {
      errorMessage: "First Name cannot be empty",
    },
    isString: {
      errorMessage: "First Name must be in characters"  
    },
  },
  last_name: {
    isLength: {
      options: {
        min: 3, 
        max: 32
      },
      errerMessage: "Last Name must be at least 3 characters with max of 32 characters"
    },
    notEmpty: {
      errorMessage: "Last Name cannot be empty",
    },
    isString: {
      errorMessage: "Last Name must be in characters"  
    },
  },
  birthday: {
    notEmpty: { 
      errorMessage: "Birthday is required" 
    },
  },
  age: {
    notEmpty: { 
      errorMessage: "Age is required" 
    },
  },
  invitation_code: {
    notEmpty: { 
      errorMessage: "Invitation code is required" 
    },
  }
};