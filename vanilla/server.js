const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer"); // 1. Import Multer
const path = require("path");
const app = express();

function getTodayPH() {
  const now = new Date();
  // Add 8 hours to UTC time
  const phTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return phTime.toISOString().split("T")[0]; // Returns "2025-12-15" correctly
}

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
  // --- NEW: ADD THESE LINES ---
  houseUnit: { type: String },
  street: { type: String },
  barangay: { type: String },
  city: { type: String },
  zipcode: { type: String },
  // ----------------------------
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
  birthdate: String,
  gradeLevel: String,
  section: String,
  parentInviteCode: String,
  parentUsername: String,
  profilePhoto: String,
  allergies: { type: String, default: "" },
  medicalHistory: { type: String, default: "" },
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
  gradeLevel: { type: String, required: true },
  section: { type: String, required: true },
  description: String,
  teacherUsername: String, // We link by username for simplicity in display
  teacherId: String, // We keep ID for robust linking
  students: [String], // Array of Student IDs (for future use)
  currentMode: { type: String, default: "dropoff" },
});
const ClassModel = mongoose.model("Class", ClassSchema);

// --- NEW: CLASS ATTENDANCE SCHEMA (The "Daily Folder") ---
const ClassAttendanceSchema = new mongoose.Schema({
  classID: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
  teacherId: String,
  className: String, // e.g. "Kindergarten - Sampaguita"
  date: String, // "2025-12-14" (The unique ID for this folder)

  // The "Contents" of the folder:
  records: [
    {
      studentID: String,
      studentName: String,
      status: { type: String, default: "absent" },
      arrivalTime: { type: String, default: "" },
      dismissalTime: { type: String, default: "" },
      authorizedPickupPerson: { type: String, default: "" },
    },
  ],
});

// --- NEW: QUEUE SCHEMA (Daily Status for Drop-off/Pickup) ---
const QueueSchema = new mongoose.Schema({
  studentID: String,
  studentName: String,
  parentName: String,
  classID: String, // To help Teacher find their own students
  date: String, // "2025-12-14"
  mode: String, // "dropoff" or "pickup"
  status: String, // "otw" (On the Way), "late" (Running Late), "here" (At School), "completed"
  time: String, // "8:15 AM"
  profilePhoto: String,
});

// Ensure one status per student per mode per day
QueueSchema.index({ studentID: 1, date: 1, mode: 1 }, { unique: true });

const QueueModel = mongoose.model("Queue", QueueSchema);

// This ensures we never have two folders for the same class on the same day
ClassAttendanceSchema.index({ classID: 1, date: 1 }, { unique: true });

const ClassAttendance = mongoose.model(
  "ClassAttendance",
  ClassAttendanceSchema
);

