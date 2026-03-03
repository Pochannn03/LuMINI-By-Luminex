import { Router } from "express";
import { validationResult, matchedData, checkSchema} from "express-validator";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { hashPassword } from "../utils/passwordUtils.js";
import { createTeacherValidationSchema } from '../validation/teacherValidation.js'
import { User } from "../models/users.js";
import { Section } from "../models/sections.js";
import { Student } from "../models/students.js";
import { Audit } from "../models/audits.js";
import { Notification } from "../models/notification.js";
import { sendIprogBulkSMS } from "../utils/smsProvider.js"; 
// ---> NEW EMAIL IMPORT
import { sendEmergencyEmailAlert } from "../utils/emailService.js"; 
import bcrypt from 'bcrypt';
import multer from "multer";
import path from "path";
import fs from "fs";

// --- BUG FIX: Create a custom schema for UPDATING so the password is optional ---
const updateTeacherValidationSchema = { ...createTeacherValidationSchema };
if (updateTeacherValidationSchema.password) {
  updateTeacherValidationSchema.password = {
    ...updateTeacherValidationSchema.password,
    optional: { options: { checkFalsy: true } } // Tells the backend to ignore if blank
  };
  // Strip out strict 'required' checks if they exist in your base schema
  if (updateTeacherValidationSchema.password.notEmpty) {
    delete updateTeacherValidationSchema.password.notEmpty;
  }
}
// --------------------------------------------------------------------------------

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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage: storage });

const cleanupFiles = (files) => {
  if (!files) return;
  Object.values(files).forEach(fileArray => {
    fileArray.forEach(file => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });
  });
};

router.post('/api/teachers',
  upload.fields([
    { name: 'profile_photo', maxCount: 1 },
    { name: 'school_id_photo', maxCount: 1 },
    { name: 'valid_id_photo', maxCount: 1 }
  ]),
  ...checkSchema(createTeacherValidationSchema), 
  async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      cleanupFiles(req.files); 
      return res.status(400).send({ errors: result.array() });
    }

    const data = matchedData(req);
    
    // --- MANUAL DUPLICATE CHECK ---
    const existingEmail = await User.findOne({ email: data.email });
    if (existingEmail) {
      cleanupFiles(req.files);
      return res.status(409).json({ success: false, msg: "This email is already registered to an existing user." });
    }

    const existingUsername = await User.findOne({ username: data.username });
    if (existingUsername) {
      cleanupFiles(req.files);
      return res.status(409).json({ success: false, msg: "This username is already taken." });
    }
    // -----------------------------------------------

    data.password = await hashPassword(data.password);
    data.role = "admin";
    data.is_archive = true; 

    if (req.files) {
      if (req.files['profile_photo'] && req.files['profile_photo'].length > 0) {
        data.profile_picture = req.files['profile_photo'][0].path; 
      }
      if (req.files['school_id_photo'] && req.files['school_id_photo'].length > 0) {
        data.school_id_photo = req.files['school_id_photo'][0].path; 
      }
      if (req.files['valid_id_photo'] && req.files['valid_id_photo'].length > 0) {
        data.valid_id_photo = req.files['valid_id_photo'][0].path; 
      }
    }

    const newUser = new User(data);

    try {
      const savedUser = await newUser.save();
      
      const auditLog = new Audit({
        user_id: req.user?.user_id || savedUser.user_id, 
        full_name: req.user ? `${req.user.first_name} ${req.user.last_name}` : `${savedUser.first_name} ${savedUser.last_name}`,
        role: req.user?.role || savedUser.role,
        action: "Register Teacher",
        target: `Registered teacher ${savedUser.first_name} ${savedUser.last_name}`
      });
      await auditLog.save();

      const io = req.app.get('socketio');
      if (io) io.emit('teacher_registered', savedUser);

      return res.status(201).send({ msg: "Teacher registered successfully!", user: savedUser });
    } catch (err) {
      cleanupFiles(req.files);
      console.error("MONGOOSE ERROR:", err);
      
      if (err.code === 11000) {
        const duplicateField = Object.keys(err.keyPattern)[0]; 
        return res.status(409).send({ success: false, msg: `This ${duplicateField} is already registered.` });
      }
      return res.status(400).send({ msg: "Database Registration failed", error: err.message });
    }
  }
);

