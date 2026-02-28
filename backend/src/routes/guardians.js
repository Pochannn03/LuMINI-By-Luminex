import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { Router } from "express";
import { createUserValidationSchema } from '../validation/userValidation.js'
import { validationResult, matchedData, checkSchema} from "express-validator";
import { hashPassword } from "../utils/passwordUtils.js";
import { User } from "../models/users.js";
import { Student } from "../models/students.js";
import { Section } from "../models/sections.js";
import { Audit } from "../models/audits.js";
import GuardianRequest from "../models/guardianRequest.js"; 
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// ==========================================
// 1. CONFIG: PROFILE PHOTO UPLOADS
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
// 2. CONFIG: GUARDIAN ID UPLOADS
// ==========================================
const idUploadDir = 'uploads/guardian-ids';
if (!fs.existsSync(idUploadDir)){
    fs.mkdirSync(idUploadDir, { recursive: true });
}

const idStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/guardian-ids/') 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ID-' + uniqueSuffix + path.extname(file.originalname)); 
  }
});

const uploadId = multer({ storage: idStorage });

// ==========================================
// ROUTES
// ==========================================

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

    const auditLog = new Audit({
      user_id: savedUser.user_id,
      full_name: `${savedUser.first_name} ${savedUser.last_name}`,
      role: savedUser.role,
      action: "Guardian Registration",
      target: `Guardian account created ${savedUser.first_name} ${savedUser.last_name}`
    });
    await auditLog.save();

    try {
        const savedUser = await newUser.save();
        return res.status(201).send({ msg: "Guardian registered successfully!", user: savedUser });
    } catch (err) {
        console.log("Database Error:", err);
        return res.sendStatus(400);
    }
  }
);

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

        let actualTeacherId = null;
        if (linkedStudent.section_id) {
            const section = await Section.findOne({ section_id: linkedStudent.section_id });
            if (section && section.user_id) {
                const teacher = await User.findOne({ user_id: section.user_id });
                if (teacher) actualTeacherId = teacher._id;
            }
        }

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
            teacher: finalTeacherId,
            guardianDetails: {
                firstName, lastName, phone, role,
                tempUsername: username,
                tempPassword: hashedPassword,
                idPhotoPath: idPhotoPath
            }
        });

        await newRequest.save();

        const auditLog = new Audit({
          user_id: req.user.user_id,
          full_name: `${req.user.first_name} ${req.user.last_name}`,
          role: req.user.role,
          action: "Submit Guardian Request",
          target: `Submitted request for ${firstName} ${lastName}`
        });
        await auditLog.save();

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

