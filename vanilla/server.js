const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer"); // 1. Import Multer
const path = require("path");
const app = express();

// --- CONFIGURATION SECTION (MUST BE AT THE TOP) ---

// A. Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// B. Multer Storage Engine (The "Upload" logic)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Saves to 'uploads' folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// C. Initialize the 'upload' variable
// (This creates the variable that was missing in your error!)
const upload = multer({ storage: storage });

// D. Database Connection
mongoose
  .connect("mongodb://127.0.0.1:27017/lumini_local_db")
  .then(() => console.log("✅ Database Connected!"))
  .catch((err) => console.error("❌ Mongo Error:", err));

// --- SCHEMAS ---

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  firstname: String,
  lastname: String,
  role: { type: String, default: "admin" }, // Default role is admin
  profilePhoto: String,
});
const Admin = mongoose.model("Admin", AdminSchema);

const TeacherSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  firstname: String,
  lastname: String,
  email: String,
  phone: String,
  role: { type: String, default: "teacher" },
  profilePhoto: String,
  dateJoined: { type: Date, default: Date.now },
  isApproved: { type: Boolean, default: false },
});
const Teacher = mongoose.model("Teacher", TeacherSchema);

const StudentSchema = new mongoose.Schema({
  studentID: String,
  firstname: String,
  lastname: String,
  gradeLevel: String,
  section: String,
  parentInviteCode: String,
  parentUsername: String,
  profilePhoto: String,
});
const Student = mongoose.model("Student", StudentSchema);

const ParentSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  firstname: String,
  lastname: String,
  email: String,
  phone: String,
  relationship: String,
  childName: String,
  houseUnit: String,
  street: String,
  barangay: String,
  city: String,
  zipcode: String,
  role: { type: String, default: "parent" },
  profilePhoto: String,
  dateJoined: { type: Date, default: Date.now },
});
const Parent = mongoose.model("Parent", ParentSchema);

const ClassSchema = new mongoose.Schema({
  gradeLevel: { type: String, required: true }, // "Kindergarten" or "Grade 1"
  section: { type: String, required: true }, // e.g. "Dahlia"
  schedule: { type: String, required: true },
  maxCapacity: { type: Number, default: 30 },
  description: String,
  teacherUsername: String, // We link by username for simplicity in display
  teacherId: String, // We keep ID for robust linking
  students: [String], // Array of Student IDs (for future use)
});
const ClassModel = mongoose.model("Class", ClassSchema);

// ATTENDANCE SCHEMA
const AttendanceSchema = new mongoose.Schema({
  studentID: String,
  studentName: String, // Optional, but makes reading DB easier
  classID: String, // Helpful for reports later
  date: String, // Format: YYYY-MM-DD
  status: String, // "present", "late", "absent"
  arrivalTime: String, // "08:30" (24h format)
  recordedAt: { type: Date, default: Date.now },
});
const Attendance = mongoose.model("Attendance", AttendanceSchema);

// --- ROUTES ---

