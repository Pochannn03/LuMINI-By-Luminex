export const updateStudentValidationSchema = {
  first_name: {
    optional: { options: { nullable: true, checkFalsy: true } }, // Allow empty/undefined
    isLength: {
      options: { min: 3, max: 32 },
      errorMessage: "First Name must be 3-32 characters"
    },
  },
  last_name: {
    optional: { options: { nullable: true, checkFalsy: true } },
    isLength: {
      options: { min: 3, max: 32 },
      errorMessage: "Last Name must be 3-32 characters"
    },
  },
  birthday: {
    optional: true,
  },
  age: {
    optional: true,
  },
  medical_history: {
    optional: true,
    isString: {
      errorMessage: "Medical history must be a string",
    },
    trim: true,
  },
  invitation_code: {
    optional: true,
  }
};