// --- NEW: NOTIFICATION SCHEMA ---
const NotificationSchema = new mongoose.Schema({
  recipientRole: { type: String, required: true }, // e.g. "admin"
  message: { type: String, required: true }, // e.g. "New Teacher Registered"
  type: { type: String, default: "info" }, // "info", "warning", "success"
  relatedId: String, // ID of the teacher/student involved
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
const Notification = mongoose.model("Notification", NotificationSchema);

// --- HELPER: ENSURE ATTENDANCE SHEET EXISTS (Race-Condition Proof) ---
async function getOrInitAttendanceSheet(classId, teacherId, dateString) {
  try {
    // 1. Try to find existing sheet
    let sheet = await ClassAttendance.findOne({
      classID: classId,
      date: dateString,
    });

    // If found, simply return it (No creation needed)
    if (sheet) return sheet;

    // 2. If not found, PREPARE to create it
    console.log(
      `📂 Creating new Attendance Sheet for Class ${classId} on ${dateString}`
    );

    // Fetch the Class details to get the student list
    const classData = await ClassModel.findById(classId);
    if (!classData) throw new Error("Class not found");

    // Fetch actual student names to populate the sheet nicely
    const students = await Student.find({
      studentID: { $in: classData.students },
    });

    // Build the initial empty records
    const initialRecords = students.map((s) => ({
      studentID: s.studentID,
      studentName: `${s.firstname} ${s.lastname}`,
      status: "absent", // Default state
      arrivalTime: "",
    }));

    // 3. ATTEMPT TO SAVE (Atomic Creation)
    const newSheet = new ClassAttendance({
      classID: classId,
      teacherId: teacherId,
      className: `${classData.gradeLevel} - ${classData.section}`,
      date: dateString,
      records: initialRecords,
    });

    sheet = await newSheet.save();
    return sheet;
  } catch (error) {
    // 4. THE PERMANENT FIX: Catch the "Duplicate" Error
    // If Auto-Save and Manual-Save race, and one just created the file
    // milliseconds ago, MongoDB throws error code 11000.
    if (error.code === 11000) {
      console.log(
        "⚠️ Race condition handled: Using the sheet that was just created."
      );
      // Instead of crashing, we just fetch the sheet that "won" the race
      return await ClassAttendance.findOne({
        classID: classId,
        date: dateString,
      });
    }
    // If it's some other crash, throw it normally
    throw error;
  }
}

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

      // --- NEW: CREATE NOTIFICATION FOR ADMIN ---
      const notif = new Notification({
        recipientRole: "admin",
        message: `New Teacher Registration: ${req.body.firstname} ${req.body.lastname} (@${req.body.username})`,
        type: "info",
        relatedId: newTeacher._id,
      });
      await notif.save();
      console.log("🔔 Notification created for Admin");
      // ------------------------------------------

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

// 4. VERIFY INVITE CODE (Updated with "Already Used" Check)
app.post("/verify-invite-code", async (req, res) => {
  const { code } = req.body;
  try {
    const student = await Student.findOne({ parentInviteCode: code });

    if (student) {
      // --- CONSTRAINT: CHECK IF ALREADY LINKED ---
      // We check if the parentUsername is anything other than "Unlinked" or null
      if (student.parentUsername && student.parentUsername !== "Unlinked") {
        return res.json({
          success: false,
          message:
            "This invitation code has already been used by another parent.",
        });
      }

      res.json({
        success: true,
        childName: `${student.firstname} ${student.lastname}`,
        studentID: student.studentID,
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

// 5. GET MY CHILDREN (Enhanced with Class Mode AND Teacher Info)
app.post("/get-my-children", async (req, res) => {
  const { parentName } = req.body;

  try {
    const children = await Student.find({ parentUsername: parentName });

    const childrenWithData = await Promise.all(
      children.map(async (child) => {
        // 1. Find the class this child belongs to
        const childClass = await ClassModel.findOne({
          students: child.studentID,
        });

        // 2. Default Values
        let currentMode = "dropoff";
        let teacherInfo = {
          name: "Unassigned",
          email: "N/A",
          phone: "N/A",
        };

        // 3. If Class Exists, Fetch Teacher Details
        if (childClass) {
          currentMode = childClass.currentMode;

          if (childClass.teacherId) {
            const teacher = await Teacher.findById(childClass.teacherId);
            if (teacher) {
              teacherInfo = {
                name: `${teacher.firstname} ${teacher.lastname}`,
                email: teacher.email || "N/A",
                phone: teacher.phone || "N/A",
              };
            }
          }
        }

        // 4. Return merged object
        const childObj = child.toObject();
        childObj.classMode = currentMode;
        childObj.teacherInfo = teacherInfo; // <--- Attach Teacher Data
        return childObj;
      })
    );

    res.json({ success: true, children: childrenWithData });
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

// B. UPDATE REGISTER STUDENT ROUTE (To save birthdate)
app.post(
  "/register-student",
  upload.single("profile-upload"),
  async (req, res) => {
    try {
      const studentData = {
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        studentID: req.body.studentID,
        birthdate: req.body.birthdate, // <--- SAVE THIS
        parentInviteCode: req.body.parentInviteCode,
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

// C. NEW ROUTE: UPDATE STUDENT
app.post(
  "/update-student",
  upload.single("profile-upload"),
  async (req, res) => {
    try {
      const { id, firstname, lastname, birthdate } = req.body;

      const updateData = {
        firstname,
        lastname,
        birthdate,
      };

      if (req.file) {
        updateData.profilePhoto = "/uploads/" + req.file.filename;
      }

      await Student.findByIdAndUpdate(id, updateData);

      res.json({ success: true, message: "Student Updated!" });
    } catch (error) {
      console.error("Update Student Error:", error);
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

// K. GET CLASS FOR TEACHER (Updated to return currentMode)
app.post("/get-teacher-class", async (req, res) => {
  const { teacherId } = req.body;

  try {
    const targetClass = await ClassModel.findOne({ teacherId: teacherId });

    if (!targetClass) {
      return res.json({
        success: false,
        message: "No class assigned to this teacher.",
      });
    }

    const studentIds = targetClass.students || [];

    // Fetch students (even if empty list, we need the class info)
    const students = await Student.find({ studentID: { $in: studentIds } });

    res.json({
      success: true,
      className: `${targetClass.gradeLevel} - ${targetClass.section}`,
      students: students,
      currentMode: targetClass.currentMode || "dropoff", // <--- ADD THIS LINE
    });
  } catch (error) {
    console.error("Get Teacher Class Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// L. BULK SAVE ATTENDANCE (Fixed: Uses ClassAttendance)
app.post("/save-attendance", async (req, res) => {
  const { attendanceData } = req.body;

  if (!attendanceData || attendanceData.length === 0) {
    return res.json({ success: true, message: "Nothing to save." });
  }

  try {
    const sample = attendanceData[0];
    const teacherClass = await ClassModel.findOne({
      teacherId: sample.teacherId,
    });

    // Ensure the folder exists
    await getOrInitAttendanceSheet(
      teacherClass._id,
      sample.teacherId,
      sample.date
    );

    // Update each student inside the folder
    for (const record of attendanceData) {
      await ClassAttendance.updateOne(
        {
          classID: teacherClass._id,
          date: record.date,
          "records.studentID": record.studentID,
        },
        {
          $set: {
            "records.$.status": record.status,
            "records.$.arrivalTime": record.arrivalTime,
          },
        }
      );
    }

    res.json({ success: true, message: "Attendance Folder Updated!" });
  } catch (error) {
    console.error("Bulk Save Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// M. GET STUDENT STATUS FOR TODAY (Smart Priority Logic)
app.post("/get-student-today-status", async (req, res) => {
  const { studentID } = req.body;
  const today = getTodayPH(); // Uses PH Time

  try {
    // 1. GET QUEUE DATA
    const queueEntry = await QueueModel.findOne({
      studentID: studentID,
      date: today,
      // We don't filter by mode here, we want to see ANY activity
    }).sort({ _id: -1 }); // Get latest

    // 2. GET ATTENDANCE DATA
    const studentClass = await ClassModel.findOne({ students: studentID });
    let attendanceStatus = "no_record";

    if (studentClass) {
      const sheet = await ClassAttendance.findOne({
        classID: studentClass._id,
        date: today,
      });
      if (sheet) {
        const record = sheet.records.find((r) => r.studentID === studentID);
        if (record) attendanceStatus = record.status;
      }
    }

    // 3. DETERMINE THE "TRUTH" TO SEND TO PARENT

    // SCENARIO A: AFTERNOON PICKUP COMPLETE
    // If the Queue explicitly says "Dismissal" and "Completed", that is the priority event.
    if (
      queueEntry &&
      queueEntry.mode === "dismissal" &&
      queueEntry.status === "completed"
    ) {
      return res.json({ success: true, status: "completed" });
    }

    // SCENARIO B: SAFE IN CLASS (Morning or Mid-day)
    // If they are Present or Late, they are safe.
    // (Note: Even if Morning Queue is 'completed', we prefer returning 'present' here
    // so the progress bar works correctly).
    if (attendanceStatus === "present" || attendanceStatus === "late") {
      return res.json({ success: true, status: attendanceStatus });
    }

    // SCENARIO C: STILL IN QUEUE (On the way / At School waiting)
    if (queueEntry && queueEntry.status !== "completed") {
      return res.json({ success: true, status: queueEntry.status });
    }

    // DEFAULT
    res.json({ success: true, status: "no_record" });
  } catch (error) {
    console.error("Status Check Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// N. QUICK MARK ATTENDANCE (QR SCAN WITH QUEUE CHECK - ROBUST)
app.post("/mark-attendance-qr", async (req, res) => {
  const { studentID, teacherId } = req.body;

  const today = getTodayPH(); // Uses PH Time
  const now = new Date();
  const timeString =
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0");

  try {
    const teacherClass = await ClassModel.findOne({ teacherId });
    if (!teacherClass)
      return res.json({ success: false, message: "No class assigned." });
    if (!teacherClass.students.includes(studentID))
      return res.json({ success: false, message: "Student not in class." });

    // --- GATEKEEPER CHECK ---
    const queueEntry = await QueueModel.findOne({
      studentID: studentID,
      date: today,
      mode: "dropoff",
      status: { $ne: "completed" },
    });

    if (!queueEntry) {
      return res.json({
        success: false,
        message: "⚠️ RESTRICTED: Parent has not updated their status yet.",
      });
    }

    // 1. Ensure sheet exists
    await getOrInitAttendanceSheet(teacherClass._id, teacherId, today);

    // 2. CHECK IF RECORD EXISTS
    // We check if this specific student is already in the 'records' array
    const sheet = await ClassAttendance.findOne({
      classID: teacherClass._id,
      date: today,
      "records.studentID": studentID,
    });

    if (sheet) {
      // A. RECORD EXISTS: Update it
      await ClassAttendance.updateOne(
        {
          classID: teacherClass._id,
          date: today,
          "records.studentID": studentID,
        },
        {
          $set: {
            "records.$.status": "present",
            "records.$.arrivalTime": timeString,
          },
        }
      );
    } else {
      // B. RECORD MISSING (Ghost Student): Push new record!
      const student = await Student.findOne({ studentID });
      await ClassAttendance.updateOne(
        { classID: teacherClass._id, date: today },
        {
          $push: {
            records: {
              studentID: studentID,
              studentName: `${student.firstname} ${student.lastname}`,
              status: "present",
              arrivalTime: timeString,
            },
          },
        }
      );
    }

    // 3. Close Queue Ticket
    await QueueModel.updateOne(
      { studentID: studentID, date: today, mode: "dropoff" },
      { $set: { status: "completed" } }
    );

    const studentData = await Student.findOne({ studentID });
    res.json({
      success: true,
      message: `✅ Success! ${studentData.firstname} marked Present.`,
    });
  } catch (error) {
    console.error("QR Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// O. GET CLASS ATTENDANCE (Loads the "Folder")
app.post("/get-class-attendance", async (req, res) => {
  const { teacherId, date } = req.body;
  const targetDate = date || new Date().toISOString().split("T")[0];

  try {
    // 1. Find the teacher's class ID first
    const teacherClass = await ClassModel.findOne({ teacherId });
    if (!teacherClass) return res.json({ success: false, data: [] });

    // 2. Get or Create the sheet for this date
    // This effectively "Creates the folder" just by viewing the page!
    const sheet = await getOrInitAttendanceSheet(
      teacherClass._id,
      teacherId,
      targetDate
    );

    res.json({ success: true, data: sheet.records });
  } catch (error) {
    console.error("Fetch Attendance Error:", error);
    res.status(500).json({ success: false });
  }
});

// P. SAVE SINGLE STUDENT (Auto-Save)
app.post("/save-single-attendance", async (req, res) => {
  const { studentID, status, arrivalTime, teacherId, date } = req.body;

  // Use the provided date, OR fallback to PH time (not UTC)
  const targetDate = date || getTodayPH();

  try {
    const teacherClass = await ClassModel.findOne({ teacherId });
    if (!teacherClass) return res.json({ success: false });

    // 1. Ensure sheet exists
    await getOrInitAttendanceSheet(teacherClass._id, teacherId, targetDate);

    // 2. Update the specific student INSIDE the array
    await ClassAttendance.updateOne(
      {
        classID: teacherClass._id,
        date: targetDate,
        "records.studentID": studentID,
      },
      {
        $set: {
          "records.$.status": status,
          "records.$.arrivalTime": arrivalTime,
        },
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Auto-Save Error:", error);
    res.status(500).json({ success: false });
  }
});

// L. BULK SAVE ATTENDANCE
app.post("/save-attendance", async (req, res) => {
  const { attendanceData } = req.body; // Array of { studentID, status, arrivalTime, date, teacherId }

  if (!attendanceData || attendanceData.length === 0) {
    return res.json({ success: true, message: "Nothing to save." });
  }

  try {
    // We assume all data belongs to the same class/date context for simplicity
    const sample = attendanceData[0];
    const teacherClass = await ClassModel.findOne({
      teacherId: sample.teacherId,
    });

    // 1. Ensure sheet exists
    await getOrInitAttendanceSheet(
      teacherClass._id,
      sample.teacherId,
      sample.date
    );

    // 2. Perform Bulk Updates (Looping is fine for small class sizes)
    for (const record of attendanceData) {
      await ClassAttendance.updateOne(
        {
          classID: teacherClass._id,
          date: record.date,
          "records.studentID": record.studentID,
        },
        {
          $set: {
            "records.$.status": record.status,
            "records.$.arrivalTime": record.arrivalTime,
          },
        }
      );
    }

    res.json({ success: true, message: "Attendance Folder Updated!" });
  } catch (error) {
    console.error("Bulk Save Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// N. QR SCAN ATTENDANCE
app.post("/mark-attendance-qr", async (req, res) => {
  const { studentID, teacherId } = req.body;
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const timeString =
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0");

  try {
    const teacherClass = await ClassModel.findOne({ teacherId });
    if (!teacherClass)
      return res.json({ success: false, message: "No class found." });

    // 1. Check if student belongs to class
    if (!teacherClass.students.includes(studentID)) {
      return res.json({
        success: false,
        message: "Student not in your class.",
      });
    }

    // 2. Ensure sheet exists
    await getOrInitAttendanceSheet(teacherClass._id, teacherId, today);

    // 3. Update Status
    const updateResult = await ClassAttendance.updateOne(
      {
        classID: teacherClass._id,
        date: today,
        "records.studentID": studentID,
      },
      {
        $set: {
          "records.$.status": "present",
          "records.$.arrivalTime": timeString,
        },
      }
    );

    // Get student name for the message
    const student = await Student.findOne({ studentID });

    res.json({
      success: true,
      message: `✅ ${student ? student.firstname : "Student"} marked Present!`,
    });
  } catch (error) {
    console.error("QR Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Q. UPDATE STUDENT HEALTH (For Parents)
app.post("/update-student-health", async (req, res) => {
  const { studentID, allergies, medicalHistory } = req.body;

  try {
    // Update only the health fields
    await Student.updateOne(
      { studentID: studentID },
      {
        $set: {
          allergies: allergies,
          medicalHistory: medicalHistory,
        },
      }
    );

    res.json({ success: true, message: "Health details updated!" });
  } catch (error) {
    console.error("Health Update Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// R. UPDATE PARENT STATUS
app.post("/update-queue-status", async (req, res) => {
  const { studentID, mode, status } = req.body;

  const today = getTodayPH(); // <--- FIXED

  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  try {
    const student = await Student.findOne({ studentID });
    if (!student)
      return res.json({ success: false, message: "Student not found" });

    const studentClass = await ClassModel.findOne({ students: studentID });
    const classID = studentClass ? studentClass._id : "Unassigned";
    const photoToSave = req.body.parentPhoto || student.profilePhoto;

    await QueueModel.findOneAndUpdate(
      { studentID: studentID, date: today, mode: mode },
      {
        $set: {
          studentName: `${student.firstname} ${student.lastname}`,
          parentName: student.parentUsername || "Guardian",
          classID: classID,
          status: status,
          time: timeString,
          profilePhoto: photoToSave,
        },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: "Status Updated!" });
  } catch (error) {
    console.error("Queue Update Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// S. GET CLASS QUEUE
app.post("/get-class-queue", async (req, res) => {
  const { teacherId } = req.body;

  const today = getTodayPH(); // <--- FIXED

  try {
    const teacherClass = await ClassModel.findOne({ teacherId });
    if (!teacherClass)
      return res.json({ success: true, queue: [], currentMode: "dropoff" });

    const currentMode = teacherClass.currentMode || "dropoff";

    if (currentMode === "class") {
      return res.json({ success: true, queue: [], currentMode: "class" });
    }

    const queue = await QueueModel.find({
      classID: teacherClass._id,
      date: today,
      mode: currentMode,
      status: { $ne: "completed" },
    });

    res.json({ success: true, queue: queue, currentMode: currentMode });
  } catch (error) {
    console.error("Fetch Queue Error:", error);
    res.status(500).json({ success: false });
  }
});

app.post("/set-class-mode", async (req, res) => {
  const { teacherId, mode } = req.body;
  try {
    // Update the class assigned to this teacher
    await ClassModel.findOneAndUpdate(
      { teacherId: teacherId },
      { $set: { currentMode: mode } }
    );
    res.json({ success: true, message: `Mode updated to ${mode}` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// T. VERIFY GUARDIAN PICKUP QR (STEP 1: FETCH DETAILS)
app.post("/verify-pickup-qr", async (req, res) => {
  const { qrString, teacherId } = req.body;

  // 1. VALIDATE FORMAT
  const parts = qrString.split("-PARENT-");
  if (parts.length !== 2) {
    return res.json({ success: false, message: "❌ Invalid QR Format" });
  }

  const studentID = parts[0];
  const rest = parts[1].split("-");
  const parentName = rest[0]; // Simple string from QR (or fetch real parent doc if preferred)

  try {
    // 2. GET REAL DATA FROM DB
    const student = await Student.findOne({ studentID });
    if (!student)
      return res.json({ success: false, message: "Student not found" });

    // Find the Parent object to get their real photo (Optional, but better security)
    // We can try to match by username or just use the photo they uploaded to the Queue
    // For now, let's grab the Queue entry which has the most recent photo/status
    const today = getTodayPH();
    const queueEntry = await QueueModel.findOne({
      studentID: studentID,
      date: today,
      mode: "dismissal",
    });

    // Return the data for the Teacher to review
    res.json({
      success: true,
      student: {
        name: `${student.firstname} ${student.lastname}`,
        photo: student.profilePhoto,
        id: student.studentID,
      },
      parent: {
        name: queueEntry ? queueEntry.parentName : parentName,
        photo: queueEntry ? queueEntry.profilePhoto : null, // This is the photo they uploaded/have
      },
    });
  } catch (error) {
    console.error("Verify Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// U. AUTHORIZE PICKUP (STEP 2: COMMIT & RECORD)
app.post("/authorize-pickup", async (req, res) => {
  const { studentID } = req.body;
  const today = getTodayPH(); // Use the global helper for PH time

  // Generate a pretty time string (e.g. "3:45 PM")
  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  try {
    // 1. FETCH QUEUE DETAILS (To get the Guardian Name)
    // We need to know WHO is picking them up before we close the ticket
    const queueEntry = await QueueModel.findOne({
      studentID: studentID,
      date: today,
      mode: "dismissal",
    });

    // Fallback if something weird happens and queue is missing
    const guardianName = queueEntry
      ? queueEntry.parentName
      : "Unknown Guardian";

    // 2. MARK QUEUE AS COMPLETED
    await QueueModel.updateOne(
      { studentID: studentID, date: today, mode: "dismissal" },
      { $set: { status: "completed" } }
    );

    // 3. UPDATE ATTENDANCE SHEET (The new logic)
    // We search for a sheet dated "today" that contains this studentID
    const attendanceUpdate = await ClassAttendance.updateOne(
      {
        date: today,
        "records.studentID": studentID,
      },
      {
        $set: {
          "records.$.dismissalTime": timeString,
          "records.$.authorizedPickupPerson": guardianName,
        },
      }
    );

    console.log(
      `✅ Recorded dismissal for ${studentID}: picked up by ${guardianName} at ${timeString}`
    );

    res.json({ success: true, message: "Pickup Confirmed & Recorded" });
  } catch (error) {
    console.error("Auth Pickup Error:", error);
    res.status(500).json({ success: false, message: "Authorization Failed" });
  }
});

// V. GET PICKUP HISTORY (For Parent Modal)
app.post("/get-student-history", async (req, res) => {
  const { parentName, date } = req.body;

  try {
    // 1. Find the child linked to this parent (Defaults to first child found)
    const student = await Student.findOne({ parentUsername: parentName });
    if (!student) {
      return res.json({ success: false, message: "No linked student found." });
    }

    // 2. Find the class this student belongs to
    // (Attendance sheets are stored by Class ID)
    const studentClass = await ClassModel.findOne({
      students: student.studentID,
    });

    // If not in a class, they can't have attendance records
    if (!studentClass) {
      return res.json({ success: true, record: null });
    }

    // 3. Find the Attendance Sheet for that specific Date
    const sheet = await ClassAttendance.findOne({
      classID: studentClass._id,
      date: date,
    });

    if (!sheet) {
      // No sheet exists for this date (e.g. Sunday or Holiday)
      return res.json({ success: true, record: null });
    }

    // 4. Extract the specific record for this student
    const record = sheet.records.find((r) => r.studentID === student.studentID);

    res.json({ success: true, record: record || null });
  } catch (error) {
    console.error("History Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// W. GET FULL STUDENT DETAILS (Teacher View)
app.post("/get-student-details-full", async (req, res) => {
  const { studentID } = req.body;
  try {
    const student = await Student.findOne({ studentID });
    if (!student)
      return res.json({ success: false, message: "Student not found" });

    // Find Parent: Match "First Last" to student.parentUsername
    // We use a Mongo expression to concat fields for the search
    const parent = await Parent.findOne({
      $expr: {
        $eq: [
          { $concat: ["$firstname", " ", "$lastname"] },
          student.parentUsername,
        ],
      },
    });

    res.json({ success: true, student, parent });
  } catch (error) {
    console.error("Detail Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// X. GET HISTORY BY ID (Teacher Version)
app.post("/get-student-history-by-id", async (req, res) => {
  const { studentID, date } = req.body;
  try {
    // 1. Find Class
    const studentClass = await ClassModel.findOne({ students: studentID });
    if (!studentClass) return res.json({ success: true, record: null });

    // 2. Find Sheet
    const sheet = await ClassAttendance.findOne({
      classID: studentClass._id,
      date: date,
    });

    if (!sheet) return res.json({ success: true, record: null });

    // 3. Find Record
    const record = sheet.records.find((r) => r.studentID === studentID);
    res.json({ success: true, record: record || null });
  } catch (error) {
    console.error("Teacher History Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Y. GET TEACHER STATISTICS (Profile Page)
app.post("/get-teacher-stats", async (req, res) => {
  const { teacherId } = req.body;

  try {
    // 1. Find ALL classes assigned to this teacher
    const classes = await ClassModel.find({ teacherId: teacherId });

    if (!classes || classes.length === 0) {
      return res.json({
        success: true,
        totalStudents: 0,
        totalSections: 0,
        sectionNames: "No Active Classes",
      });
    }

    // 2. Calculate Stats
    const totalSections = classes.length;

    // Join section names with commas (e.g. "Sampaguita, Rosas")
    const sectionNames = classes.map((c) => c.section).join(", ");

    // Count total unique students across all classes
    let totalStudents = 0;
    classes.forEach((c) => {
      if (c.students && Array.isArray(c.students)) {
        totalStudents += c.students.length;
      }
    });

    res.json({
      success: true,
      totalStudents,
      totalSections,
      sectionNames,
    });
  } catch (error) {
    console.error("Teacher Stats Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Z. GET ADMIN DASHBOARD STATS
app.get("/get-admin-stats", async (req, res) => {
  try {
    // 1. Count all students
    const studentCount = await Student.countDocuments({});

    // 2. Count ONLY approved teachers
    const teacherCount = await Teacher.countDocuments({ isApproved: true });

    // 3. Count all registered parents
    const parentCount = await Parent.countDocuments({});

    res.json({
      success: true,
      students: studentCount,
      teachers: teacherCount,
      parents: parentCount,
    });
  } catch (error) {
    console.error("Admin Stats Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// NEW ROUTE: DELETE STUDENT
app.post("/delete-student", async (req, res) => {
  const { id } = req.body; // This is the MongoDB _id
  try {
    // 1. Find the student to get their studentID string (e.g., "2025-001")
    const student = await Student.findById(id);
    if (!student) {
      return res.json({ success: false, message: "Student not found" });
    }

    // 2. Remove this studentID from any Class that contains it
    await ClassModel.updateMany(
      { students: student.studentID },
      { $pull: { students: student.studentID } }
    );

    // 3. Delete the Student Profile
    await Student.findByIdAndDelete(id);

    res.json({ success: true, message: "Student deleted successfully!" });
  } catch (error) {
    console.error("Delete Student Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// --- NEW: GET NOTIFICATIONS (For Admin) ---
app.get("/get-notifications", async (req, res) => {
  try {
    // Fetch unread (or all) notifications for admin, newest first
    const notifs = await Notification.find({ recipientRole: "admin" })
      .sort({ createdAt: -1 })
      .limit(20); // Limit to last 20 to keep it fast
    res.json({ success: true, notifications: notifs });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching notifications" });
  }
});

// --- NEW: DELETE/CLEAR NOTIFICATIONS ---
app.post("/clear-notifications", async (req, res) => {
  try {
    // Option A: Delete them permanently
    await Notification.deleteMany({ recipientRole: "admin" });

    // Option B: Just mark as read (if you want history)
    // await Notification.updateMany({ recipientRole: "admin" }, { $set: { isRead: true } });

    res.json({ success: true, message: "Notifications cleared" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error clearing notifications" });
  }
});

// --- START SERVER ---
app.listen(3000, () =>
  console.log("🚀 Server running at http://localhost:3000")
);
