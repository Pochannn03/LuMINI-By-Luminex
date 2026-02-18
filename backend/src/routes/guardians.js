// backend/routes/guardians.js

import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js'; // <-- ADD THIS
import { Router } from "express";
import { createUserValidationSchema } from '../validation/userValidation.js'
import { validationResult, matchedData, checkSchema} from "express-validator";
import { User } from "../models/users.js";
import { Student } from "../models/students.js";
import { Section } from "../models/sections.js";
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
        
        const parentObjectId = req.user._id; 
        const parentCustomId = req.user.user_id; 
        
        const linkedStudent = await Student.findOne({ user_id: parentCustomId }); 
        
        if (!linkedStudent) {
             if (req.file) fs.unlinkSync(req.file.path);
             return res.status(404).json({ message: "No linked child found for this parent account." });
        }

        const studentId = linkedStudent._id; 

        // --- THE FIX: DYNAMICALLY FIND THE CORRECT TEACHER ---
        let actualTeacherId = null;
        if (linkedStudent.section_id) {
            // Find the student's section
            const section = await Section.findOne({ section_id: linkedStudent.section_id });
            if (section && section.user_id) {
                // Find the teacher assigned to that section
                const teacher = await User.findOne({ user_id: section.user_id });
                if (teacher) {
                    actualTeacherId = teacher._id; // Grab the Teacher's MongoDB ID
                }
            }
        }

        // Fallback to a provided ID or throw an error if no teacher is found
        const finalTeacherId = actualTeacherId || req.body.teacherId;
        if (!finalTeacherId) {
             if (req.file) fs.unlinkSync(req.file.path);
             return res.status(400).json({ message: "No teacher assigned to this student's section." });
        }

        const idPhotoPath = req.file ? req.file.path : null;
        if (!idPhotoPath) return res.status(400).json({ message: "ID photo is required." });

        const hashedPassword = await hashPassword(password);

        const newRequest = new GuardianRequest({
            parent: parentObjectId, 
            student: studentId,
            teacher: finalTeacherId, // <-- SAVES THE CORRECT TEACHER ID
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
        const teacherMongoId = req.user._id; // Get the logged-in teacher's ID

        // THE FIX: Filter by status AND teacher ID
        const requests = await GuardianRequest.find({ 
              status: 'pending',
              teacher: teacherMongoId 
            })
            .populate('parent', 'first_name last_name profile_picture')
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

        // 4. Mark request as approved and HARD-LINK the new User ID!
        requestDoc.status = 'approved';
        requestDoc.guardianDetails.createdUserId = savedGuardian._id; // <-- THE FIX
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
        const teacherMongoId = req.user._id;

        // THE FIX: Filter history by the logged-in teacher's ID
        const history = await GuardianRequest.find({ 
              status: { $in: ['approved', 'rejected', 'revoked'] }, // Added revoked for history tracking!
              teacher: teacherMongoId 
            })
            .populate('parent', 'first_name last_name profile_picture')
            .populate('student', 'first_name last_name')
            .sort({ updatedAt: -1 }); 

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

// ==========================================
// GUARDIAN ACTION: FETCH ASSIGNED CHILDREN
// ==========================================
router.get('/api/guardian/children', isAuthenticated, async (req, res) => {
  try {
    // Grab the custom numeric user_id of the logged-in Guardian
    const guardianNumericId = req.user.user_id;

    // Search the Student collection and perform a "Deep Populate"
    const assignedChildren = await Student.find({ 
      user_id: guardianNumericId 
    }).populate({
      path: 'section_details',
      populate: { 
        path: 'user_details', // <-- THE FIX: This grabs the nested Teacher info!
        select: 'first_name last_name email' // We only grab what we need for security
      }
    });

    if (!assignedChildren || assignedChildren.length === 0) {
      return res.status(200).json([]); // Return empty array if no kids are found
    }

    return res.status(200).json(assignedChildren);

  } catch (error) {
    console.error("Error fetching guardian's children:", error);
    return res.status(500).json({ message: "Server error while fetching assigned students." });
  }
});

// ==========================================
// GUARDIAN ACTION: COMPLETE FIRST-TIME SETUP
// ==========================================
router.put(
  '/api/guardian/setup', 
  isAuthenticated, 
  upload.single('profilePic'), // Expects the image under the key 'profilePic'
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { 
        username, password, firstName, lastName,
        contact, houseUnit, street, barangay, city, zipCode 
      } = req.body;

      // 1. Find the logged-in Guardian account
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found." });

      // 2. Update Basic Info
      if (username) user.username = username;
      if (firstName) user.first_name = firstName;
      if (lastName) user.last_name = lastName;
      if (contact) user.phone_number = contact;

      // 3. Hash and Update Password
      if (password) {
        user.password = await hashPassword(password);
      }

      // 4. Construct and Update Address
      const fullAddress = [houseUnit, street, barangay, city, zipCode].filter(Boolean).join(', ');
      if (fullAddress) {
        user.address = fullAddress;
      }

      // 5. Update Profile Picture (if one was uploaded)
      if (req.file) {
        // Optional: If you want to delete the old generic avatar, you could do it here
        user.profile_picture = req.file.path;
      }

      // 6. REMOVE THE BUFFER ZONE LOCK!
      user.is_first_login = false;

      // Save all changes to the database
      await user.save();

      return res.status(200).json({ 
        message: "Security setup complete! Account fully verified.",
        user 
      });

    } catch (error) {
      console.error("Guardian Setup Error:", error);
      return res.status(500).json({ message: "Server error during setup." });
    }
});