// GET TEACHER'S DATA 
router.get('/api/teachers',
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {

  try{
    const teachers = await User.find({ relationship: 'Teacher', is_archive: false })
                                
    if (!teachers || teachers.length === 0) {
      return res.status(200).json({ success: true, teachers: [] });
    }

    res.status(200).json({ success: true, teachers });

  } catch(err) {
    console.error("Error fetching teachers:", err);
    res.status(500).json({ msg: "Server error while fetching teachers" });
  }
});

// CREATE TEACHER FROM MODAL (SUPERADMIN)
router.post('/api/teachers/modal',
  isAuthenticated,
  hasRole('superadmin'),
  upload.single('profile_photo'),
  ...checkSchema(createTeacherValidationSchema),
  async (req, res) => {

    const result = validationResult(req)

    if (!result.isEmpty()) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).send({ errors: result.array() });
    }

    const data = matchedData(req);
    console.log("Received Valid Data:", data);

    // --- MANUAL DUPLICATE CHECK ---
    const existingEmail = await User.findOne({ email: data.email });
    if (existingEmail) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(409).json({ success: false, msg: "This email is already registered to an existing user." });
    }

    const existingUsername = await User.findOne({ username: data.username });
    if (existingUsername) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(409).json({ success: false, msg: "This username is already taken." });
    }
    // -----------------------------------------------

    data.password = await hashPassword(data.password);
    data.role = "admin";
    data.is_archive = false;

    if (req.file) {
      data.profile_picture = req.file.path; 
    }

    const newUser = new User(data);

    try{
      const savedUser = await newUser.save();
      const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: "Register Teacher",
        target: `Registered teacher ${savedUser.first_name} ${savedUser.last_name}`
      });
      await auditLog.save();
      const io = req.app.get('socketio');
      io.emit('teacher_added', savedUser);
      return res.status(201).send({ msg: "Teacher registered successfully!", user: savedUser });
    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      console.log("Teacher Registration Catch Error:", err);
      
      if (err.code === 11000) {
        const duplicateField = Object.keys(err.keyPattern)[0]; 
        return res.status(409).send({ success: false, msg: `This ${duplicateField} is already registered.` });
      }

      return res.status(400).send({ msg: "Registration failed", error: err.message });
    }
});

// UPDATE/EDIT TEACHER
router.put('/api/teacher/:id',
  isAuthenticated,
  hasRole('superadmin'),
  upload.single('profile_photo'),
  ...checkSchema(updateTeacherValidationSchema), 
  async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      if (req.file) fs.unlinkSync(req.file.path); 
      return res.status(400).send({ errors: result.array() });
    }
    
    const userId = req.params.id;
    const updateData = {
        ...req.body
    };

    // --- PREVENT DUPLICATING DURING EDIT ---
    const existingEmail = await User.findOne({ email: updateData.email, _id: { $ne: userId } });
    if (existingEmail) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(409).json({ success: false, msg: "This email is already registered to another user." });
    }

    const existingUsername = await User.findOne({ username: updateData.username, _id: { $ne: userId } });
    if (existingUsername) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(409).json({ success: false, msg: "This username is already taken by another user." });
    }
    // --------------------------------------------------------
    
    if (req.file) {
        updateData.profile_picture = req.file.path; 
    }

    if (updateData.password) {
        try {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        } catch (hashError) {
            return res.status(500).json({ success: false, msg: "Error hashing password" });
        }
    } else {
        delete updateData.password;
    }

    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId, 
        updateData, 
        { 
          new: true,          
          runValidators: true  
        }
      )

      if (!updatedUser) {
        return res.status(404).json({ success: false, msg: "Teacher not found" });
      }

      const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: "Edit Teacher Info",
        target: `Updated teacher ${updatedUser.first_name} ${updatedUser.last_name}`
      });
      await auditLog.save();

      return res.status(200).json({ 
        success: true, 
        msg: "Teacher updated successfully!", 
        class: updatedUser 
      });

    } catch (err) {
      console.error("Update Error:", err);
      if (err.code === 11000) {
        const duplicateField = Object.keys(err.keyPattern)[0]; 
        return res.status(409).send({ success: false, msg: `This ${duplicateField} is already registered.` });
      }
      return res.status(500).json({ success: false, msg: "Update failed", error: err.message });
    }
})

