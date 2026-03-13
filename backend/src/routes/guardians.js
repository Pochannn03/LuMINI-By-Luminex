import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { Router } from "express";
import { createUserValidationSchema } from '../validation/userValidation.js'
import { validationResult, matchedData, checkSchema} from "express-validator";
import { hashPassword } from "../utils/passwordUtils.js";
import { User } from "../models/users.js";
import { Student } from "../models/students.js";
import { Section } from "../models/sections.js";
import { Audit } from "../models/audits.js";
import { Notification } from "../models/notification.js";
import GuardianRequest from "../models/guardianRequest.js"; 
import multer from "multer";
import path from "path";
import fs from "fs";

// --- UPDATED IMPORTS FOR EMAILS ---
import { 
  sendGuardianVerifiedEmail, 
  sendGuardianFinalizedEmail, 
  sendGuardianSetupCompleteEmail,
  sendGuardianRejectedEmail
} from '../utils/emailService.js';

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

        let studentIdsArray = [];
        try {
            studentIdsArray = JSON.parse(req.body.student_ids);
        } catch (e) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Invalid student selection format." });
        }

        if (!Array.isArray(studentIdsArray) || studentIdsArray.length === 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Please select at least one student." });
        }

        const allParentStudents = await Student.find({ user_id: parentCustomId });
        const allLinkedUserIds = allParentStudents.flatMap(s => s.user_id);
        const uniqueGuardianIds = [...new Set(allLinkedUserIds)].filter(id => id !== parentCustomId);
        
        const activeGuardiansCount = await User.countDocuments({
            user_id: { $in: uniqueGuardianIds },
            relationship: "Guardian",
            is_archive: false
        });

        const pendingRequestsCount = await GuardianRequest.countDocuments({
            parent: parentObjectId,
            status: { $in: ['pending', 'teacher_approved'] }
        });

        const totalGuardianCount = activeGuardiansCount + pendingRequestsCount;

        if (totalGuardianCount >= 3) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(403).json({ 
                message: "Guardian limit reached. You can only have a maximum of 3 authorized guardians. Please revoke access or cancel a pending request to add a new one." 
            });
        }

        const idPhotoPath = req.file ? req.file.path : null;
        if (!idPhotoPath) return res.status(400).json({ message: "ID photo is required." });

        const hashedPassword = await hashPassword(password);

        const linkedStudents = await Student.find({ 
            student_id: { $in: studentIdsArray },
            user_id: parentCustomId 
        });

        if (linkedStudents.length === 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: "Selected students not found or not linked." });
        }

        const studentObjectIds = linkedStudents.map(student => student._id);
        const requestedChildNames = linkedStudents.map(student => student.first_name);

        let primaryTeacherId = null;
        let primaryTeacherCustomId = null;

        console.log("🔍 --- STARTING TEACHER SEARCH ---");
        
        for (const student of linkedStudents) {
            console.log(`Checking student: ${student.first_name}, Section ID: ${student.section_id}`);
            
            if (student.section_id && !primaryTeacherId) {
                const section = await Section.findOne({ section_id: Number(student.section_id) }); 
                
                if (section) {
                    console.log(`Found Section: ${section.section_name}, Teacher User ID: ${section.user_id}`);
                    
                    if (section.user_id) {
                        const teacher = await User.findOne({ user_id: Number(section.user_id) });
                        
                        if (teacher) {
                            primaryTeacherId = teacher._id;
                            primaryTeacherCustomId = teacher.user_id;
                            console.log(`✅ Teacher Found! ID: ${primaryTeacherCustomId}`);
                        } else {
                            console.log("❌ Teacher user_id exists in section, but no User found in DB.");
                        }
                    } else {
                        console.log("❌ Section found, but no user_id (teacher) is assigned to it.");
                    }
                } else {
                    console.log("❌ Section ID exists on student, but Section not found in DB.");
                }
            } else if (!student.section_id) {
                console.log("❌ This student has no section_id assigned.");
            }
        }
        
        console.log("🔍 --- END TEACHER SEARCH ---");
        console.log("Final primaryTeacherCustomId:", primaryTeacherCustomId);

        const newRequest = new GuardianRequest({
            parent: parentObjectId, 
            students: studentObjectIds, 
            teacher: primaryTeacherId, 
            guardianDetails: {
                firstName, lastName, phone, role,
                tempUsername: username,
                tempPassword: hashedPassword,
                idPhotoPath: idPhotoPath
            }
        });

        await newRequest.save();

        if (primaryTeacherCustomId) {
            try {
                const newNotif = new Notification({
                    recipient_id: primaryTeacherCustomId, 
                    sender_id: req.user.user_id,
                    sender_details: parentObjectId,       
                    title: "New Guardian Request",
                    message: `${req.user.first_name} ${req.user.last_name} requested to add ${firstName} ${lastName} as a guardian for ${requestedChildNames.join(', ')}.`,
                    type: "System",
                    is_read: false
                });
                await newNotif.save();

                const populatedNotif = await Notification.findById(newNotif._id)
                    .populate('sender_details', 'first_name last_name profile_picture');

                const io = req.app.get('socketio'); 
                if (io) {
                    const targetRoom = `user_${primaryTeacherCustomId}`;
                    io.to(targetRoom).emit('new_notification', populatedNotif);
                } else {
                    console.error("⚠️ Socket.io instance not found on req.app");
                }
            } catch (notifErr) {
                console.error("Notification Generation Error:", notifErr);
            }
        }

        const auditLog = new Audit({
          user_id: req.user.user_id,
          full_name: `${req.user.first_name} ${req.user.last_name}`,
          role: req.user.role,
          action: "Submit Guardian Request",
          target: `Submitted request for ${firstName} ${lastName} (Children: ${requestedChildNames.join(', ')})`
        });
        await auditLog.save();

        return res.status(201).json({ 
            message: "Guardian request submitted successfully!",
            request: newRequest
        });

    } catch (error) {
        console.error("Submit Request Error:", error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        
        // Handle duplicate username explicitly if it slips through here
        if (error.code === 11000 && error.keyPattern && error.keyPattern.username) {
            return res.status(400).json({ message: "This username is already taken. Please choose a different one." });
        }

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
            .populate('students', 'first_name last_name') 
            .sort({ createdAt: -1 }); 

        return res.status(200).json(requests);
    } catch (error) {
        console.error("Error fetching pending requests:", error);
        return res.status(500).json({ message: "Server error while fetching requests." });
    }
});

