import { Router } from "express";
import { createUserValidationSchema } from '../validation/userValidation.js'
import { query, validationResult, body, matchedData, checkSchema} from "express-validator";
import { User } from "../schemas/users.js";
import { hashPassword } from "../utils/passwordUtils.js";


const router = Router();

router.post('/api/guardian-register', 
  ...checkSchema(createUserValidationSchema), 
  async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      return res.status(400).send({ errors: result.array() });
    }

    const data = matchedData(req);
    console.log("Received Valid Data:", data);
    data.password = await hashPassword(data.password);
    data.role = "user";
    console.log(data);
    const newUser = new User(data);

    try {
        const savedUser = await newUser.save();
        return res.status(201).send({ msg: "Guardian registered successfully!", user: savedUser });
      } catch (err) {
        console.log(err)
        return res.sendStatus(400)
      }
  }
);

export default router;