// ==========================================
// PARENT ACTION: FETCH OWN APPROVED REQUESTS
// ==========================================
router.get(
  '/api/parent/guardian-requests/history', 
  isAuthenticated, 
  async (req, res) => {
    try {
        const parentId = req.user._id;

        // Fetch requests that belong to this parent and are marked 'approved'
        const approvedRequests = await GuardianRequest.find({ 
            parent: parentId, 
            status: 'approved' 
        }).sort({ updatedAt: -1 });

        return res.status(200).json(approvedRequests);
    } catch (error) {
        console.error("Error fetching parent's approved requests:", error);
        return res.status(500).json({ message: "Server error while fetching history." });
    }
});

// ==========================================
// PARENT ACTION: REVOKE APPROVED GUARDIAN
// ==========================================
router.put('/api/parent/guardian-requests/:id/revoke', isAuthenticated, async (req, res) => {
    try {
        const requestId = req.params.id;
        const parentId = req.user._id;

        // 1. Find the approved request ensuring it belongs to this parent
        const requestDoc = await GuardianRequest.findOne({
            _id: requestId,
            parent: parentId,
            status: 'approved'
        });

        if (!requestDoc) {
            return res.status(404).json({ message: "Approved request not found." });
        }

        // 2. Find the active Guardian User account securely!
        // We use the hard-linked ID. (We keep the username search as a fallback just in case you test on older requests).
        let guardianUser;
        if (requestDoc.guardianDetails.createdUserId) {
            guardianUser = await User.findById(requestDoc.guardianDetails.createdUserId);
        } else {
            guardianUser = await User.findOne({ username: requestDoc.guardianDetails.tempUsername });
        }

        if (guardianUser) {
            // 3. Remove the guardian's user_id from the student's authorized list
            await Student.findByIdAndUpdate(requestDoc.student, {
                $pull: { user_id: guardianUser.user_id } 
            });

            // 4. Archive (disable) the guardian account so they can no longer log in
            guardianUser.is_archive = true;
            await guardianUser.save();
        }

        // 5. Update the request status to 'revoked' so it disappears from the Active list
        requestDoc.status = 'revoked';
        await requestDoc.save();

        return res.status(200).json({ message: "Guardian access has been permanently revoked." });

    } catch (error) {
        console.error("Revoke Error:", error);
        return res.status(500).json({ message: "Server error during revocation." });
    }
});

export default router;