// 1. REGISTER TEACHER
// Now 'upload' is defined, so this line will work!
app.post(
  "/register-teacher",
  upload.single("profile-upload"),
  async (req, res) => {
    try {
      const teacherData = {
        ...req.body,
        profilePhoto: req.file ? "/uploads/" + req.file.filename : null,
      };
      const newTeacher = new Teacher(teacherData);
      await newTeacher.save();
      res.json({ success: true, message: "Teacher Registered!" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Error saving data" });
    }
  }
);

// 2. REGISTER PARENT (FIXED ADDRESS MAPPING)
// 2. REGISTER PARENT (FIXED ADDRESS MAPPING)
app.post(
  "/register-parent",
  upload.single("profile-upload"),
  async (req, res) => {
    try {
      console.log("📥 New Parent Registration:", req.body.username);

      // Explicitly map fields to match the Schema
      const parentData = {
        username: req.body.username,
        password: req.body.password,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        phone: req.body.phone,
        relationship: req.body.relationship,

        // ADDRESS FIX: Check both camelCase and kebab-case
        houseUnit: req.body.houseUnit || req.body["house-unit"],
        street: req.body.street,
        barangay: req.body.barangay,
        city: req.body.city,
        zipcode: req.body.zipcode || req.body["zip-code"], // Common mismatch

        role: "parent",
        profilePhoto: req.file ? "/uploads/" + req.file.filename : null,

        // Link info (We don't save this in Parent, but we use it below)
        linked_student_id: req.body.linked_student_id,
      };

      const newParent = new Parent(parentData);
      await newParent.save();

      // 2. UPDATE THE STUDENT (Create the Relation)
      const studentID = req.body.linked_student_id;

      if (studentID) {
        const fullParentName = `${req.body.firstname} ${req.body.lastname}`;
        await Student.updateOne(
          { studentID: studentID },
          { $set: { parentUsername: fullParentName } }
        );
        console.log(
          `🔗 Linked Parent "${fullParentName}" to Student ${studentID}`
        );
      }

      res.json({ success: true, message: "Parent Account Created & Linked!" });
    } catch (error) {
      console.error("❌ Parent Save Error:", error);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  }
);

// 4. VERIFY INVITE CODE (Add this new route)
app.post("/verify-invite-code", async (req, res) => {
  const { code } = req.body;
  try {
    const student = await Student.findOne({ parentInviteCode: code });
    if (student) {
      res.json({
        success: true,
        childName: `${student.firstname} ${student.lastname}`,
        studentID: student.studentID, // sending this to the frontend
      });
    } else {
      res.json({ success: false, message: "Invalid Invitation Code" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    // 1. Check Teachers
    let user = await Teacher.findOne({ username, password });

    if (user && user.role === "teacher" && user.isApproved === false) {
      return res.json({
        success: false,
        message: "Account pending approval. Please contact the administrator.",
      });
    }

    // 2. If not Teacher, Check Parents
    if (!user) user = await Parent.findOne({ username, password });

    // 3. If not Parent, Check Admins (NEW!)
    if (!user) user = await Admin.findOne({ username, password });

    if (user) {
      res.json({
        success: true,
        message: "Login Successful",

        // Common Data
        id: user._id,
        role: user.role,
        username: user.username,
        firstname: user.firstname || user.username, // Fallback if no firstname
        lastname: user.lastname || "",
        email: user.email,
        phone: user.phone,
        profilePhoto: user.profilePhoto,

        houseUnit: user.houseUnit || "",
        street: user.street || "",
        barangay: user.barangay || "",
        city: user.city || "",
        zipcode: user.zipcode || "",

        // Parent/Teacher specific fields might be undefined for Admin, which is fine
      });
    } else {
      res.json({ success: false, message: "Invalid Username or Password" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 5. GET MY CHILDREN
app.post("/get-my-children", async (req, res) => {
  const { parentName } = req.body;

  try {
    // Find students linked to this parent's full name
    const children = await Student.find({ parentUsername: parentName });

    res.json({ success: true, children: children });
  } catch (error) {
    console.error("Error fetching children:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// A. Get Pending Teachers
app.get("/get-pending-teachers", async (req, res) => {
  try {
    // Find teachers where isApproved is false (or undefined)
    const pendingTeachers = await Teacher.find({ isApproved: false });
    res.json({ success: true, teachers: pendingTeachers });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching requests" });
  }
});

// B. Approve a Teacher
app.post("/approve-teacher", async (req, res) => {
  const { username } = req.body;
  try {
    await Teacher.updateOne(
      { username: username },
      { $set: { isApproved: true } }
    );
    res.json({ success: true, message: "Teacher Approved!" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error approving teacher" });
  }
});

app.get("/get-approved-teachers", async (req, res) => {
  try {
    const teachers = await Teacher.find({ isApproved: true });
    res.json({ success: true, teachers: teachers });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching teachers" });
  }
});

// D. Update Teacher Profile
app.post("/update-teacher", async (req, res) => {
  const { id, firstname, lastname, email, phone, username, password } =
    req.body;

  try {
    // Check if the new username is taken by someone else (optional safety check)
    const existingUser = await Teacher.findOne({ username: username });
    if (existingUser && existingUser._id.toString() !== id) {
      return res.json({
        success: false,
        message: "Username is already taken.",
      });
    }

    // Update the teacher document
    await Teacher.findByIdAndUpdate(id, {
      firstname,
      lastname,
      email,
      phone,
      username,
      password, // Note: In a real production app, you should hash this again!
    });

    res.json({
      success: true,
      message: "Teacher profile updated successfully!",
    });
  } catch (error) {
    console.error("Update Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during update." });
  }
});

app.post("/delete-teacher", async (req, res) => {
  const { id } = req.body;
  try {
    await Teacher.findByIdAndDelete(id);
    res.json({ success: true, message: "Teacher deleted successfully!" });
  } catch (error) {
    console.error("Delete Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error deleting teacher." });
  }
});

// F. Create New Class (Smart Enrollment Version)
app.post("/create-class", async (req, res) => {
  try {
    const {
      gradeLevel,
      section,
      schedule,
      maxCapacity,
      description,
      teacherUsername,
      teacherId,
      students, // <--- This is the array of IDs we sent
    } = req.body;

    // 1. Check for duplicates
    const exists = await ClassModel.findOne({ gradeLevel, section });
    if (exists) {
      return res.json({
        success: false,
        message: "This class section already exists!",
      });
    }

    // 2. Create the Class
    const newClass = new ClassModel({
      gradeLevel,
      section,
      schedule,
      maxCapacity,
      description,
      teacherUsername,
      teacherId,
      students: students || [], // Save the list of IDs here
    });

    await newClass.save();

    // 3. THE MAGIC: Update the Students!
    if (students && students.length > 0) {
      // Find all students whose IDs are in our list
      // And update their grade/section to match this new class
      await Student.updateMany(
        { studentID: { $in: students } },
        {
          $set: {
            gradeLevel: gradeLevel,
            section: section,
          },
        }
      );
      console.log(
        `✅ Enrolled ${students.length} students into ${gradeLevel} - ${section}`
      );
    }

    res.json({ success: true, message: "Class created & Students enrolled!" });
  } catch (error) {
    console.error("Create Class Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// G. GET ALL CLASSES (This was missing!)
app.get("/get-classes", async (req, res) => {
  try {
    // Retrieve all classes from the database
    const classes = await ClassModel.find({});
    res.json({ success: true, classes: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching classes" });
  }
});

// H. Get Unique Sections (For the autocomplete dropdown)
app.get("/get-all-sections", async (req, res) => {
  try {
    const sections = await ClassModel.distinct("section");
    res.json({ success: true, sections: sections });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching sections" });
  }
});

// I. Delete Class (Safe Version)
app.post("/delete-class", async (req, res) => {
  const { id } = req.body;
  try {
    // 1. Find the class first (so we know who is inside it)
    const classToDelete = await ClassModel.findById(id);

    if (!classToDelete) {
      return res.json({ success: false, message: "Class not found." });
    }

    // 2. Get the list of enrolled students
    const enrolledStudents = classToDelete.students || [];

    // 3. RELEASE THE STUDENTS (Reset them to Unassigned)
    if (enrolledStudents.length > 0) {
      await Student.updateMany(
        { studentID: { $in: enrolledStudents } }, // Find all students in this class
        {
          $set: {
            gradeLevel: "Unassigned",
            section: "Unassigned",
          },
        }
      );
      console.log(
        `🔓 Released ${enrolledStudents.length} students from deleted class.`
      );
    }

    // 4. Finally, delete the class
    await ClassModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Class deleted and students released!",
    });
  } catch (error) {
    console.error("Delete Class Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error deleting class." });
  }
});

// 3. REGISTER STUDENT (NEW)
app.post(
  "/register-student",
  upload.single("profile-upload"),
  async (req, res) => {
    try {
      // Construct the student object
      const studentData = {
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        studentID: req.body.studentID,
        parentInviteCode: req.body.parentInviteCode,
        // Default values for fields we aren't setting yet
        gradeLevel: "Unassigned",
        section: "Unassigned",
        parentUsername: "Unlinked",
        profilePhoto: req.file ? "/uploads/" + req.file.filename : null,
      };

      const newStudent = new Student(studentData);
      await newStudent.save();

      res.json({ success: true, message: "Student Registered Successfully!" });
    } catch (error) {
      console.error("Student Register Error:", error);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  }
);

// 6. GET NEXT STUDENT ID (Auto-Increment Logic)
app.get("/get-next-student-id", async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `${currentYear}-`; // e.g., "2025-"

    // Find the latest student whose ID starts with "2025-"
    // Sort by studentID descending (-1) to get the highest one
    const lastStudent = await Student.findOne({
      studentID: { $regex: `^${prefix}` },
    }).sort({ studentID: -1 });

    let nextId = `${prefix}001`; // Default if no students exist yet

    if (lastStudent && lastStudent.studentID) {
      // Extract the number part (e.g., from "2025-042" take "042")
      const lastSequence = parseInt(lastStudent.studentID.split("-")[1]);

      if (!isNaN(lastSequence)) {
        const nextSequence = lastSequence + 1;
        // Pad with zeros (e.g., 43 -> "043")
        const paddedSequence = nextSequence.toString().padStart(3, "0");
        nextId = `${prefix}${paddedSequence}`;
      }
    }

    res.json({ success: true, nextId: nextId });
  } catch (error) {
    console.error("Auto-ID Error:", error);
    res.status(500).json({ success: false, message: "Error generating ID" });
  }
});

// 7. GET ALL STUDENTS (For Directory)
app.get("/get-all-students", async (req, res) => {
  try {
    // Sort by newest first (optional, but nice)
    const students = await Student.find({}).sort({ _id: -1 });
    res.json({ success: true, students: students });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching students" });
  }
});

// J. Update Class Details & Enrollment
app.post("/update-class", async (req, res) => {
  const {
    classId,
    gradeLevel,
    section,
    schedule,
    maxCapacity,
    description,
    teacherUsername,
    teacherId,
    students, // The NEW list of Student IDs
  } = req.body;

  try {
    // 1. Find the current class state (before update)
    const oldClass = await ClassModel.findById(classId);
    if (!oldClass) {
      return res.json({ success: false, message: "Class not found." });
    }

    // 2. Identify Removed Students
    // (Students who were in the old list but are NOT in the new list)
    const oldStudentIds = oldClass.students || [];
    const newStudentIds = students || [];

    const removedStudentIds = oldStudentIds.filter(
      (id) => !newStudentIds.includes(id)
    );

    // 3. Update the Class Document
    oldClass.gradeLevel = gradeLevel;
    oldClass.section = section;
    oldClass.schedule = schedule;
    oldClass.maxCapacity = maxCapacity;
    oldClass.description = description;
    oldClass.teacherUsername = teacherUsername;
    oldClass.teacherId = teacherId;
    oldClass.students = newStudentIds;

    await oldClass.save();

    // 4. Update Student Profiles

    // A. Reset Removed Students to "Unassigned"
    if (removedStudentIds.length > 0) {
      await Student.updateMany(
        { studentID: { $in: removedStudentIds } },
        {
          $set: {
            gradeLevel: "Unassigned",
            section: "Unassigned",
          },
        }
      );
    }

    // B. Update Added/Kept Students to New Class Details
    if (newStudentIds.length > 0) {
      await Student.updateMany(
        { studentID: { $in: newStudentIds } },
        {
          $set: {
            gradeLevel: gradeLevel,
            section: section,
          },
        }
      );
    }

    res.json({ success: true, message: "Class updated successfully!" });
  } catch (error) {
    console.error("Update Class Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// K. GET CLASS FOR TEACHER (Fixed Version)
app.post("/get-teacher-class", async (req, res) => {
  const { teacherId } = req.body;

  try {
    // 1. Search by teacherId
    const targetClass = await ClassModel.findOne({ teacherId: teacherId });

    if (!targetClass) {
      return res.json({
        success: false,
        message: "No class assigned to this teacher.",
      });
    }

    // 2. Define studentIds FIRST
    const studentIds = targetClass.students || [];

    // 3. Now we can check the length safely
    if (studentIds.length === 0) {
      return res.json({
        success: true,
        className: `${targetClass.gradeLevel} - ${targetClass.section}`,
        students: [],
      });
    }

    // 4. Fetch the actual Student profiles
    const students = await Student.find({ studentID: { $in: studentIds } });

    res.json({
      success: true,
      className: `${targetClass.gradeLevel} - ${targetClass.section}`,
      students: students,
    });
  } catch (error) {
    console.error("Get Teacher Class Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// L. SAVE ATTENDANCE
app.post("/save-attendance", async (req, res) => {
  const { attendanceData } = req.body; // Expecting an ARRAY of records

  try {
    // Loop through each record sent from frontend
    for (const record of attendanceData) {
      await Attendance.findOneAndUpdate(
        {
          studentID: record.studentID,
          date: record.date,
        }, // Search Criteria
        {
          $set: {
            status: record.status,
            arrivalTime: record.arrivalTime,
            studentName: record.studentName,
            classID: record.classID,
          },
        }, // Update Fields
        { upsert: true, new: true } // Options: Create if new
      );
    }

    res.json({ success: true, message: "Attendance saved successfully!" });
  } catch (error) {
    console.error("Save Attendance Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// M. GET STUDENT STATUS FOR TODAY
app.post("/get-student-today-status", async (req, res) => {
  const { studentID } = req.body;

  // Get today's date in YYYY-MM-DD (matches how we saved it)
  // Note: ensuring timezone match is key, but for localhost this works fine
  const today = new Date().toISOString().split("T")[0];

  try {
    const record = await Attendance.findOne({
      studentID: studentID,
      date: today,
    });

    if (record) {
      res.json({ success: true, status: record.status }); // "present", "late", "absent"
    } else {
      res.json({ success: true, status: "no_record" }); // Still "On Way"
    }
  } catch (error) {
    console.error("Status Check Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// N. QUICK MARK ATTENDANCE (QR SCAN)
app.post("/mark-attendance-qr", async (req, res) => {
  const { studentID, teacherId } = req.body;
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const now = new Date();
  const timeString =
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0"); // HH:MM

  try {
    // 1. Find the Teacher's Class
    const teacherClass = await ClassModel.findOne({ teacherId: teacherId });

    if (!teacherClass) {
      return res.json({
        success: false,
        message: "You don't have a class assigned yet.",
      });
    }

    // 2. Check if Student is in this Class
    // We check if the scanned ID exists in the class's student list
    if (!teacherClass.students.includes(studentID)) {
      return res.json({
        success: false,
        message: "Student not found in your class list.",
      });
    }

    // 3. Get Student Details (for the success message)
    const student = await Student.findOne({ studentID: studentID });
    if (!student) {
      return res.json({ success: false, message: "Student ID invalid." });
    }

    // 4. Mark them PRESENT
    await Attendance.findOneAndUpdate(
      {
        studentID: studentID,
        date: today,
      },
      {
        $set: {
          status: "present",
          arrivalTime: timeString,
          studentName: student.firstname + " " + student.lastname,
          classID: teacherClass._id, // Link to the class object
        },
      },
      { upsert: true, new: true } // Create if doesn't exist
    );

    res.json({
      success: true,
      message: `✅ ${student.firstname} marked Present at ${timeString}!`,
    });
  } catch (error) {
    console.error("QR Attendance Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// O. GET TODAY'S ATTENDANCE (For loading the list)
app.post("/get-class-attendance-today", async (req, res) => {
  const { teacherId } = req.body;
  const today = new Date().toISOString().split("T")[0];

  try {
    // 1. Find the teacher's class first
    const teacherClass = await ClassModel.findOne({ teacherId });
    if (!teacherClass) return res.json({ success: false, data: [] });

    // 2. Find attendance records for these students, for TODAY
    const records = await Attendance.find({
      classID: teacherClass._id, // Filter by Class
      date: today, // Filter by Today
    });

    res.json({ success: true, data: records });
  } catch (error) {
    console.error("Fetch Attendance Error:", error);
    res.status(500).json({ success: false });
  }
});

// P. SAVE SINGLE STUDENT (Auto-Save)
app.post("/save-single-attendance", async (req, res) => {
  const { studentID, status, arrivalTime, teacherId } = req.body;
  const today = new Date().toISOString().split("T")[0];

  try {
    const teacherClass = await ClassModel.findOne({ teacherId });

    // Update or Insert the record
    await Attendance.findOneAndUpdate(
      { studentID: studentID, date: today },
      {
        $set: {
          status: status,
          arrivalTime: arrivalTime,
          classID: teacherClass._id,
        },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Auto-Save Error:", error);
    res.status(500).json({ success: false });
  }
});

// --- START SERVER ---
app.listen(3000, () =>
  console.log("🚀 Server running at http://localhost:3000")
);
