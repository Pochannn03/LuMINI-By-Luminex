// backend/routes/guardians.js

import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js'; // <-- ADD THIS
import { Router } from "express";
import { createUserValidationSchema } from '../validation/userValidation.js'
import { validationResult, matchedData, checkSchema} from "express-validator";
import { User } from "../models/users.js";
import { Student } from "../models/students.js";
// Make sure to import your new GuardianRequest model!
// Adjust the path below if your models folder is structured differently.
import GuardianRequest from "../models/guardianRequest.js"; 
import { hashPassword } from "../utils/passwordUtils.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// ==========================================
// 1. CONFIG: PROFILE PHOTO UPLOADS (Existing)
// ==========================================
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage: storage });

// ==========================================
// 2. CONFIG: GUARDIAN ID UPLOADS (New)
// ==========================================
const idUploadDir = 'uploads/guardian-ids';
if (!fs.existsSync(idUploadDir)){
    // recursive: true ensures parent folders are created if they don't exist
    fs.mkdirSync(idUploadDir, { recursive: true });
}

const idStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/guardian-ids/') 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Prefixed with 'ID-' for easier identification
    cb(null, 'ID-' + uniqueSuffix + path.extname(file.originalname)); 
  }
});

const uploadId = multer({ storage: idStorage });

// ==========================================
// ROUTES
// ==========================================

// --- EXISTING ROUTE: Direct Guardian Registration ---
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

    const hashedPassword = await hashPassword(data.password);
    const newUser = new User({
        ...data,
        password: hashedPassword,
        relationship: "Guardian",
        role: "user",
        profile_picture: req.file ? req.file.path : null,
        is_archive: false
      });

    if (req.file) {
      data.profile_picture = req.file.path; 
    }

    try {
        const savedUser = await newUser.save();
        return res.status(201).send({ msg: "Guardian registered successfully!", user: savedUser });
    } catch (err) {
        console.log("Database Error:", err);
        return res.sendStatus(400);
    }
  }
);