// ==========================================
// TIER 1: TEACHER VERIFIES REQUEST
// ==========================================
router.put('/api/teacher/guardian-requests/:id/approve', 
  isAuthenticated,
  hasRole('admin'),
  async (req, res) => {
    try {
        const requestId = req.params.id;
        const currentUserId = Number(req.user.user_id);
        const teacherName = `${req.user.first_name} ${req.user.last_name}`;

        const requestDoc = await GuardianRequest.findById(requestId).populate('parent').populate('students');
        if (!requestDoc || requestDoc.status !== 'pending') {
            return res.status(404).json({ message: "Request not found or already processed." });
        }

        requestDoc.status = 'teacher_approved';
        await requestDoc.save();
        
        const io = req.app.get('socketio');

        // Notify Parent (In-App + Email)
        if (requestDoc.parent) {
            const notification = new Notification({
                recipient_id: Number(requestDoc.parent.user_id), 
                sender_id: currentUserId,
                type: 'System', 
                title: 'Guardian Request Verified',
                message: `Teacher ${teacherName} has verified your request. It is now pending final approval from the Superadmin.`,
                is_read: false
            });

            const savedNotif = await notification.save();
            req.app.get('socketio').emit('new_notification', savedNotif);

            // SEND EMAIL
            if (requestDoc.parent.email) {
                const guardianName = `${requestDoc.guardianDetails.firstName} ${requestDoc.guardianDetails.lastName}`;
                const childNames = requestDoc.students.map(s => s.first_name).join(', ');
                await sendGuardianVerifiedEmail(requestDoc.parent.email, requestDoc.parent.first_name, guardianName, childNames);
            }
        }

        const superAdmins = await User.find({ role: 'superadmin', is_archive: false });

        for (const admin of superAdmins) {
            const adminNotif = new Notification({
                recipient_id: Number(admin.user_id),
                sender_id: currentUserId,
                type: 'System',
                title: 'Guardian Request Needs Final Approval',
                message: `Teacher ${teacherName} verified a guardian request for ${requestDoc.guardianDetails.firstName} ${requestDoc.guardianDetails.lastName}. Awaiting your final approval.`,
                is_read: false
            });

            const savedAdminNotif = await adminNotif.save();

            const populatedAdminNotif = await Notification.findById(savedAdminNotif._id)
                .populate('sender_details', 'first_name last_name profile_picture');

            if (io) {
                io.to(`user_${admin.user_id}`).emit('new_notification', populatedAdminNotif);
            }
        }

        const auditLog = new Audit({
          user_id: req.user.user_id,
          full_name: `${req.user.first_name} ${req.user.last_name}`,
          role: req.user.role,
          action: "Verify Guardian Request",
          target: `Forwarded application for ${requestDoc.guardianDetails.firstName} ${requestDoc.guardianDetails.lastName} to Superadmin`
        });
        await auditLog.save();

        return res.status(200).json({ message: "Request verified and forwarded to Superadmin!" });

    } catch (error) {
        console.error("Pre-Approval Error:", error);
        return res.status(500).json({ message: "Server error during pre-approval." });
    }
});

