import { Router } from "express";
import { createUserValidationSchema } from '../validation/userValidation.js'
import { query, validationResult, body, matchedData, checkSchema} from "express-validator";
import { User } from "../models/users.js";
import { hashPassword } from "../utils/passwordUtils.js";

const router = Router();

router.post('/api/superadmin-dashboard',  
  (req, res) => {

});

export default router;