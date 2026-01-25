export const createClassValidationSchema = {
  section_name: {
    isLength: {
      options: { 
        min: 3, 
        max: 32 
      },
      errorMessage: "Class name must be between 3 and 32 characters" 
    },
    notEmpty: {
      errorMessage: "Class name cannot be empty",
    },
    isString: {
      errorMessage: "Class name must be in characters"  
    },
  },
  max_capacity: {
    notEmpty: {
      errorMessage: "Max Number cannot be empty",
    },
    isInt: {
      errorMessage: "Max Number must be a valid integer"  
    },
  },
  description: {
    notEmpty: { 
      errorMessage: "Description is required" 
    },
  },
  user_id: {
    notEmpty: { 
      errorMessage: "Assigned Teacher is required" 
    },
  },
};