router.get(
  '/api/teacher/guardian-requests/pending', 
  isAuthenticated, 
  async (req, res) => {
    try {
        const teacherMongoId = req.user._id;

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
router.put('/api/teacher/guardian-requests/:id/approve', 
  isAuthenticated,
  hasRole('admin'),
  async (req, res) => {
    try {
        const requestId = req.params.id;

        const requestDoc = await GuardianRequest.findById(requestId);
        if (!requestDoc || requestDoc.status !== 'pending') {
            return res.status(404).json({ message: "Request not found or already processed." });
        }

        const newGuardian = new User({
            first_name: requestDoc.guardianDetails.firstName,
            last_name: requestDoc.guardianDetails.lastName,
            username: requestDoc.guardianDetails.tempUsername,
            password: requestDoc.guardianDetails.tempPassword, 
            phone_number: requestDoc.guardianDetails.phone,
            relationship: "Guardian", 
            email: `${requestDoc.guardianDetails.tempUsername}@placeholder.com`, 
            address: "Not Provided", 
            role: "user", 
            is_archive: false,
        });

        const savedGuardian = await newGuardian.save();

        if (savedGuardian.user_id) {
            await Student.findByIdAndUpdate(requestDoc.student, {
                $push: { user_id: savedGuardian.user_id } 
            });
        }

        requestDoc.status = 'approved';
        requestDoc.guardianDetails.createdUserId = savedGuardian._id; 
        await requestDoc.save();

        const auditLog = new Audit({
          user_id: req.user.user_id,
          full_name: `${req.user.first_name} ${req.user.last_name}`,
          role: req.user.role,
          action: "Approve Guardian Request",
          target: `Approved account for ${savedGuardian.first_name} ${savedGuardian.last_name}`
        });
        await auditLog.save();

        return res.status(200).json({ message: "Guardian successfully approved and account created!" });

    } catch (error) {
        console.error("Approval Error:", error);
        return res.status(500).json({ message: "Server error during approval." });
    }
});

// ==========================================
// TEACHER ACTION: REJECT REQUEST
// ==========================================
router.put('/api/teacher/guardian-requests/:id/reject', 
  isAuthenticated,
  hasRole('admin'),
  async (req, res) => {
    try {
        const requestId = req.params.id;

        const requestDoc = await GuardianRequest.findById(requestId);
        if (!requestDoc || requestDoc.status !== 'pending') {
            return res.status(404).json({ message: "Request not found or already processed." });
        }

        const guardianName = `${requestDoc.guardianDetails.firstName} ${requestDoc.guardianDetails.lastName}`;

        requestDoc.status = 'rejected';
        await requestDoc.save();

        const auditLog = new Audit({
          user_id: req.user.user_id,
          full_name: `${req.user.first_name} ${req.user.last_name}`,
          role: req.user.role,
          action: "Reject Guardian Request",
          target: `Rejected request for: ${guardianName}`
        });
        await auditLog.save();

        if (requestDoc.guardianDetails.idPhotoPath && fs.existsSync(requestDoc.guardianDetails.idPhotoPath)) {
            fs.unlinkSync(requestDoc.guardianDetails.idPhotoPath);
        }

        return res.status(200).json({ message: "Guardian request rejected." });

    } catch (error) {
        console.error("Rejection Error:", error);
        return res.status(500).json({ message: "Server error during rejection." });
    }
});

router.get(
  '/api/teacher/guardian-requests/history', 
  isAuthenticated, 
  async (req, res) => {
    try {
        const teacherMongoId = req.user._id;

        const history = await GuardianRequest.find({ 
              status: { $in: ['approved', 'rejected', 'revoked'] },
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

router.get(
  '/api/parent/guardian-requests/pending', 
  isAuthenticated, 
  hasRole('parent', 'user'), 
  async (req, res) => {
    try {
        const parentId = req.user._id;

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

router.delete(
  '/api/parent/guardian-requests/:id', 
  isAuthenticated, 
  async (req, res) => {
    try {
        const requestId = req.params.id;
        const parentId = req.user._id;
        const parentUserId = req.user.user_id; 
        const fullName = `${req.user.first_name} ${req.user.last_name}`;

        const requestDoc = await GuardianRequest.findOne({
            _id: requestId,
            parent: parentId,
            status: 'pending'
        });

        if (!requestDoc) {
            return res.status(404).json({ message: "Pending request not found or already processed." });
        }

        if (requestDoc.guardianDetails.idPhotoPath && fs.existsSync(requestDoc.guardianDetails.idPhotoPath)) {
            fs.unlinkSync(requestDoc.guardianDetails.idPhotoPath);
        }

        const guardianName = `${requestDoc.guardianDetails.firstName} ${requestDoc.guardianDetails.lastName}`;
        await GuardianRequest.findByIdAndDelete(requestId);

        const auditLog = new Audit({
          user_id: parentUserId,
          full_name: fullName,
          role: req.user.role,
          action: "Cancel Guardian Request",
          target: `Cancelled request for: ${guardianName}`
        });
        await auditLog.save();

        return res.status(200).json({ message: "Guardian application successfully cancelled." });

    } catch (error) {
        console.error("Cancel Request Error:", error);
        return res.status(500).json({ message: "Server error while cancelling request." });
    }
});

router.get('/api/guardian/children', isAuthenticated, async (req, res) => {
  try {
    const guardianNumericId = req.user.user_id;
    const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

    const studentToReset = await Student.findOne({ 
      user_id: guardianNumericId, 
      last_reset_date: { $ne: todayDate } 
    });

    let resetHappened = false;
    if (studentToReset) {
        await Student.updateMany(
            { 
              user_id: guardianNumericId, 
              last_reset_date: { $ne: todayDate } 
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

    const assignedChildren = await Student.find({ 
      user_id: guardianNumericId 
    }).populate({
      path: 'section_details',
      populate: { 
        path: 'user_details',
        select: 'first_name last_name email'
      }
    });

    return res.status(200).json({
      success: resetHappened, 
      children: assignedChildren || []
    });

  } catch (error) {
    console.error("Error fetching guardian's children:", error);
    return res.status(500).json({ message: "Server error while fetching assigned students." });
  }
});

// ==========================================
// GUARDIAN ACTION: COMPLETE FIRST-TIME SETUP (UPDATED FOR BIOMETRICS)
// ==========================================
router.put(
  '/api/guardian/setup', 
  isAuthenticated, 
  // THE FIX: Use upload.fields to catch both the cropped profile pic and the raw facial capture
  upload.fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'facialCapture', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { 
        username, password, firstName, lastName,
        email, contact, houseUnit, street, barangay, city, zipCode,
        facialDescriptor // <-- Received as stringified JSON
      } = req.body;

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found." });

      // Update Basic Info
      if (username) user.username = username;
      if (firstName) user.first_name = firstName;
      if (lastName) user.last_name = lastName;
      if (email) user.email = email;
      if (contact) user.phone_number = contact;
      if (password) user.password = await hashPassword(password);

      const fullAddress = [houseUnit, street, barangay, city, zipCode].filter(Boolean).join(', ');
      if (fullAddress) user.address = fullAddress;

      // Extract and save the files
      if (req.files) {
        if (req.files['profilePic']) {
            user.profile_picture = req.files['profilePic'][0].path;
        }
        if (req.files['facialCapture']) {
            user.facial_capture_image = req.files['facialCapture'][0].path;
        }
      }

      // Parse and save the mathematical Face Descriptor
      if (facialDescriptor) {
          user.facial_descriptor = JSON.parse(facialDescriptor);
      }

      user.is_first_login = false;
      await user.save();

      const auditLog = new Audit({
        user_id: user.user_id,
        full_name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        action: "Account Setup",
        target: `Completed initial security setup with Biometrics`
      });
      await auditLog.save();

      return res.status(200).json({ 
        message: "Security setup complete! Account fully verified.",
        user 
      });

    } catch (error) {
      console.error("Guardian Setup Error:", error);
      return res.status(500).json({ message: "Server error during setup." });
    }
});

router.get(
  '/api/parent/guardian-requests/history', 
  isAuthenticated, 
  async (req, res) => {
    try {
        const parentId = req.user._id;

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

router.put('/api/parent/guardian-requests/:id/revoke', isAuthenticated, async (req, res) => {
    try {
        const requestId = req.params.id;
        const parentId = req.user._id;
        const parentUserId = req.user.user_id;
        const fullName = `${req.user.first_name} ${req.user.last_name}`;

        const requestDoc = await GuardianRequest.findOne({
            _id: requestId,
            parent: parentId,
            status: 'approved'
        });

        if (!requestDoc) {
            return res.status(404).json({ message: "Approved request not found." });
        }
        
        const guardianName = `${requestDoc.guardianDetails.firstName} ${requestDoc.guardianDetails.lastName}`;
        
        let guardianUser;
        if (requestDoc.guardianDetails.createdUserId) {
            guardianUser = await User.findById(requestDoc.guardianDetails.createdUserId);
        } else {
            guardianUser = await User.findOne({ username: requestDoc.guardianDetails.tempUsername });
        }

        if (guardianUser) {
            await Student.findByIdAndUpdate(requestDoc.student, {
                $pull: { user_id: guardianUser.user_id } 
            });
            guardianUser.is_archive = true;
            await guardianUser.save();
        }

        requestDoc.status = 'revoked';
        await requestDoc.save();

        const auditLog = new Audit({
          user_id: parentUserId,
          full_name: fullName,
          role: req.user.role,
          action: "Revoke Guardian Access",
          target: `Revoked access for ${guardianName}`
        });
        await auditLog.save();

        return res.status(200).json({ message: "Guardian access has been permanently revoked." });

    } catch (error) {
        console.error("Revoke Error:", error);
        return res.status(500).json({ message: "Server error during revocation." });
    }
});

export default router;