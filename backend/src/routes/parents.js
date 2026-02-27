import { Router } from "express";
import { createUserValidationSchema } from "../validation/userValidation.js";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { validationResult, body, matchedData, checkSchema } from "express-validator";
import { Attendance } from "../models/attendances.js";
import { Audit } from "../models/audits.js";
import { User } from "../models/users.js";
import { Student } from "../models/students.js";
import { hashPassword } from "../utils/passwordUtils.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// PARENT REGISTRATION
// STUDENT CODE VERIFICATION (PHASE I)
router.post("/api/invitations/validate", async (req, res) => {
  const { code } = req.body;

  try {
    const student = await Student.findOne({ invitation_code: code });

    if (!student) {
      return res.status(404).send({ msg: "Invitation code not found." });
    }

    if (student.invitation_status === "used") {
      return res.status(400).send({ msg: "This code has already been used." });
    }

    const fullName = `${student.first_name} ${student.last_name}`;

    return res.status(200).send({
      msg: "Code valid",
      fullName: fullName,
    });
  } catch (err) {
    res.status(500).send({ msg: "Server error" });
  }
});

// PARENT REGISTRATION (PHASE II)
router.post(
  "/api/parents",
  // THE FIX: Use upload.fields to catch both images!
  upload.fields([
    { name: 'profile_photo', maxCount: 1 },
    { name: 'facialCapture', maxCount: 1 }
  ]),
  ...checkSchema(createUserValidationSchema),
  async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      if (req.files && req.files['profile_photo']) fs.unlinkSync(req.files['profile_photo'][0].path);
      if (req.files && req.files['facialCapture']) fs.unlinkSync(req.files['facialCapture'][0].path);
      return res.status(400).send({ errors: result.array() });
    }

    const data = matchedData(req);

    try {
      const student = await Student.findOne({
        invitation_code: data.invitation_code,
      });

      if (!student) {
        if (req.files && req.files['profile_photo']) fs.unlinkSync(req.files['profile_photo'][0].path);
        if (req.files && req.files['facialCapture']) fs.unlinkSync(req.files['facialCapture'][0].path);
        return res.status(404).send({ msg: "Invalid invitation code." });
      }

      if (student.invitation_status === "used") {
        if (req.files && req.files['profile_photo']) fs.unlinkSync(req.files['profile_photo'][0].path);
        if (req.files && req.files['facialCapture']) fs.unlinkSync(req.files['facialCapture'][0].path);
        return res.status(400).send({ msg: "This code has already been used." });
      }

      const hashedPassword = await hashPassword(data.password);

      // --- GRAB THE NEW BIOMETRIC DATA ---
      let facialCapturePath = "";
      if (req.files && req.files['facialCapture']) {
        facialCapturePath = req.files['facialCapture'][0].path.replace(/\\/g, "/");
      }

      let parsedDescriptor = [];
      // Note: Data coming from FormData text fields uses req.body directly
      if (req.body.facialDescriptor) {
        parsedDescriptor = JSON.parse(req.body.facialDescriptor);
      }

      const newUser = new User({
        ...data,
        password: hashedPassword,
        relationship: "Parent",
        role: "user",
        profile_picture: (req.files && req.files['profile_photo']) ? req.files['profile_photo'][0].path.replace(/\\/g, "/") : null,
        
        // --- SAVE BIOMETRICS TO MONGOOSE ---
        facial_capture_image: facialCapturePath,
        facial_descriptor: parsedDescriptor,
        
        is_archive: false,
      });

      const savedUser = await newUser.save();

      student.user_id.push(savedUser.user_id);
      student.invitation_status = "used";
      student.invitation_used_at = Date.now();
      await student.save();

      const auditLog = new Audit({
        user_id: savedUser.user_id,
        full_name: `${savedUser.first_name} ${savedUser.last_name}`,
        role: savedUser.role,
        action: "Parent Registration",
        target: `Registered with Student: ${student.first_name} ${student.last_name}`
      });
      await auditLog.save();

      return res.status(201).send({
        msg: "Parent registered and linked to student successfully!",
        user: savedUser,
      });
    } catch (err) {
      if (req.files && req.files['profile_photo']) fs.unlinkSync(req.files['profile_photo'][0].path);
      if (req.files && req.files['facialCapture']) fs.unlinkSync(req.files['facialCapture'][0].path);
      console.error("Registration Error:", err);
      return res.status(500).send({ msg: "Registration failed", error: err.message });
    }
  },
);

// Checking for User Information under the Student Schema // EXAMPLE OF GEMINI TO GET THE DETAILS OF ANOTHER SCHEMA UNDER A CERTAIN SCHAME ('.populate')
router.get("/api/user-checking", async (req, res) => {
  try {
    const studentWithParent = await Student.findOne({
      student_id: "2026-0001",
    }).populate({
      path: "user_details",
      select: "username first_name last_name email profile_picture", // Exclude password here
    });

    if (!studentWithParent) {
      return res.status(404).send({ msg: "Student not found" });
    }

    if (
      studentWithParent.user_details &&
      studentWithParent.user_details.length > 0
    ) {
      console.log(
        "Parent Username:",
        studentWithParent.user_details[0].username,
      );
      return res.status(200).send(studentWithParent);
    } else {
      return res.status(200).send({
        msg: "Student found, but no linked parent details found in User collection.",
        student: studentWithParent,
      });
    }
  } catch (err) {
    console.error("Query Error:", err);
    res.status(500).send({ msg: "Server error", error: err.message });
  }
});

// GET /api/parent/children
// Description: Get all students linked to the logged-in parent
router.get("/api/parent/children", 
  isAuthenticated,
  hasRole('user'),
  async (req, res) => {
    try {
      const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

      const studentToReset = await Student.findOne({ 
        user_id: req.user.user_id, 
        last_reset_date: { $ne: todayDate } 
      });

      let resetHappened = false;
      if (studentToReset) {
          await Student.updateMany(
              { 
                user_id: req.user.user_id,
                 last_reset_date: { 
                  $ne: 
                  todayDate 
                } 
              },
              { 
                $set: { 
                  status: 'On the way', 
                  last_reset_date: todayDate 
                } 
              }
          );
          resetHappened = true;
      }

      const children = await Student.find({ user_id: req.user.user_id }).populate({
        path: "section_details",
        populate: {
          path: "user_details",
          select: "first_name last_name email phone_number",
        },
      });

      res.status(200).json({
        success: resetHappened,
        children: children
      });
  } catch (err) {
    console.error("Error fetching children:", err);
    res.status(500).json({ message: "Server error fetching children" });
  }
});

// GET /api/parent/guardians
// Description: Get all guardians linked to the parent's students
router.get("/api/parent/guardians", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 1. Find all students linked to this Parent
    const students = await Student.find({ user_id: req.user.user_id });

    // 2. Extract all User IDs from these students
    // (This includes the Parent, other Parents, and Guardians)
    const allLinkedUserIds = students.flatMap((s) => s.user_id);

    // 3. Find 'Guardian' accounts among those IDs (excluding the current parent)
    const guardians = await User.find({
      user_id: { $in: allLinkedUserIds },
      role: "guardian",
      user_id: { $ne: req.user.user_id }, // Exclude self
    }).select("-password"); // Don't send passwords back!

    res.status(200).json(guardians);
  } catch (err) {
    console.error("Error fetching guardians:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