// ==========================================
// TIER 1: TEACHER REJECTS REQUEST
// ==========================================
router.put('/api/teacher/guardian-requests/:id/reject', 
  isAuthenticated,
  hasRole('admin'),
  async (req, res) => {
    try {
        const requestId = req.params.id;
        const { reason } = req.body; 
        
        if (!reason) return res.status(400).json({ message: "Rejection reason is required." });

        const currentUserId = Number(req.user.user_id);
        const teacherName = `Teacher ${req.user.first_name} ${req.user.last_name}`;

        const requestDoc = await GuardianRequest.findById(requestId).populate('parent');
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
          target: `Rejected request for: ${guardianName}. Reason: ${reason}`
        });
        await auditLog.save();

        // Notify Parent (In-App + Email)
        if (requestDoc.parent) {
            const notification = new Notification({
                recipient_id: Number(requestDoc.parent.user_id), 
                sender_id: currentUserId,
                type: 'Alert',
                title: 'Guardian Request Rejected',
                message: `Your request for ${guardianName} to become an authorized personnel has been rejected by ${teacherName}. Reason: ${reason}`,
                is_read: false
            });

            const savedNotif = await notification.save();

            const populatedNotif = await Notification.findById(savedNotif._id)
                .populate('sender_details', 'first_name last_name profile_picture');

            const io = req.app.get('socketio');
            if (io) {
                io.to(`user_${requestDoc.parent.user_id}`).emit('new_notification', populatedNotif);
            }

            // SEND EMAIL
            if (requestDoc.parent.email) {
                await sendGuardianRejectedEmail(requestDoc.parent.email, requestDoc.parent.first_name, guardianName, "Teacher", reason);
            }
        }

        // Cleanup uploaded ID
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
              status: { $in: ['teacher_approved', 'approved', 'rejected', 'revoked'] },
              teacher: teacherMongoId 
            })
            .populate('parent', 'first_name last_name profile_picture')
            .populate('students', 'first_name last_name')
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
            status: { $in: ['pending', 'teacher_approved'] } 
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
            status: { $in: ['pending', 'teacher_approved'] }
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
// GUARDIAN ACTION: COMPLETE FIRST-TIME SETUP
// ==========================================
router.put(
  '/api/guardian/setup', 
  isAuthenticated, 
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
        facialDescriptor 
      } = req.body;

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found." });

      if (username) user.username = username;
      if (firstName) user.first_name = firstName;
      if (lastName) user.last_name = lastName;
      if (email) user.email = email;
      if (contact) user.phone_number = contact;
      if (password) user.password = await hashPassword(password);

      const fullAddress = [houseUnit, street, barangay, city, zipCode].filter(Boolean).join(', ');
      if (fullAddress) user.address = fullAddress;

      if (req.files) {
        if (req.files['profilePic']) {
            user.profile_picture = req.files['profilePic'][0].path;
        }
        if (req.files['facialCapture']) {
            user.facial_capture_image = req.files['facialCapture'][0].path;
        }
      }

      if (facialDescriptor) {
          user.facial_descriptor = JSON.parse(facialDescriptor);
      }

      user.is_first_login = false;
      await user.save(); // <--- ERROR WAS TRIGGERED HERE

      // Find the original request so we can email the parent
      const originalRequest = await GuardianRequest.findOne({ 'guardianDetails.createdUserId': userId }).populate('parent');
      
      if (originalRequest && originalRequest.parent && originalRequest.parent.email) {
          await sendGuardianSetupCompleteEmail(
              originalRequest.parent.email,
              originalRequest.parent.first_name,
              `${user.first_name} ${user.last_name}`
          );
      }

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
      
      // --- THE FIX: CATCH MONGODB DUPLICATE KEY ERRORS ---
      if (error.code === 11000) {
        if (error.keyPattern && error.keyPattern.username) {
            return res.status(400).json({ message: "This username is already taken. Please choose a different one." });
        }
        if (error.keyPattern && error.keyPattern.email) {
            return res.status(400).json({ message: "This email is already registered to another account." });
        }
      }

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
        })
        .populate('guardianDetails.createdUserId', 'first_name last_name username profile_picture is_first_login phone_number')
        .sort({ updatedAt: -1 });

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
        }).populate('teacher');

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
            if (requestDoc.students && requestDoc.students.length > 0) {
                await Student.updateMany(
                    { _id: { $in: requestDoc.students } },
                    { $pull: { user_id: guardianUser.user_id } } 
                );
            }
            guardianUser.is_archive = true;
            await guardianUser.save();
        }

        requestDoc.status = 'revoked';
        await requestDoc.save();

        const io = req.app.get('socketio');
        const notificationMessage = `Parent ${fullName} has revoked guardian access for ${guardianName}.`;

        if (requestDoc.teacher && requestDoc.teacher.user_id) {
            const teacherNotif = new Notification({
                recipient_id: Number(requestDoc.teacher.user_id), 
                sender_id: parentUserId,
                type: 'Alert',
                title: 'Guardian Access Revoked',
                message: notificationMessage,
                is_read: false
            });

            const savedTeacherNotif = await teacherNotif.save();
            const populatedTeacherNotif = await Notification.findById(savedTeacherNotif._id)
                .populate('sender_details', 'first_name last_name profile_picture');

            if (io) {
                io.to(`user_${requestDoc.teacher.user_id}`).emit('new_notification', populatedTeacherNotif);
            }
        }

        const superAdmins = await User.find({ 
            $or: [
                { role: 'superadmin' }, 
                { relationship: 'SuperAdmin' }
            ],
            is_archive: false 
        });

        for (const admin of superAdmins) {
            const adminNotif = new Notification({
                recipient_id: Number(admin.user_id),
                sender_id: parentUserId,
                type: 'Alert',
                title: 'Guardian Access Revoked',
                message: notificationMessage,
                is_read: false
            });

            const savedAdminNotif = await adminNotif.save();
            const populatedAdminNotif = await Notification.findById(savedAdminNotif._id)
                .populate('sender_details', 'first_name last_name profile_picture');

            if (io) {
                io.to(`user_${admin.user_id}`).emit('new_notification', populatedAdminNotif);
            }
        }

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

