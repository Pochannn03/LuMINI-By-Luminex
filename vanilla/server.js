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

// 2. REGISTER PARENT (UPDATED)
app.post(
  "/register-parent",
  upload.single("profile-upload"),
  async (req, res) => {
    try {
      console.log("📥 New Parent Registration:", req.body.username);

      // 1. Save the Parent
      const parentData = {
        ...req.body,
        profilePhoto: req.file ? "/uploads/" + req.file.filename : null,
      };
      const newParent = new Parent(parentData);
      await newParent.save();

      // 2. UPDATE THE STUDENT (Create the Relation)
      const studentID = req.body.linked_student_id;

      if (studentID) {
        // Create the full name from the form data
        const fullParentName = `${req.body.firstname} ${req.body.lastname}`;

        await Student.updateOne(
          { studentID: studentID },
          {
            $set: {
              // STORING REAL FULL NAME instead of username
              parentUsername: fullParentName,
            },
          }
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
        role: user.role,
        username: user.username,
        firstname: user.firstname || user.username, // Fallback if no firstname
        lastname: user.lastname || "",
        email: user.email,
        phone: user.phone,
        profilePhoto: user.profilePhoto,

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

// I. Delete Class
app.post("/delete-class", async (req, res) => {
  const { id } = req.body;
  try {
    await ClassModel.findByIdAndDelete(id);
    res.json({ success: true, message: "Class deleted successfully!" });
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

// --- START SERVER ---
app.listen(3000, () =>
  console.log("🚀 Server running at http://localhost:3000")
);
