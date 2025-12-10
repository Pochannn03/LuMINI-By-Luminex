import { Router } from "express";
import { createUserValidationSchema } from '../validation/userValidation.js'
import { query, validationResult, body, matchedData, checkSchema} from "express-validator";


const router = Router();

router.get('/api/register', (req, res) => {
    return res.send({ msg: "Hello World!" });
  }
);

router.post('/api/parentregister', 
  checkSchema(createUserValidationSchema), 
  async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      return res.status(400).send({ errors: result.array() });
    }

    const data = matchedData(req);

    console.log("Received Valid Data:", data);


    return res.status(201).send({ msg: "Parent registered successfully!", user: data });
  }
);

export default router;