// DELETE (is_archive: true) TEACHER
router.put('/api/teacher/archive/:id', 
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    const userId = req.params.id;

    try {
      const archivedUser = await User.findByIdAndUpdate(
        userId, 
        { is_archive: true }, 
        { new: true }
      );

      if (!archivedUser) {
        return res.status(404).json({ success: false, msg: "Teacher not found" });
      }

      const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: "Archive Teacher",
        target: `Archived teacher ${archivedUser.first_name} ${archivedUser.last_name}`
      });
      await auditLog.save();

      return res.status(200).json({ 
        success: true, 
        msg: "Teacher archived successfully.", 
        user: archivedUser 
      });

    } catch (err) {
      console.error("Archive Error:", err);
      return res.status(500).json({ success: false, msg: "Failed to archive teacher", error: err.message });
    }
});

router.patch('/api/teacher/approval/:id', 
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    try {
      const teacherId = req.params.id;
      const updatedTeacher = await User.findByIdAndUpdate(
        teacherId, 
        { is_archive: false }, 
      );

      if (!updatedTeacher) {
        return res.status(404).json({ success: false, msg: "Teacher not found" });
      }

      const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: "Approve Teacher",
        target: `Approved teacher ${updatedTeacher.first_name} ${updatedTeacher.last_name}`
      });
      await auditLog.save();

      const io = req.app.get('socketio');
      io.emit('teacher_processed', { 
        id: teacherId, 
        action: 'approved',
        teacher: updatedTeacher 
      });

      return res.status(200).json({ 
        success: true, 
        msg: `${updatedTeacher.first_name} ${updatedTeacher.last_name} has been approved.` 
      });
    } catch (err) {
      return res.status(500).json({ success: false, msg: "Approval failed", error: err.message });
    }
});

router.delete('/api/teacher/rejection/:id',
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    try {
      const teacherId = req.params.id;
      const deletedTeacher = await User.findByIdAndDelete(teacherId);

      if (!deletedTeacher) {
        return res.status(404).json({ success: false, msg: "Teacher not found" });
      }

      const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: "Reject Teacher Registration",
        target: `Rejected and Deleted ${deletedTeacher.first_name} ${deletedTeacher.last_name}`
      });
      await auditLog.save();

      const io = req.app.get('socketio');
      io.emit('teacher_processed', { 
        id: teacherId, 
        action: 'rejected' 
      });

      return res.status(200).json({ 
        success: true, 
        msg: "Registration request rejected and account deleted." 
      });
    } catch (err) {
      return res.status(500).json({ success: false, msg: "Rejection failed", error: err.message });
    }
});

router.get('/api/teacher/students', 
  isAuthenticated,
  hasRole('admin'),
  async (req, res) => {
    try {
      const sections = await Section.find({ user_id: req.user.user_id });

      if (!sections || sections.length === 0) {
        return res.status(200).json({ 
          success: true, 
          students: [], 
          msg: "No assigned sections found for this teacher." 
        });
      }

      const sectionIds = sections.map(sec => sec.section_id);

      const students = await Student.find({ 
        section_id: { $in: sectionIds },
        is_archive: false 
      }).populate('user_details');

      res.status(200).json({
        success: true,
        count: students.length,
        students
      });

    } catch (error) {
      console.error("Teacher Student Fetch Error:", error);
      res.status(500).json({ success: false, msg: "Server Error" });
    }
  }
);