// =========================================================================
// TIER 2: SUPERADMIN ROUTES: FINAL GUARDIAN REGISTRATION
// =========================================================================

// 1. GET PENDING FINAL APPROVALS
router.get('/api/superadmin/guardian-requests/pending-final', isAuthenticated, hasRole('superadmin'), async (req, res) => {
    try {
        const requests = await GuardianRequest.find({ status: 'teacher_approved' })
            .populate('parent', 'first_name last_name profile_picture')
            .populate('students', 'first_name last_name student_id') 
            .populate('teacher', 'first_name last_name') 
            .sort({ updatedAt: -1 }); 

        return res.status(200).json(requests);
    } catch (error) {
        console.error("Error fetching superadmin pending requests:", error);
        return res.status(500).json({ message: "Server error while fetching requests." });
    }
});

// 2. GET REGISTRATION HISTORY
router.get('/api/superadmin/guardian-requests/history', isAuthenticated, hasRole('superadmin'), async (req, res) => {
    try {
        const history = await GuardianRequest.find({ 
              status: { $in: ['approved', 'rejected', 'revoked'] } 
            })
            .populate('parent', 'first_name last_name profile_picture')
            .populate('students', 'first_name last_name student_id') 
            .populate('teacher', 'first_name last_name')
            .sort({ updatedAt: -1 }); 

        return res.status(200).json(history);
    } catch (error) {
        console.error("Error fetching superadmin history:", error);
        return res.status(500).json({ message: "Server error while fetching history." });
    }
});

