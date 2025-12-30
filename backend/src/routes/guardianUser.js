import { Router } from "express";
import { createUserValidationSchema } from '../validation/userValidation.js'
import { query, validationResult, body, matchedData, checkSchema} from "express-validator";
import { User } from "../models/users.js";
import { hashPassword } from "../utils/passwordUtils.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') 
  },
  filename: function (req, file, cb) {
    // Unique filename: timestamp + original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage: storage });

router.post('/api/guardian-register', 
  upload.single('profile_photo'), 
  ...checkSchema(createUserValidationSchema), 
  async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).send({ errors: result.array() });
    }

    const data = matchedData(req);
    console.log("Received Valid Text Data:", data);

    data.password = await hashPassword(data.password);
    data.role = "user";

    if (req.file) {
      data.profile_picture = req.file.path; 
    }

    const newUser = new User(data);

    try {
        const savedUser = await newUser.save();
        return res.status(201).send({ msg: "Guardian registered successfully!", user: savedUser });
    } catch (err) {
        console.log("Database Error:", err);
        return res.sendStatus(400);
    }
  }
);

export default router;