// =========================================================================
// TEACHER ACTION - EMERGENCY SMS & EMAIL BROADCAST (WITH TRACER LOGS)
// =========================================================================
router.post('/api/teacher/emergency-broadcast', 
  isAuthenticated, 
  hasRole('admin'), 
  async (req, res) => {
    try {
        console.log("--- STARTING EMERGENCY BROADCAST ---");
        const { recipientMode, studentIds, message } = req.body;
        const currentUserId = req.user.user_id;
        const teacherName = `${req.user.first_name} ${req.user.last_name}`;

        console.log("0. Payload received:", { recipientMode, studentIdsLength: studentIds?.length, message });

        if (!message || message.trim() === '') {
            return res.status(400).json({ success: false, error: "Message content is required." });
        }

        if (!studentIds || studentIds.length === 0) {
            return res.status(400).json({ success: false, error: "No students selected for broadcast." });
        }

        // 1. Fetch targeted students
        const targetStudents = await Student.find({ student_id: { $in: studentIds } });
        console.log(`1. Found ${targetStudents.length} matching students in DB.`);

        // 2. Extract unique Parent/Guardian user IDs
        const parentIds = new Set();
        targetStudents.forEach(student => {
            if (student.user_details && Array.isArray(student.user_details)) {
                student.user_details.forEach(id => parentIds.add(Number(id)));
            } else if (student.user_id && Array.isArray(student.user_id)) {
                student.user_id.forEach(id => parentIds.add(Number(id)));
            }
        });
        
        console.log("2. Extracted Parent IDs:", Array.from(parentIds));

        if (parentIds.size === 0) {
            console.log("FAIL: No parent IDs found.");
            return res.status(404).json({ success: false, error: "No linked guardian accounts found for the selected students." });
        }

        // 3. Fetch Parent documents & their active phone numbers
        const parents = await User.find({ 
            user_id: { $in: Array.from(parentIds) },
            is_archive: false 
        });

        const rawPhoneNumbers = parents
            .map(p => p.phone_number)
            .filter(phone => phone && phone.trim() !== ''); 
        
        const uniquePhoneNumbers = [...new Set(rawPhoneNumbers)];
        console.log(`3. Found ${uniquePhoneNumbers.length} unique phone numbers:`, uniquePhoneNumbers);

        if (uniquePhoneNumbers.length === 0) {
            console.log("FAIL: No valid phone numbers.");
            return res.status(400).json({ success: false, error: "Found parents, but none have valid phone numbers on file." });
        }

        // 4. Transform array to comma-separated string for IprogSMS
        const phoneNumbersString = uniquePhoneNumbers.join(',');

        // 5. Dispatch SMS via IprogSMS
        console.log("4. Firing SMS Provider Utility...");
        await sendIprogBulkSMS(phoneNumbersString, message);
        console.log("5. SMS Utility completed successfully.");

        // ---> NEW: 5.5 Dispatch Emergency Emails
        console.log("5.5 Firing Email Provider Utility...");
        const emailPromises = parents.map(async (parent) => {
            if (parent.email) {
                // Trigger the email!
                await sendEmergencyEmailAlert(parent.email, parent.first_name, message);
            }
        });
        await Promise.all(emailPromises);
        console.log("5.6 Emails sent successfully.");

        // 6. Create In-App Notifications
        console.log("6. Attempting to create Notifications...");
        const io = req.app.get('socketio');
        
        const notificationPromises = parents.map(async (parent) => {
            const notif = new Notification({
                recipient_id: parent.user_id,
                sender_id: currentUserId,
                type: 'Emergency',
                title: '⚠️ EMERGENCY ALERT',
                message: message,
                is_read: false
            });
            const savedNotif = await notif.save();
            if (io) io.emit('new_notification', savedNotif); 
        });
        
        await Promise.all(notificationPromises);
        console.log("7. Notifications created successfully.");

        // 7. Audit Log
        console.log("8. Attempting to create Audit Log...");
        const auditLog = new Audit({
            user_id: currentUserId,
            full_name: teacherName,
            role: req.user.role,
            action: "Emergency Broadcast Sent",
            target: `Sent SMS/Email to ${uniquePhoneNumbers.length} recipients. Mode: ${recipientMode}`
        });
        await auditLog.save();
        console.log("9. Audit Log created. FINISHED!");

        return res.status(200).json({ 
            success: true, 
            message: `Emergency broadcast successfully sent via SMS and Email to ${uniquePhoneNumbers.length} parent(s).` 
        });

    } catch (error) {
        console.error("🚨 EMERGENCY BROADCAST CRASHED AT:", error.message);
        console.error(error); // Full stack trace
        return res.status(500).json({ success: false, error: "Failed to dispatch emergency broadcast. Please try again." });
    }
});

export default router;