// 3. FINAL APPROVE (CREATES THE ACCOUNT)
router.put('/api/superadmin/guardian-requests/:id/final-approve', isAuthenticated, hasRole('superadmin'), async (req, res) => {
    try {
        const requestId = req.params.id;
        const currentUserId = Number(req.user.user_id);

        const requestDoc = await GuardianRequest.findById(requestId)
                                                .populate('parent')
                                                .populate('students')
                                                .populate('teacher');
        if (!requestDoc || requestDoc.status !== 'teacher_approved') {
            return res.status(404).json({ message: "Request not found or not ready for final approval." });
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
            is_approved: true
        });

        const savedGuardian = await newGuardian.save();

        if (savedGuardian.user_id && requestDoc.students && requestDoc.students.length > 0) {
            await Student.updateMany(
                { _id: { $in: requestDoc.students } }, 
                { $push: { user_id: savedGuardian.user_id } } 
            );
        }

        requestDoc.status = 'approved';
        requestDoc.guardianDetails.createdUserId = savedGuardian._id; 
        await requestDoc.save();

        const io = req.app.get('socketio');
        const guardianFullName = `${savedGuardian.first_name} ${savedGuardian.last_name}`;

        // --- 2. NOTIFY PARENT (Targeted Socket) ---
        if (requestDoc.parent) {
            const parentNotif = new Notification({
                recipient_id: Number(requestDoc.parent.user_id), 
                sender_id: currentUserId,
                type: 'System', 
                title: 'Guardian Registration Finalized',
                message: `SuperAdmin has officially registered ${guardianFullName}. Their guardian account is now active.`,
                is_read: false
            });
            const savedParentNotif = await parentNotif.save();
            const populatedParentNotif = await Notification.findById(savedParentNotif._id)
                .populate('sender_details', 'first_name last_name profile_picture');

            if (io) {
                io.to(`user_${requestDoc.parent.user_id}`).emit('new_notification', populatedParentNotif);
            }

            // EMAIL logic remains the same
            if (requestDoc.parent.email) {
                const childNames = requestDoc.students.map(s => s.first_name).join(', ');
                await sendGuardianFinalizedEmail(requestDoc.parent.email, requestDoc.parent.first_name, guardianFullName, childNames, requestDoc.guardianDetails.tempUsername);
            }
        }

        // --- 3. NOTIFY TEACHER (Targeted Socket) ---
        if (requestDoc.teacher && requestDoc.teacher.user_id) {
            const teacherNotif = new Notification({
                recipient_id: Number(requestDoc.teacher.user_id),
                sender_id: currentUserId,
                type: 'System',
                title: 'Guardian Request Approved',
                message: `The guardian request for ${guardianFullName} Parent: ${requestDoc.parent?.first_name} ${requestDoc.parent?.last_name} has been finalized by SuperAdmin.`,
                is_read: false
            });
            const savedTeacherNotif = await teacherNotif.save();
            const populatedTeacherNotif = await Notification.findById(savedTeacherNotif._id)
                .populate('sender_details', 'first_name last_name profile_picture');

            if (io) {
                io.to(`user_${requestDoc.teacher.user_id}`).emit('new_notification', populatedTeacherNotif);
            }
        }

        const auditLog = new Audit({
          user_id: req.user.user_id,
          full_name: `${req.user.first_name} ${req.user.last_name}`,
          role: req.user.role,
          action: "Finalize Guardian Registration",
          target: `Created system account for ${savedGuardian.first_name} ${savedGuardian.last_name}`
        });
        await auditLog.save();

        return res.status(200).json({ message: "Guardian successfully approved and account created!" });

    } catch (error) {
        console.error("Final Approval Error:", error);
        return res.status(500).json({ message: "Server error during final approval." });
    }
});

