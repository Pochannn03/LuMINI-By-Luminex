export const createTeacherValidationSchema = {
  username: {
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
  password: {
    optional: { 
      options: { 
        nullable: true, 
        checkFalsy: true 
      } 
    },
    isLength: {
      options: {
        min: 8
      },
      errerMessage: "Username must be at least 8 characters"
    },
    notEmpty: {
      errorMessage: "Password cannot be empty",
    }
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
  },
  address: {
    notEmpty: {
      errorMessage: "Address cannot be empty",
    }
  },
  relationship: {
    notEmpty: {
      errorMessage: "Please Indicate your relationship to the child",
    }
  }
};