// --- NEW ROUTE: Parent Requesting a Guardian ---
router.post(
  '/api/parent/guardian-request', 
  isAuthenticated, 
  hasRole('parent', 'user'), 
  uploadId.single('idFile'), 
  async (req, res) => {
    try {
        const { firstName, lastName, phone, role, username, password } = req.body;
        
        // 1. Get both IDs from the logged-in parent
        const parentObjectId = req.user._id; // The standard MongoDB string ID
        const parentCustomId = req.user.user_id; // Your custom numeric ID (e.g., 1005)
        
        // --- THE FIX: Search the user_id array using the custom ID ---
        const linkedStudent = await Student.findOne({ user_id: parentCustomId }); 
        
        if (!linkedStudent) {
             if (req.file) fs.unlinkSync(req.file.path);
             return res.status(404).json({ message: "No linked child found for this parent account." });
        }

        const studentId = linkedStudent._id; // Use the student's MongoDB ID for the request
        const teacherId = req.body.teacherId || "60d5ecb8b392d700153ee789";

        const idPhotoPath = req.file ? req.file.path : null;
        if (!idPhotoPath) return res.status(400).json({ message: "ID photo is required." });

        const hashedPassword = await hashPassword(password);

        const newRequest = new GuardianRequest({
            parent: parentObjectId, // Save the ObjectId here
            student: studentId,
            teacher: teacherId,
            guardianDetails: {
                firstName, lastName, phone, role,
                tempUsername: username,
                tempPassword: hashedPassword,
                idPhotoPath: idPhotoPath
            }
        });

        await newRequest.save();

        return res.status(201).json({ 
            message: "Guardian request submitted successfully to the teacher!",
            request: newRequest 
        });

    } catch (error) {
        console.error("Submit Request Error:", error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(500).json({ message: "Server error during submission." });
    }
});

// --- NEW ROUTE: Teacher Fetching Pending Requests ---
router.get(
  '/api/teacher/guardian-requests/pending', 
  isAuthenticated, 
  async (req, res) => {
    try {
        const requests = await GuardianRequest.find({ status: 'pending' })
            .populate('parent', 'first_name last_name profile_picture')
            // --- NEW: POPULATE THE STUDENT DETAILS TOO ---
            .populate('student', 'first_name last_name') 
            .sort({ createdAt: -1 }); 

        return res.status(200).json(requests);
    } catch (error) {
        console.error("Error fetching pending requests:", error);
        return res.status(500).json({ message: "Server error while fetching requests." });
    }
});

// ==========================================
// TEACHER ACTION: APPROVE REQUEST
// ==========================================
router.put('/api/teacher/guardian-requests/:id/approve', isAuthenticated, async (req, res) => {
    try {
        const requestId = req.params.id;

        // 1. Find the pending request
        const requestDoc = await GuardianRequest.findById(requestId);
        if (!requestDoc || requestDoc.status !== 'pending') {
            return res.status(404).json({ message: "Request not found or already processed." });
        }

        // 2. Create the new Guardian User account
        const newGuardian = new User({
            first_name: requestDoc.guardianDetails.firstName,
            last_name: requestDoc.guardianDetails.lastName,
            username: requestDoc.guardianDetails.tempUsername,
            password: requestDoc.guardianDetails.tempPassword, 
            phone_number: requestDoc.guardianDetails.phone,
            
            // --- THE FIXES ---
            relationship: "Guardian", // Forces it to match your schema's allowed words
            email: `${requestDoc.guardianDetails.tempUsername}@placeholder.com`, // Satisfies the required email
            address: "Not Provided", // Satisfies the required address
            
            role: "user", 
            is_archive: false,
        });

        const savedGuardian = await newGuardian.save();

        // 3. Link the new Guardian to the Student
        // Assuming your User schema auto-generates a custom numeric 'user_id' upon save
        if (savedGuardian.user_id) {
            await Student.findByIdAndUpdate(requestDoc.student, {
                $push: { user_id: savedGuardian.user_id } 
            });
        }

        // 4. Mark request as approved
        requestDoc.status = 'approved';
        await requestDoc.save();

        return res.status(200).json({ message: "Guardian successfully approved and account created!" });

    } catch (error) {
        console.error("Approval Error:", error);
        return res.status(500).json({ message: "Server error during approval." });
    }
});

// ==========================================
// TEACHER ACTION: REJECT REQUEST
// ==========================================
router.put('/api/teacher/guardian-requests/:id/reject', isAuthenticated, async (req, res) => {
    try {
        const requestId = req.params.id;

        // 1. Find the pending request
        const requestDoc = await GuardianRequest.findById(requestId);
        if (!requestDoc || requestDoc.status !== 'pending') {
            return res.status(404).json({ message: "Request not found or already processed." });
        }

        // 2. Mark request as rejected
        requestDoc.status = 'rejected';
        await requestDoc.save();

        // 3. (Optional but recommended) Delete the ID photo to save server storage
        if (requestDoc.guardianDetails.idPhotoPath && fs.existsSync(requestDoc.guardianDetails.idPhotoPath)) {
            fs.unlinkSync(requestDoc.guardianDetails.idPhotoPath);
        }

        return res.status(200).json({ message: "Guardian request rejected." });

    } catch (error) {
        console.error("Rejection Error:", error);
        return res.status(500).json({ message: "Server error during rejection." });
    }
});

// ==========================================
// TEACHER ACTION: FETCH HISTORY
// ==========================================
router.get(
  '/api/teacher/guardian-requests/history', 
  isAuthenticated, 
  async (req, res) => {
    try {
        // Find requests that are NOT pending
        const history = await GuardianRequest.find({ status: { $in: ['approved', 'rejected'] } })
            .populate('parent', 'first_name last_name profile_picture')
            .populate('student', 'first_name last_name')
            .sort({ updatedAt: -1 }); // Sort by the time they were approved/rejected

        return res.status(200).json(history);
    } catch (error) {
        console.error("Error fetching history requests:", error);
        return res.status(500).json({ message: "Server error while fetching history." });
    }
});

// ==========================================
// PARENT ACTION: FETCH OWN PENDING REQUESTS
// ==========================================
router.get(
  '/api/parent/guardian-requests/pending', 
  isAuthenticated, 
  hasRole('parent', 'user'), 
  async (req, res) => {
    try {
        const parentId = req.user._id;

        // Find all pending requests belonging to this specific parent
        const pendingRequests = await GuardianRequest.find({ 
            parent: parentId, 
            status: 'pending' 
        }).sort({ createdAt: -1 });

        return res.status(200).json(pendingRequests);
    } catch (error) {
        console.error("Error fetching parent's pending requests:", error);
        return res.status(500).json({ message: "Server error while fetching pending requests." });
    }
});

// ==========================================
// PARENT ACTION: CANCEL PENDING REQUEST
// ==========================================
router.delete(
  '/api/parent/guardian-requests/:id', 
  isAuthenticated, 
  async (req, res) => {
    try {
        const requestId = req.params.id;
        const parentId = req.user._id;

        // 1. Find the request. Ensure it belongs to this parent AND is still pending.
        const requestDoc = await GuardianRequest.findOne({
            _id: requestId,
            parent: parentId,
            status: 'pending'
        });

        if (!requestDoc) {
            return res.status(404).json({ message: "Pending request not found or already processed." });
        }

        // 2. Delete the ID photo from the server to save storage space!
        if (requestDoc.guardianDetails.idPhotoPath && fs.existsSync(requestDoc.guardianDetails.idPhotoPath)) {
            fs.unlinkSync(requestDoc.guardianDetails.idPhotoPath);
        }

        // 3. Delete the request from the database
        await GuardianRequest.findByIdAndDelete(requestId);

        return res.status(200).json({ message: "Guardian application successfully cancelled." });

    } catch (error) {
        console.error("Cancel Request Error:", error);
        return res.status(500).json({ message: "Server error while cancelling request." });
    }
});

export default router;