// ==========================================
// 4. FINAL REJECT (SUPERADMIN)
// ==========================================
router.put('/api/superadmin/guardian-requests/:id/final-reject', isAuthenticated, hasRole('superadmin'), async (req, res) => {
    try {
        const requestId = req.params.id;
        const { reason } = req.body; 
        
        if (!reason) return res.status(400).json({ message: "Rejection reason is required." });

        const currentUserId = Number(req.user.user_id);

        const requestDoc = await GuardianRequest.findById(requestId)
                                                .populate('parent')
                                                .populate('teacher');

        if (!requestDoc || requestDoc.status !== 'teacher_approved') {
            return res.status(404).json({ message: "Request not found or not ready for final review." });
        }

        const guardianName = `${requestDoc.guardianDetails.firstName} ${requestDoc.guardianDetails.lastName}`;

        requestDoc.status = 'rejected';
        await requestDoc.save();

        // Notify Parent (In-App + Email)
        if (requestDoc.parent && requestDoc.parent.user_id) {
            // --- THE FIX: ADDED REASON TO IN-APP NOTIFICATION ---
            const notification = new Notification({
                recipient_id: Number(requestDoc.parent.user_id), 
                sender_id: currentUserId,
                type: 'Alert', // Renders red on the frontend
                title: 'Guardian Registration Rejected',
                message: `Your request for ${guardianName} to become an authorized personnel has been rejected by the Superadmin. Reason: ${reason}`,
                is_read: false
            });
            const savedNotif = await notification.save();
            req.app.get('socketio').emit('new_notification', savedNotif);

            // SEND EMAIL
            if (requestDoc.parent.email) {
                await sendGuardianRejectedEmail(requestDoc.parent.email, requestDoc.parent.first_name, guardianName, "Superadmin", reason);
            }
        }

        // Cleanup ID photo
        if (requestDoc.guardianDetails.idPhotoPath && fs.existsSync(requestDoc.guardianDetails.idPhotoPath)) {
            fs.unlinkSync(requestDoc.guardianDetails.idPhotoPath);
        }

        const auditLog = new Audit({
          user_id: req.user.user_id,
          full_name: `${req.user.first_name} ${req.user.last_name}`,
          role: req.user.role,
          action: "Reject Guardian Registration",
          target: `Rejected final registration for: ${guardianName}. Reason: ${reason}`
        });
        await auditLog.save();

        return res.status(200).json({ message: "Guardian registration rejected." });

    } catch (error) {
        console.error("Final Rejection Error:", error);
        return res.status(500).json({ message: "Server error during final rejection." });
    }
});

export default router;