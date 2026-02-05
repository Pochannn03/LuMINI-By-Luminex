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
  class_schedule: {
    optional: { 
      options: { 
        nullable: true, 
        checkFalsy: true 
      } 
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
    isInt: {
      errorMessage: "Assigned Teacher ID must be a valid number" 
    },
    toInt: true 
  },
  student_id: {
    isArray: {
      errorMessage: "Selected students must be an array",
    },
    optional: { options: { nullable: true, checkFalsy: true } },
  },
  "student_id.*": {
    isString: true,
    matches: {
      options: [/^\d{4}-\d{4}$/],
      errorMessage: "Each student ID must follow the format YYYY-XXXX"
    }
  }
};